import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { clearSession, createSession } from '../auth/session.js';
import { env } from '../lib/env.js';
import { prisma } from '../lib/db.js';
import { saveCredentials } from '../lib/credentials.js';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(200),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(80),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

const publicRateLimit = {
  config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
};

const publicUser = (user: { id: string; email: string; displayName: string }) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

export const registerAuthRoutes = (app: FastifyInstance): void => {
  app.post('/api/auth/register', publicRateLimit, async (request, reply) => {
    const input = registerSchema.parse(request.body ?? {});
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return reply.code(409).send({ error: 'Пользователь с такой почтой уже существует' });

    const firstUser = (await prisma.user.count()) === 0;
    const user = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
      },
    });

    const imported: string[] = [];
    if (firstUser && env.credentialEncryptionKey) {
      if (env.eldoradoClientId && env.eldoradoClientSecret) {
        await saveCredentials(user.id, 'eldorado', {
          clientId: env.eldoradoClientId,
          clientSecret: env.eldoradoClientSecret,
        });
        imported.push('eldorado');
      }
      if (env.anthropicApiKey) {
        await saveCredentials(user.id, 'anthropic', { apiKey: env.anthropicApiKey });
        imported.push('anthropic');
      }
    }

    await createSession(user.id, reply);
    return reply.code(201).send({ user: publicUser(user), imported });
  });

  app.post('/api/auth/login', publicRateLimit, async (request, reply) => {
    const input = credentialsSchema.parse(request.body ?? {});
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Неверная почта или пароль' });
    }
    await createSession(user.id, reply);
    return { user: publicUser(user) };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    await clearSession(request, reply);
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: 'Требуется вход' });
    return { user: publicUser(request.user) };
  });

  app.post('/api/auth/change-password', async (request, reply) => {
    const input = changePasswordSchema.parse(request.body ?? {});
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return reply.code(401).send({ error: 'Текущий пароль указан неверно' });
    }
    if (await verifyPassword(input.newPassword, user.passwordHash)) {
      return reply.code(409).send({ error: 'Новый пароль должен отличаться от текущего' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.newPassword) },
      }),
      prisma.userSession.deleteMany({ where: { userId: user.id } }),
    ]);
    await createSession(user.id, reply);
    return { ok: true };
  });
};
