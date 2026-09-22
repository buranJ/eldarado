import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [algorithm, saltValue, hashValue] = stored.split(':');
  if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, 'base64');
  const actual = (await scrypt(password, Buffer.from(saltValue, 'base64'), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
