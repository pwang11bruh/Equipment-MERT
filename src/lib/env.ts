import { z } from "zod";

/**
 * Typed access to environment variables.
 * - `publicEnv` is safe in the browser (NEXT_PUBLIC_*).
 * - `serverEnv()` must only be called on the server; it throws if a required
 *   secret is missing so misconfiguration fails loudly.
 * Keep in sync with .env.example and docs/operations/ENVIRONMENT.md.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MEMBER_SESSION_SECRET: z.string().min(32, "MEMBER_SESSION_SECRET must be at least 32 characters"),
  MEMBER_SESSION_HOURS: z.coerce.number().int().positive().default(12),
  CRON_SECRET: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().optional(),
  ALERT_EMAIL_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() called in the browser");
  }
  if (!cached) {
    // Treat empty strings from .env files as "unset".
    const raw = Object.fromEntries(
      Object.keys(serverSchema.shape).map((k) => [k, process.env[k] || undefined]),
    );
    cached = serverSchema.parse(raw);
  }
  return cached;
}
