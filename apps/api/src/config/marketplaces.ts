/** Destination marketplace new purchases are routed to by default. */
export const DEFAULT_DESTINATION = 'eldorado';

/** Automatic resale price doubles the purchase price; manual overrides stay available. */
export const DEFAULT_RESALE_MULTIPLIER = 2;

export const defaultResaleMinor = (purchaseMinor: number): number =>
  Math.round(purchaseMinor * DEFAULT_RESALE_MULTIPLIER);

/** Keep the recorded price of already published and sold inventory unchanged. */
export const recommendedResaleMinor = (item: {
  purchaseMinor: number;
  recommendedMinor: number;
  status: string;
}): number =>
  item.status === 'listed' || item.status === 'sold'
    ? item.recommendedMinor
    : defaultResaleMinor(item.purchaseMinor);

/** Commission the destination marketplace takes on a sale. */
export const DESTINATION_FEE_RATE = 0.1;

/** Static currency rates used for operational estimates until live rates are connected. */
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  RUB: 0.011,
};

export const convertMinor = (minor: number, from: string, to: string): number =>
  Math.round((minor * (FX_TO_USD[from] ?? 1)) / (FX_TO_USD[to] ?? 1));
