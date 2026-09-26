import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { removeCredentials, saveCredentials } from '../lib/credentials.js';
import { EldoradoClient } from '../adapters/destination/eldorado/client.js';

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

  app.put('/api/profile/integrations/eldorado', async (request, reply) => {
    const input = eldoradoSchema.parse(request.body ?? {});
    try {
      await new EldoradoClient(input).verifyCredentials();
    } catch (error) {
      return reply.code(400).send({
        error: `Eldorado отклонил ключи: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    await saveCredentials(request.user!.id, 'eldorado', input);
    return { configured: true, clientIdMask: mask(input.clientId) };
  });

  app.delete('/api/profile/integrations/eldorado', async (request) => {
    await removeCredentials(request.user!.id, 'eldorado');
    return { configured: false };
  });

  app.put('/api/profile/integrations/anthropic', async (request, reply) => {
    const input = anthropicSchema.parse(request.body ?? {});
    try {
      await new Anthropic({ apiKey: input.apiKey }).models.list({ limit: 1 });
    } catch (error) {
      return reply.code(400).send({
        error: `Anthropic отклонил ключ: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    await saveCredentials(request.user!.id, 'anthropic', input);
    return { configured: true };
  });

  app.delete('/api/profile/integrations/anthropic', async (request) => {
    await removeCredentials(request.user!.id, 'anthropic');
    return { configured: false };
  });
};
