import 'dotenv/config';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name} (см. .env.example)`);
  return value;
};

/** Treats an empty value as absent — `KEY=` in .env must not read as configured. */
const optional = (name: string): string | null => process.env[name]?.trim() || null;

export const env = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 3001),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  /** Model used for attribute extraction. Sonnet for cheap test runs, Opus for production. */
  analysisModel: optional('ANALYSIS_MODEL') ?? 'claude-opus-5',
  /**
   * Seller API uses OAuth client credentials, not a static API key. The secret
   * is only ever sent to Eldorado's token endpoint and is never logged.
   */
  eldoradoClientId: optional('ELDORADO_CLIENT_ID'),
  eldoradoClientSecret: optional('ELDORADO_CLIENT_SECRET'),
};
