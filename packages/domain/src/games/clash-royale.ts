/** Clash Royale specific account attributes. `null` means "нет данных". */
export interface ClashRoyaleGameData {
  kind: 'clash-royale';
  kingTowerLevel: number | null;
  collectionLevel: number | null;
  arena: number | null;
  arenaName: string | null;
  trophies: number | null;
  highestTrophies: number | null;
  totalCards: number | null;
  unlockedCards: number | null;
  level16Cards: number | null;
  level15Cards: number | null;
  level14Cards: number | null;
  evolutions: number | null;
  heroes: number | null;
  /** Legendary cards — exposed by FunPay as a filterable attribute. */
  legendaryCards: number | null;
  /**
   * FunPay's "уровень" attribute (values run into the thousands, so this is not
   * the King Tower level). Carried through verbatim until its meaning is fixed.
   */
  accountLevel: number | null;
  /** Whether a name change is still available on the account. */
  nameChangeAvailable: boolean | null;
  gems: number | null;
  gold: number | null;
  accountAgeYears: number | null;
  emotes: number | null;
  rareEmotes: number | null;
  towerSkins: number | null;
  banners: number | null;
  achievements: {
    topGlobal: string | null;
    grandTournament: string | null;
    twentyWinChallenge: string | null;
  };
  /** Raw structured attributes parsed for the selected game. */
  sourceAttributes: Record<string, number | boolean | string | null>;
}
