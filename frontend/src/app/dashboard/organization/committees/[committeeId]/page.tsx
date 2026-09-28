import { CommitteeClient } from "./CommitteeClient";

export function generateStaticParams() {
  return [{ committeeId: "index" }];
}

export default function CommitteePage() {
  return <CommitteeClient />;
}
