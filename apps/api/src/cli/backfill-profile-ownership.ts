import { prisma } from '../lib/db.js';

const main = async (): Promise<void> => {
  const owner = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!owner) return;

  await prisma.inventoryItem.updateMany({
    where: { userId: null },
    data: { userId: owner.id },
  });

  const inventory = await prisma.inventoryItem.findMany({
    where: { userId: { not: null } },
    select: { listingId: true, userId: true },
  });
  if (inventory.length > 0) {
    await prisma.userListingDecision.createMany({
      data: inventory.flatMap((item) =>
        item.userId
          ? [{ userId: item.userId, listingId: item.listingId, status: 'purchased' }]
          : [],
      ),
      skipDuplicates: true,
    });
  }

  const rejected = await prisma.listing.findMany({
    where: { status: 'rejected' },
    select: { id: true },
  });
  if (rejected.length > 0) {
    await prisma.userListingDecision.createMany({
      data: rejected.map((listing) => ({
        userId: owner.id,
        listingId: listing.id,
        status: 'rejected',
      })),
      skipDuplicates: true,
    });
  }

  await prisma.activityEvent.updateMany({
    where: { userId: null, kind: { not: 'scan_finished' } },
    data: { userId: owner.id },
  });

  await prisma.listing.updateMany({
    where: {
      status: { in: ['approved', 'rejected', 'purchased'] },
      analysis: { isNot: null },
    },
    data: { status: 'analyzed' },
  });
  await prisma.listing.updateMany({
    where: { status: { in: ['approved', 'rejected', 'purchased'] } },
    data: { status: 'ready_for_analysis' },
  });
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
