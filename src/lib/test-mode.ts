export const TEST_DELETION_GUARD = "INNOZANZI_DISPOSABLE_TEST_DATABASE";
export const LOCAL_TEST_DATABASE_SCHEMA="innozanzi_test";

export function isTestModeEnvironment() {
  return process.env.TEST_MODE_ENVIRONMENT === "true";
}

export function assertDisposableTestDatabase() {
  if (!isTestModeEnvironment() || process.env.TEST_MODE_DELETION_GUARD !== TEST_DELETION_GUARD) {
    throw new Error("Test data changes are disabled. This environment is not marked as a disposable test database.");
  }
  const databaseUrl = testDatabaseUrl(process.env.DATABASE_PUBLIC_URL??process.env.DATABASE_URL??"");
  const liveDatabaseUrl = process.env.LIVE_DATABASE_URL ?? "";
  if (!databaseUrl || new URL(databaseUrl).searchParams.get("schema")!==LOCAL_TEST_DATABASE_SCHEMA || (liveDatabaseUrl && databaseUrl === liveDatabaseUrl)) {
    throw new Error("Test database isolation check failed.");
  }
}

export function testDatabaseUrl(value:string){if(!value||!isTestModeEnvironment())return value;const url=new URL(value);url.searchParams.set("schema",LOCAL_TEST_DATABASE_SCHEMA);url.searchParams.set("options",`-c search_path=${LOCAL_TEST_DATABASE_SCHEMA}`);return url.toString()}

export function testModeUrl(path = "/") {
  const base = process.env.TEST_MODE_URL?.replace(/\/$/, "");
  return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : null;
}
