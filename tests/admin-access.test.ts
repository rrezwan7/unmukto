import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { encode } from "next-auth/jwt";

let server: ChildProcess;
let base: string;
let serverOutput = "";
const secret = randomBytes(32).toString("hex");
const cookieName = "authjs.session-token";
const paths = ["/api/tours", "/api/departures", "/api/departures/1/pricing"];

async function sessionCookie(id: string, maxAge = 3600) {
  const value = await encode({
    secret, salt: cookieName, maxAge,
    token: { name: "Test operator", adminGithubId: id },
  });
  return `${cookieName}=${value}`;
}

before(async () => {
  const listener = createServer();
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  base = `http://127.0.0.1:${port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env, AUTH_SECRET: secret, AUTH_URL: base,
    AUTH_GITHUB_ID: "test-client", AUTH_GITHUB_SECRET: "test-secret",
    AUTH_TRUST_HOST: "true", ADMIN_GITHUB_IDS: "123"
  };
  // Denied requests must work even without the booking database configured.
  delete env.DATABASE_URL;
  const mode = process.env.TEST_NEXT_MODE === "start" ? "start" : "dev";
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", mode, "--hostname", "127.0.0.1", "--port", String(port)], {
    env, stdio: ["ignore", "pipe", "pipe"], detached: true,
  });
  server.stdout?.on("data", (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-6000); });
  server.stderr?.on("data", (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-6000); });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/login`, { signal: AbortSignal.timeout(10000) });
      if (response.ok) return;
    } catch { /* Wait for the local test server to compile. */ }
    if (server.exitCode !== null) {
      throw new Error(`Test server stopped (exit ${server.exitCode}):\n${serverOutput}`);
    };
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Test server did not become ready: ${serverOutput}`);
}, { timeout: 100000 });

after(() => {
  if (server?.pid) {
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* Already stopped. */ }
  }
});

test("every existing API denies anonymous reads and writes before database access", async () => {
  for (const path of paths) {
    for (const method of ["GET", "POST"]) {
      const response = await fetch(`${base}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  }
});

test("invalid, expired and non-admin sessions cannot access management APIs", async () => {
  for (const cookie of ["authjs.session-token=forged", await sessionCookie("123", -120), await sessionCookie("456")]) {
    for (const path of paths) {
      const response = await fetch(`${base}${path}`, { headers: { cookie } });
      assert([401, 403].includes(response.status), `${path}: ${response.status}`);
    }
  }
});

test("even an admin session cannot make cross-origin or originless writes", async () => {
  const cookie = await sessionCookie("123");
  for (const path of paths) {
    for (const origin of [undefined, "https://evil.example"]) {
      const headers: Record<string, string> = { cookie };
      if (origin) headers.origin = origin;
      const response = await fetch(`${base}${path}`, { method: "POST", headers });
      assert.equal(response.status, 403, path);
    }
  }
});

test("admin pages redirect anonymous users and allow an authorized session", async () => {
  for (const path of ["/admin/tours", "/admin/departures", "/admin/departures/1", "/admin/tours/new", "/admin/departures/new"]) {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    // Streaming server component redirects may be encoded in an HTTP 200 body.
    if (response.status === 200) assert.match(await response.text(), /NEXT_REDIRECT|http-equiv="refresh"/);
    else {
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), "/login");
    }
  }
  const response = await fetch(`${base}/admin/tours/new`, {
    headers: { cookie: await sessionCookie("123") }, redirect: "manual",
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Create Tour/);
  assert.doesNotMatch(body, /NEXT_REDIRECT/);
});
