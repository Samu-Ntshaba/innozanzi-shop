export const TEST_DELETION_GUARD = "INNOZANZI_DISPOSABLE_TEST_DATABASE";

export function isTestModeEnvironment() {
  return process.env.TEST_MODE_ENVIRONMENT === "true";
}

export function assertDisposableTestDatabase() {
  if (!isTestModeEnvironment() || process.env.TEST_MODE_DELETION_GUARD !== TEST_DELETION_GUARD) {
    throw new Error("Test data changes are disabled. This environment is not marked as a disposable test database.");
  }
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const liveDatabaseUrl = process.env.LIVE_DATABASE_URL ?? "";
  if (!databaseUrl || (liveDatabaseUrl && databaseUrl === liveDatabaseUrl)) {
    throw new Error("Test database isolation check failed.");
  }
}

export function testModeUrl(path = "/") {
  const base = process.env.TEST_MODE_URL?.replace(/\/$/, "");
  return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : null;
}
