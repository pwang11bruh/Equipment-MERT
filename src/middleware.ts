import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the admin area needs Supabase session handling. The member form
  // (/submit) uses its own signed PIN cookie (src/lib/member-session.ts).
  matcher: ["/admin/:path*"],
};
