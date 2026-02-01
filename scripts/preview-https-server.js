#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Import the standalone server
const standaloneDir = path.join(__dirname, "..", ".next", "standalone");
const serverPath = path.join(standaloneDir, "server.js");

// Check if standalone build exists
if (!fs.existsSync(serverPath)) {
  console.error(
    "❌ Standalone server not found. Please run 'npm run build' first.",
  );
  process.exit(1);
}

const certsDir = path.join(__dirname, "..", ".certs");
const certPath = path.join(certsDir, "localhost.crt");
const keyPath = path.join(certsDir, "localhost.key");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const getLocalIp = () => {
  const nets = os.networkInterfaces();
  let fallback = null;

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== "IPv4" || net.internal) continue;
      // Prefer private IPv4 ranges
      if (
        net.address.startsWith("10.") ||
        net.address.startsWith("192.") ||
        net.address.startsWith("172.")
      ) {
        return net.address;
      }
      fallback = fallback || net.address;
    }
  }

  return fallback;
};

// Check if certificates exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error(
    "❌ Certificates not found at .certs/localhost.crt and .certs/localhost.key",
  );
  console.error(
    "Generate them using: mkcert -key-file .certs/localhost.key -cert-file .certs/localhost.crt localhost 127.0.0.1",
  );
  process.exit(1);
}

// (Defer requiring the standalone server until after patching http.createServer)

// Monkey-patch http.createServer to use https instead
const http = require("http");
const originalCreateServer = http.createServer;

http.createServer = function (requestListener) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const server = https.createServer(options, requestListener);

  // Override listen to add custom logging
  const originalListen = server.listen;
  server.listen = function (port, hostname, callback) {
    const wrappedCallback = () => {
      const lanIp = getLocalIp();
      const localUrl = `https://localhost:${port}`;

      console.log(
        "\n🔒 HTTPS Preview Server running with geolocation support",
      );
      console.log(`📍 Local:  ${localUrl}`);

      if (hostname === "0.0.0.0" || hostname === "::") {
        if (lanIp) {
          console.log(`📡 LAN:    https://${lanIp}:${port}`);
          console.log(
            "   If browsers warn about certificate mismatch, regenerate cert including this IP:",
          );
          console.log(
            `   mkcert -key-file .certs/localhost.key -cert-file .certs/localhost.crt localhost 127.0.0.1 ${lanIp}`,
          );
        } else {
          console.log("📡 LAN:    No active IPv4 address detected.");
        }
      } else {
        console.log(`📡 Bound to host: https://${hostname}:${port}`);
      }

      console.log("");

      if (callback) callback();
    };

    return originalListen.call(this, port, hostname, wrappedCallback);
  };

  return server;
};

// Override PORT and HOSTNAME environment variables if provided
if (port) process.env.PORT = String(port);
if (host) process.env.HOSTNAME = host;

// The standalone server starts on require; our http.createServer patch ensures HTTPS
require(serverPath);
