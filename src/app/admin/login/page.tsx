import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in · MERT Equipment" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="text-muted-foreground text-sm">MERT Equipment inventory</p>
      </div>
      <LoginForm next={next} initialError={error === "forbidden" ? "This account doesn't have admin access." : undefined} />
    </main>
  );
}
