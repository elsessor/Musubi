import { Suspense } from "react";
import { MemberProfileClient } from "./MemberProfileClient";

export default function MemberProfilePage() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading profile…</p>}><MemberProfileClient /></Suspense>;
}
