#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

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

app.prepare().then(() => {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https
    .createServer(options, (req, res) => {
      handle(req, res);
    })
    .listen(port, host, () => {
      const lanIp = getLocalIp();
      const localUrl = `https://localhost:${port}`;

      console.log(
        "\n🔒 HTTPS Development Server running with geolocation support",
      );
      console.log(`📍 Local:  ${localUrl}`);

      if (host === "0.0.0.0" || host === "::") {
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
        console.log(`📡 Bound to host: https://${host}:${port}`);
      }

      console.log("");
    });
});
