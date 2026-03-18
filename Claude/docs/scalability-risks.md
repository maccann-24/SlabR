# Scalability Risks — ServiceLine AI

Analysis target: 10,000 daily active users (approx. 500–1,000 concurrent calls at peak).

---

## 1. In-Memory WebSocket Rate Limiting (Single-Process State)

**File:** `apps/voice/src/lib/ws-rate-limit.ts`

**What breaks:** The `ipConnections` Map and `totalActiveConnections` counter live in a single Node.js process. When you scale to multiple server instances behind a load balancer, each process tracks its own count. The `MAX_TOTAL_CONNECTIONS = 100` global cap applies per-process, not globally, so the real limit becomes `100 * N instances`. Conversely, per-IP limits become too strict because a single IP may hit different instances.

**Failure mode:** Either premature rejection (per-IP limits not shared) or overload (global cap not enforced), plus stale Map entries leaking memory under high churn.

**Fix:** Replace the in-memory Map with Redis:

```ts
// ws-rate-limit.ts
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function canAcceptWsConnection(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  const [active, recent, globalActive] = await redis
    .pipeline()
    .get(`ws:active:${ip}`)
    .llen(`ws:rate:${ip}`)
    .get('ws:active:global')
    .exec();

  const activeCount = parseInt(active?.[1] as string) || 0;
  const recentCount = (recent?.[1] as number) || 0;
  const globalCount = parseInt(globalActive?.[1] as string) || 0;

  if (globalCount >= MAX_TOTAL_CONNECTIONS) return { allowed: false, reason: 'Server at capacity' };
  if (activeCount >= MAX_CONCURRENT_PER_IP) return { allowed: false, reason: 'Max concurrent per IP' };
  if (recentCount >= MAX_NEW_PER_MINUTE_PER_IP) return { allowed: false, reason: 'Rate limited' };

  return { allowed: true };
}

export async function trackWsConnect(ip: string): Promise<void> {
  await redis.pipeline()
    .incr(`ws:active:${ip}`)
    .incr('ws:active:global')
    .lpush(`ws:rate:${ip}`, Date.now().toString())
    .ltrim(`ws:rate:${ip}`, 0, MAX_NEW_PER_MINUTE_PER_IP - 1)
    .expire(`ws:rate:${ip}`, 60)
    .exec();
}

export async function trackWsDisconnect(ip: string): Promise<void> {
  await redis.pipeline()
    .decr(`ws:active:${ip}`)
    .decr('ws:active:global')
    .exec();
}
```

---

## 2. setTimeout Escalation Timers (Process Memory + No Persistence)

**File:** `apps/voice/src/services/on-call.ts`

**What breaks:** Each escalation schedules a `setTimeout` (5–30 minutes). At 10K DAU with ~15% emergency/booking calls, hundreds of timers accumulate in a single process. If the process restarts (deploy, crash, OOM), all pending escalations silently disappear.

**Failure mode:** Emergencies go unescalated after a deploy. Techs who don't respond are never followed up. Business owner never learns about the missed emergency.

**Fix:** Replace setTimeout with a durable job queue (e.g., BullMQ + Redis):

