import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

async function unsubscribe(token: string | null) {
  if (!redis || !token) return;
  const email = await redis.get<string>(`unsub:${token}`);
  if (!email) return;
  await redis.srem("subs", email);
  await redis.del(`sub:${email}`, `unsub:${token}`);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribe(token);
  return NextResponse.redirect(new URL("/unsubscribed", req.url));
}

// One-click unsubscribe from email apps (List-Unsubscribe-Post).
export async function POST(req: Request) {
  await unsubscribe(new URL(req.url).searchParams.get("token"));
  return new NextResponse(null, { status: 204 });
}
