import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../lib/env.js';
import { prisma } from '../lib/db.js';

export const SESSION_COOKIE = 'gamestock_session';
const SESSION_DAYS = 30;

const tokenHash = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('base64url');

const cookiesOf = (request: FastifyRequest): Record<string, string> =>
  Object.fromEntries(
    (request.headers.cookie ?? '').split(';').flatMap((part) => {
      const index = part.indexOf('=');
      if (index < 1) return [];
      return [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]];
    }),
  );

const cookie = (value: string, maxAge: number): string =>
  [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    env.production ? 'Secure' : '',
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join('; ');

export const createSession = async (userId: string, reply: FastifyReply): Promise<void> => {
  const token = randomBytes(32).toString('base64url');
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + maxAge * 1_000),
    },
  });
  reply.header('Set-Cookie', cookie(token, maxAge));
};

export const clearSession = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = cookiesOf(request)[SESSION_COOKIE];
  if (token) await prisma.userSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
  reply.header('Set-Cookie', cookie('', 0));
};

export const sessionUser = async (request: FastifyRequest) => {
  const token = cookiesOf(request)[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.userSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
};
