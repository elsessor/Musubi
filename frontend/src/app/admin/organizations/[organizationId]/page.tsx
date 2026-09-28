import { OrganizationDetailClient } from "./OrganizationDetailClient";

export function generateStaticParams() {
  return [{ organizationId: "index" }];
}

export default function OrganizationDetailPage() {
  return <OrganizationDetailClient />;
}
