import "dotenv/config";
import { spawn } from "node:child_process";

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!url || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
  console.error("This check requires a localhost PostgreSQL connection. It will not connect to a hosted database.");
  process.exit(1);
}
// The test only creates/drops its own random test databases. The named database
// is used as an admin connection; its tables and application data are untouched.
const child = spawn(process.execPath, ["--import", "tsx", "--test", "tests/inventory-migration.test.ts"], {
  env: { ...process.env, TEST_DATABASE_URL: url }, stdio: "inherit",
});
child.on("error", () => { console.error("Unable to start the local inventory check."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
