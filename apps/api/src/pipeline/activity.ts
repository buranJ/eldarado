import { prisma } from '../lib/db.js';

export type ActivityKind =
  | 'account_approved'
  | 'account_rejected'
  | 'account_purchased'
  | 'price_changed'
  | 'listing_prepared'
  | 'listing_published'
  | 'listing_deleted'
  | 'listing_paused'
  | 'scan_finished'
  | 'sale_completed';

export interface ActivityInput {
  gameId: string;
  kind: ActivityKind;
  subject: string;
  title: string;
  meta?: string | null;
  actor?: string;
  listingId?: string | null;
  userId?: string | null;
}

/** Append-only: the feed is history, so entries are never edited or removed. */
export const logActivity = async (input: ActivityInput): Promise<void> => {
  await prisma.activityEvent.create({
    data: {
      gameId: input.gameId,
      kind: input.kind,
      subject: input.subject,
      title: input.title,
      meta: input.meta ?? null,
      actor: input.actor ?? 'оператор',
      listingId: input.listingId ?? null,
      userId: input.userId ?? null,
    },
  });
};
