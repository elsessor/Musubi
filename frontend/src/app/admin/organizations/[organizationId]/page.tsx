import { OrganizationDetailClient } from "./OrganizationDetailClient";

export function generateStaticParams() {
  return [{ organizationId: "detail" }];
}

export default function OrganizationDetailPage() {
  return <OrganizationDetailClient />;
}
