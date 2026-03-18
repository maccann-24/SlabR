import { db, clients, eq } from '@serviceline/db';

export type ClientConfig = typeof clients.$inferSelect;

export async function getClientByTwilioPhone(phone: string): Promise<ClientConfig | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.twilioPhone, phone))
    .limit(1);
  return client ?? null;
}

// TODO: unused — planned for Phase 2
export async function getClientById(id: string): Promise<ClientConfig | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return client ?? null;
}
