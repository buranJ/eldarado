import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from './env.js';
import { prisma } from './db.js';

export type IntegrationProvider = 'eldorado' | 'anthropic';

const encryptionKey = (): Buffer => {
  if (!env.credentialEncryptionKey) {
    throw new Error('Не задан CREDENTIAL_ENCRYPTION_KEY на сервере');
  }
  const key = Buffer.from(env.credentialEncryptionKey, 'base64');
  if (key.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY должен содержать 32 байта');
  return key;
};

const encrypt = (value: unknown) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
};

const decrypt = <T>(row: { ciphertext: string; iv: string; authTag: string }): T => {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(row.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(row.authTag, 'base64'));
  const cleartext = Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(cleartext.toString('utf8')) as T;
};

export const saveCredentials = async (
  userId: string,
  provider: IntegrationProvider,
  value: unknown,
): Promise<void> => {
  const encrypted = encrypt(value);
  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...encrypted },
    update: encrypted,
  });
};

export const readCredentials = async <T>(
  userId: string,
  provider: IntegrationProvider,
): Promise<T | null> => {
  const row = await prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  return row ? decrypt<T>(row) : null;
};

export const removeCredentials = async (
  userId: string,
  provider: IntegrationProvider,
): Promise<void> => {
  await prisma.integrationCredential.deleteMany({ where: { userId, provider } });
};
