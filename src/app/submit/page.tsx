import type { Metadata } from "next";

import { getMemberCatalog } from "@/lib/catalog";
import { hasMemberSession } from "@/lib/member-session";

import { PinForm } from "./pin-form";
import { SubmissionForm } from "./submission-form";

export const metadata: Metadata = { title: "Log items · MERT Equipment" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  if (!(await hasMemberSession())) return <PinForm />;

  const items = await getMemberCatalog();
  return <SubmissionForm items={items} />;
}
