import { Redis } from "@upstash/redis";

// Works with Upstash added through the Vercel Marketplace (KV_* vars)
// or a direct Upstash database (UPSTASH_* vars).
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export type Subscriber = {
  email: string;
  regions: string; // comma list: india,remote
  levels: string; // comma list: intern,entry,pm,senior
  token: string;
  createdAt: number;
  lastSentAt: number; // 0 = never
};

/** Simple daily limit per visitor to protect the free AI quota. */
export async function underDailyLimit(id: string, limit: number): Promise<boolean> {
  if (!redis) return true;
  const day = new Date().toISOString().slice(0, 10);
  const key = `rl:${day}:${id}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60 * 60 * 26);
  return n <= limit;
}
