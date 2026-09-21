import type { DestinationAdapter, ListingDraft, PublishResult } from '../types.js';

/**
 * Publishing without an API: the system prepares the listing, the operator
 * pastes it into the marketplace and marks it published. Deliberately does not
 * pretend to have created anything remotely.
 */
export const manualAdapter: DestinationAdapter = {
  id: 'eldorado',
  name: 'Eldorado (ручная публикация)',
  automated: false,

  async publish(_draft: ListingDraft): Promise<PublishResult> {
    return { externalId: null, publishedAt: new Date().toISOString(), manual: true };
  },

  async updatePrice(): Promise<void> {
    throw new Error(
      'Ручной режим: цену нужно изменить в объявлении на площадке — API пока не подключён',
    );
  },

  async delist(): Promise<void> {
    throw new Error(
      'Ручной режим: объявление нужно снять на площадке — API пока не подключён',
    );
  },
};
