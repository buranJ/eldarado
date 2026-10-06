import { stat } from 'node:fs/promises';
import { prisma } from '../lib/db.js';
import { deleteSourceImages, sourceImagePath } from '../lib/source-images.js';

type Candidate = Awaited<ReturnType<typeof loadCandidates>>[number];

const loadCandidates = () => prisma.listing.findMany({
  where: {
    marketplace: 'funpay',
    inventories: { none: {} },
    decisions: { none: {} },
  },
  include: {
    seller: { select: { rating: true } },
    images: { select: { fileName: true } },
  },
});

const reasonFor = (listing: Candidate): string | null => {
  if (listing.disappearedAt) return 'исчез с FunPay';
  if (listing.images.length < 2) return 'меньше двух фото';
  if (listing.status !== 'prefiltered_out') return null;
  if (
    Array.isArray(listing.prefilterReasons) &&
    listing.prefilterReasons.some(
      (reason) => typeof reason === 'string' && reason.includes('недостоверная характеристика'),
    )
  ) return 'недостоверные характеристики';
  if (listing.seller.rating !== null && listing.seller.rating < 4) {
    return 'рейтинг продавца ниже 4★';
  }
  return null;
};

const main = async (): Promise<void> => {
  const apply = process.argv.includes('--apply');
  if (apply && (await prisma.collectionJob.count({ where: { status: { in: ['queued', 'running'] } } })) > 0) {
    throw new Error('Сбор данных выполняется или ожидает запуска; повторите очистку после него');
  }

  const candidates = (await loadCandidates()).filter((listing) => reasonFor(listing));
  const reasons = candidates.reduce<Record<string, number>>((totals, listing) => {
    const reason = reasonFor(listing)!;
    totals[reason] = (totals[reason] ?? 0) + 1;
    return totals;
  }, {});
  const fileNames = [...new Set(candidates.flatMap((listing) =>
    listing.images.map((image) => image.fileName)))];
  const bytes = (await Promise.all(fileNames.map(async (fileName) => {
    try {
      return (await stat(sourceImagePath(fileName))).size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
      throw error;
    }
  }))).reduce((total, size) => total + size, 0);

  console.log(`Режим: ${apply ? 'удаление' : 'проверка без удаления'}`);
  console.table(reasons);
  console.log(`Объявлений: ${candidates.length}; фото: ${fileNames.length}; размер фото: ${(bytes / 1048576).toFixed(1)} МиБ`);
  if (!apply || candidates.length === 0) return;

  const selectedIds = candidates.map((listing) => listing.id);
  const deleted = await prisma.$transaction(async (tx) => {
    const current = await tx.listing.findMany({
      where: {
        id: { in: selectedIds },
        marketplace: 'funpay',
        inventories: { none: {} },
        decisions: { none: {} },
      },
      include: {
        seller: { select: { rating: true } },
        images: { select: { fileName: true } },
      },
    });
    const eligible = current.filter((listing) => reasonFor(listing));
    if (eligible.length === 0) return [];
    const deletedIds = eligible.map((listing) => listing.id);
    const result = await tx.listing.deleteMany({
      where: {
        id: { in: deletedIds },
        marketplace: 'funpay',
        inventories: { none: {} },
        decisions: { none: {} },
      },
    });
    if (result.count !== eligible.length) {
      throw new Error('Состав кандидатов изменился во время очистки; транзакция отменена');
    }
    return eligible;
  });

  const deletedFileNames = [...new Set(deleted.flatMap((listing) =>
    listing.images.map((image) => image.fileName)))];
  const sharedFiles = await prisma.listingImage.findMany({
    where: { fileName: { in: deletedFileNames } },
    select: { fileName: true },
  });
  const shared = new Set(sharedFiles.map((image) => image.fileName));
  const unsharedFiles = deletedFileNames.filter((fileName) => !shared.has(fileName));
  for (let index = 0; index < unsharedFiles.length; index += 25) {
    await deleteSourceImages(unsharedFiles.slice(index, index + 25));
  }
  console.log(`Удалено объявлений: ${deleted.length}; файлов фото: ${unsharedFiles.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
