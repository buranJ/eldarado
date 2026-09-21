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

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** Main line, already localised. */
  title: string;
  /** Entity the event refers to (account title / order id). */
  subject: string;
  meta: string | null;
  at: string;
  actor: string;
}
