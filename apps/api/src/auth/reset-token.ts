import { createHash, randomBytes } from 'node:crypto';

export const PASSWORD_RESET_MINUTES = 30;

export const createPasswordResetToken = (): { token: string; tokenHash: string; expiresAt: Date } => {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_MINUTES * 60_000),
  };
};

export const hashPasswordResetToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('base64url');
