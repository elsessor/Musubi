const api = (process.argv[2] || "https://musubi-backend-4roe.onrender.com").replace(/\/$/, "");

async function main() {
  const response = await fetch(`${api}/health`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`The hosted health check returned HTTP ${response.status}.`);
  const health = await response.json() as { capabilities?: { testAccountOnboarding?: boolean; testOrganizationAutoJoin?: boolean } };
  if (!health.capabilities?.testAccountOnboarding || !health.capabilities?.testOrganizationAutoJoin) {
    throw new Error(`The backend at ${api} is running an older build. Deploy the test-account changes before testing automatic membership.`);
  }
  console.log(`Deployment verified: ${api} supports test-account setup and automatic membership.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unable to verify the hosted backend.");
  process.exitCode = 1;
});
