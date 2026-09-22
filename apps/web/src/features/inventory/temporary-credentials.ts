export interface TemporaryCredentials {
  login: string;
  password: string;
}

/** Creates one-time placeholder credentials that are never persisted by GameStock. */
export const createTemporaryCredentials = (accountId: string): TemporaryCredentials => {
  const accountPart = accountId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'account';
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  return {
    login: `pending-${accountPart}-${timestamp}@gmail.com`,
    password: `Pending!${accountPart}-${timestamp}-${randomPart}`,
  };
};
