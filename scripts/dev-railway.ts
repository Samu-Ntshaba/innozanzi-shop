import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";

const port = Number(process.env.RAILWAY_DB_TUNNEL_PORT ?? "15432");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("RAILWAY_DB_TUNNEL_PORT must be a valid port.");
const publicUrl = process.env.DATABASE_PUBLIC_URL;
if (!publicUrl) throw new Error("DATABASE_PUBLIC_URL must be configured in .env.");

const databaseUrl = new URL(publicUrl);
databaseUrl.hostname = "127.0.0.1";
databaseUrl.port = String(port);
databaseUrl.search = "";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
let tunnel: ChildProcess | undefined;
let app: ChildProcess | undefined;

function portIsOpen() {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => resolve(false));
  });
}

async function waitForTunnel() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await portIsOpen()) return;
    if (tunnel?.exitCode !== null) throw new Error("Railway tunnel exited before it became ready.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the Railway database tunnel.");
}

function stop() {
  if (app && app.exitCode === null) app.kill();
  if (tunnel && tunnel.exitCode === null) tunnel.kill();
}

async function main() {
  if (!(await portIsOpen())) {
    console.log(`Opening Railway PostgreSQL tunnel on 127.0.0.1:${port}...`);
    tunnel = spawn(executable, ["--yes", "@railway/cli", "connect", "Postgres", "--environment", "production", "--tunnel-only", "--port", String(port)], {
      cwd: process.cwd(),
      stdio: ["ignore", "ignore", "inherit"],
      shell: process.platform === "win32",
      windowsHide: true,
    });
    await waitForTunnel();
  } else {
    console.log(`Reusing database tunnel on 127.0.0.1:${port}.`);
  }

  console.log("Starting Next.js with the Railway database tunnel...");
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_PUBLIC_URL: databaseUrl.toString() },
    stdio: "inherit",
    windowsHide: true,
  });
  app.once("exit", (code) => {
    if (tunnel && tunnel.exitCode === null) tunnel.kill();
    process.exitCode = code ?? 1;
  });
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.once("exit", stop);

main().catch((error) => {
  stop();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
