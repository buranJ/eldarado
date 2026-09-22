import { readCredentials } from '../../../lib/credentials.js';
import { EldoradoClient, type EldoradoCredentials } from './client.js';

export const eldoradoClientForUser = async (userId: string): Promise<EldoradoClient> =>
  new EldoradoClient(await readCredentials<EldoradoCredentials>(userId, 'eldorado'));