```ts
// services/escalation-queue.ts
import { Queue, Worker } from 'bullmq';

const escalationQueue = new Queue('escalations', { connection: { url: process.env.REDIS_URL } });

export async function scheduleEscalation(
  escalationId: string,
  clientOwnerPhone: string,
  contactName: string,
  type: string,
  message: string,
  delayMs: number,
): Promise<void> {
  await escalationQueue.add('check-escalation', {
    escalationId, clientOwnerPhone, contactName, type, message,
  }, { delay: delayMs, removeOnComplete: true });
}

// Worker (runs in any process — survives restarts)
new Worker('escalations', async (job) => {
  const { escalationId, clientOwnerPhone, contactName, type, message } = job.data;
  const [current] = await db.select().from(escalations).where(eq(escalations.id, escalationId)).limit(1);
  if (current && !current.acknowledged) {
    await db.update(escalations).set({ escalatedToOwner: true, escalatedAt: new Date() }).where(eq(escalations.id, escalationId));
    await smsToOwner(clientOwnerPhone, current.sentFrom, `${contactName} didn't respond (${type}). Escalating.\n\n${message}`);
  }
}, { connection: { url: process.env.REDIS_URL } });
```

---

## 3. Database Connection Pool Exhaustion

**Files:** `packages/db/src/index.ts` (max: 20), `apps/web/src/lib/db.ts` (max: 10)

**What breaks:** The voice server pool is capped at 20 connections. Each active WebSocket call holds a connection during tool execution (booking, lead insert, escalation check). At 200+ concurrent calls, all 20 connections are saturated. New calls queue for `connectionTimeoutMillis: 5000` then fail. The web app pool (max: 10) is even worse — Next.js serverless functions can spike well beyond 10 concurrent requests.

**Failure mode:** `Error: timeout exceeded when trying to connect` cascades across all active calls. Callers hear "I'm having a little trouble" from the fallback error handler.

**Fix:** Use PgBouncer in transaction pooling mode and increase pool sizes:

```ts
// packages/db/src/index.ts
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // Point to PgBouncer (port 6432)
  max: 50,                    // PgBouncer handles the actual Postgres limit
  idleTimeoutMillis: 10_000,  // Return connections faster
  connectionTimeoutMillis: 3_000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  allowExitOnIdle: true,      // Clean shutdown
});
```

And for the web app, use connection pooling per-request with Neon or PgBouncer rather than a module-level pool that fights with serverless cold starts.

---

## 4. WebSocket Handler Memory Growth (Unbounded Message History)

**File:** `apps/voice/src/ws/handler.ts`

**What breaks:** Each WebSocket connection accumulates `messageHistory` in memory. The cap is `AI.maxHistory` but each message can contain multi-KB tool results (appointment details, JSON payloads). With 500 concurrent calls, each holding ~50KB of history, that is 25MB of heap just for conversation state — and that grows if maxHistory is generous or tool results are large.

**Failure mode:** V8 heap grows until the process OOM-kills. All active calls drop simultaneously.

**Fix:** Cap message history more aggressively and truncate tool results:

```ts
// In handler.ts, after tool results are pushed:
const MAX_TOOL_RESULT_CHARS = 500;
toolResults.push({
  type: 'tool_result',
  tool_use_id: toolBlock.id,
  content: JSON.stringify(result).slice(0, MAX_TOOL_RESULT_CHARS),
});

// Also reduce maxHistory for voice (short conversations don't need 40+ messages):
// In @serviceline/config:
export const AI = {
  maxHistory: 20,         // was higher — voice calls are 3-5 turns
  maxSummaryHistory: 10,  // don't send entire history for summary
};
```

---

## 5. No Horizontal Scaling Path (Single Fastify Process)

**File:** `apps/voice/src/index.ts`

**What breaks:** The voice server is a single Fastify process. WebSocket connections are stateful and pinned to the process that accepted them. There is no session externalization, no cluster mode, and no sticky-session configuration for a load balancer. You cannot add a second instance without breaking existing connections.

**Failure mode:** At ~500 concurrent calls the single process maxes out CPU (Claude API response parsing, JSON serialization, DB queries). Adding instances means some WebSocket upgrade requests route to the wrong server, getting 404s.

**Fix:** Add Redis-backed session state and sticky sessions:

```ts
// 1. Store session state in Redis instead of closure variables
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// On setup: redis.set(`session:${callSid}`, JSON.stringify({ clientId, leadId, ... }), 'EX', 3600)
// On message: const session = JSON.parse(await redis.get(`session:${callSid}`))

// 2. Use a load balancer with sticky sessions (by callSid cookie or IP hash)
// nginx example:
// upstream voice {
//   ip_hash;
//   server voice-1:3001;
//   server voice-2:3001;
// }

// 3. Short-term: use Node.js cluster mode
import cluster from 'node:cluster';
import { cpus } from 'node:os';
if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) cluster.fork();
} else {
  // start Fastify
}
```

---

## Priority Order

| # | Risk | Impact | Effort |
|---|------|--------|--------|
| 3 | DB pool exhaustion | Calls fail immediately | Low (config change + PgBouncer) |
| 2 | Lost escalation timers | Emergencies missed silently | Medium (add BullMQ) |
| 1 | In-memory rate limits | Security bypass or false rejections | Medium (add Redis) |
| 4 | Memory growth | Full outage under sustained load | Low (config tuning) |
| 5 | No horizontal scaling | Hard ceiling on throughput | High (architecture change) |
