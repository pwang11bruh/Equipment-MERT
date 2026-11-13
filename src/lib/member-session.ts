import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

import { serverEnv } from "@/lib/env";

/**
 * Member "session" = a signed, httpOnly cookie issued after the shared PIN is
 * verified by verify_member_pin(). It carries no identity: members type their
 * name on each submission. Format: base64url(payload).base64url(hmac).
 * See docs/architecture/SECURITY.md.
 */

export const MEMBER_COOKIE = "mert_member";

type Payload = { v: 1; exp: number };

function sign(data: string): string {
  return createHmac("sha256", serverEnv().MEMBER_SESSION_SECRET).update(data).digest("base64url");
}

export function encodeMemberToken(expiresAt: Date): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: expiresAt.getTime() } satisfies Payload)).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyMemberToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Payload;
    return data.v === 1 && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

/** True when the current request carries a valid member session cookie. */
export async function hasMemberSession(): Promise<boolean> {
  const store = await cookies();
  return verifyMemberToken(store.get(MEMBER_COOKIE)?.value);
}

/** Issue the member cookie (call only after verify_member_pin returned ok). */
export async function startMemberSession(): Promise<void> {
  const hours = serverEnv().MEMBER_SESSION_HOURS;
  const expires = new Date(Date.now() + hours * 3600_000);
  const store = await cookies();
  store.set(MEMBER_COOKIE, encodeMemberToken(expires), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
}

/**
 * Stable, non-reversible identifier for the client, used for PIN rate limiting.
 * We never store raw IPs.
 */
export async function clientHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}|${serverEnv().MEMBER_SESSION_SECRET}`).digest("hex");
}
