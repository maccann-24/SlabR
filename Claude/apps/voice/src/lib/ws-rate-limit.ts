/**
 * WebSocket connection rate limiting.
 * Tracks active connections and connection rate per IP address.
 */

const MAX_CONCURRENT_PER_IP = 3;
const MAX_NEW_PER_MINUTE_PER_IP = 10;
const MAX_TOTAL_CONNECTIONS = 100; // Global cap across all IPs
const WINDOW_MS = 60_000;

let totalActiveConnections = 0;

interface IpRecord {
  active: number;
  timestamps: number[];
}

const ipConnections = new Map<string, IpRecord>();

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipConnections.entries()) {
    record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
    if (record.active <= 0 && record.timestamps.length === 0) {
      ipConnections.delete(ip);
    }
  }
}, 5 * 60_000).unref();

export function canAcceptWsConnection(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  let record = ipConnections.get(ip);

  if (!record) {
    record = { active: 0, timestamps: [] };
    ipConnections.set(ip, record);
  }

  // Prune old timestamps
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);

  // Global cap — prevents distributed DDoS from exhausting resources
  if (totalActiveConnections >= MAX_TOTAL_CONNECTIONS) {
    return { allowed: false, reason: `Server at maximum capacity (${MAX_TOTAL_CONNECTIONS} connections)` };
  }

  if (record.active >= MAX_CONCURRENT_PER_IP) {
    return { allowed: false, reason: `Max ${MAX_CONCURRENT_PER_IP} concurrent WebSocket connections per IP` };
  }

  if (record.timestamps.length >= MAX_NEW_PER_MINUTE_PER_IP) {
    return { allowed: false, reason: `Max ${MAX_NEW_PER_MINUTE_PER_IP} new connections per minute per IP` };
  }

  return { allowed: true };
}

export function trackWsConnect(ip: string): void {
  let record = ipConnections.get(ip);
  if (!record) {
    record = { active: 0, timestamps: [] };
    ipConnections.set(ip, record);
  }
  record.active += 1;
  record.timestamps.push(Date.now());
  totalActiveConnections += 1;
}

export function trackWsDisconnect(ip: string): void {
  const record = ipConnections.get(ip);
  if (record) {
    record.active = Math.max(0, record.active - 1);
  }
  totalActiveConnections = Math.max(0, totalActiveConnections - 1);
}
