#!/usr/bin/env node
// Load .env and spawn the perplexity server so it inherits environment variables
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Load .env manually to ensure variables are available to child processes
const dotenvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(dotenvPath)) {
  const content = fs.readFileSync(dotenvPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(
      /^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))\s*$/,
    );
    if (m) {
      const key = m[1];
      const val = m[2] ?? m[3] ?? m[4] ?? "";
      if (!(key in process.env)) process.env[key] = val;
    }
  });
}

// Ensure PERPLEXITY_API_KEY exists
if (!process.env.PERPLEXITY_API_KEY) {
  console.error("Error: PERPLEXITY_API_KEY environment variable is required");
  process.exit(1);
}

// Spawn the original command: npx -y server-perplexity-ask
const child = spawn("npx -y server-perplexity-ask", {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code);
});
