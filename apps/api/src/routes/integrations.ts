import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { removeCredentials, saveCredentials } from '../lib/credentials.js';

const eldoradoSchema = z.object({
  clientId: z.string().trim().min(1).max(500),
  clientSecret: z.string().trim().min(1).max(1_000),
});

const anthropicSchema = z.object({
  apiKey: z.string().trim().min(20).max(1_000),
});

const mask = (value: string): string =>
  value.length <= 8 ? '••••••••' : `${value.slice(0, 4)}••••${value.slice(-4)}`;

export const registerIntegrationRoutes = (app: FastifyInstance): void => {
  app.get('/api/profile/integrations', async (request) => {
    const rows = await prisma.integrationCredential.findMany({
      where: { userId: request.user!.id },
      select: { provider: true, updatedAt: true },
    });
    const byProvider = new Map(rows.map((row) => [row.provider, row]));
    return {
      funpay: { configured: true, requiresKey: false },
      eldorado: {
        configured: byProvider.has('eldorado'),
        updatedAt: byProvider.get('eldorado')?.updatedAt.toISOString() ?? null,
      },
      anthropic: {
        configured: byProvider.has('anthropic'),
        updatedAt: byProvider.get('anthropic')?.updatedAt.toISOString() ?? null,
      },
    };
  });

  app.put('/api/profile/integrations/eldorado', async (request) => {
    const input = eldoradoSchema.parse(request.body ?? {});
    await saveCredentials(request.user!.id, 'eldorado', input);
    return { configured: true, clientIdMask: mask(input.clientId) };
  });

  app.delete('/api/profile/integrations/eldorado', async (request) => {
    await removeCredentials(request.user!.id, 'eldorado');
    return { configured: false };
  });

  app.put('/api/profile/integrations/anthropic', async (request) => {
    const input = anthropicSchema.parse(request.body ?? {});
    await saveCredentials(request.user!.id, 'anthropic', input);
    return { configured: true };
  });

  app.delete('/api/profile/integrations/anthropic', async (request) => {
    await removeCredentials(request.user!.id, 'anthropic');
    return { configured: false };
  });
};
