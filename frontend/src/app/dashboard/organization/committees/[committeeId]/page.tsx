import { CommitteeClient } from "./CommitteeClient";

export function generateStaticParams() {
  return [{ committeeId: "detail" }];
}

export default function CommitteePage() {
  return <CommitteeClient />;
}
