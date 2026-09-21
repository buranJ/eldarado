/** DOM id of a row's sell-price input, so row actions can focus it. */
export const priceInputId = (inventoryItemId: string): string => `sell-price-${inventoryItemId}`;

export const focusPriceInput = (inventoryItemId: string): void => {
  const input = document.getElementById(priceInputId(inventoryItemId));
  if (input instanceof HTMLInputElement) {
    input.focus();
    input.select();
  }
};
