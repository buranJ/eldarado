/** A listing rendered for a destination marketplace, ready to publish. */
export interface ListingDraft {
  title: string;
  description: string;
  sellMinor: number;
  currency: string;
}

export interface PublishResult {
  /** Id assigned by the marketplace, or null when publishing is manual. */
  externalId: string | null;
  publishedAt: string;
  /** True when the operator still has to finish the job by hand. */
  manual: boolean;
}

/**
 * Every destination marketplace implements this. Swapping the manual exporter
 * for a real API client is a change of one implementation, not of the pipeline.
 */
export interface DestinationAdapter {
  readonly id: string;
  readonly name: string;
  /** Whether this adapter can talk to the marketplace on its own. */
  readonly automated: boolean;
  publish(draft: ListingDraft, listingId: string): Promise<PublishResult>;
  updatePrice(externalId: string, sellMinor: number): Promise<void>;
  delist(externalId: string): Promise<void>;
}
