import type { NextConfig } from "next";

const buildAllowedServerActionOrigins = () => {
  const origins = new Set<string>();

  const addOrigin = (value: string | undefined) => {
    if (!value) return;
    try {
      const parsed = new URL(value);
      origins.add(parsed.origin);
      origins.add(parsed.host);
    } catch (error) {
      console.warn(
        `Invalid origin provided for server actions: ${value} (${String(error)})`,
      );
    }
  };

  addOrigin(process.env.NEXT_PUBLIC_APP_URL);
  addOrigin("http://localhost:3000");
  addOrigin("http://127.0.0.1:3000");
  addOrigin("http://localhost:3100");
  addOrigin("http://127.0.0.1:3100");

  return Array.from(origins);
};

const allowedServerActionOrigins = buildAllowedServerActionOrigins();

const buildSecurityHeaders = () => {
  const headers = [
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-XSS-Protection",
      value: "1; mode=block",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value:
        process.env.NODE_ENV === "development"
          ? "camera=(), microphone=(), geolocation=(self), payment=()"
          : "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];

  if (process.env.NODE_ENV !== "development") {
    headers.unshift({
      key: "X-Frame-Options",
      value: "DENY",
    });
  }

  return headers;
};

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  // output: "standalone",

  experimental: {
    serverActions: {
      allowedOrigins: allowedServerActionOrigins,
      bodySizeLimit: "10mb",
    },
  },

  // Allow development origins for cross-origin requests (e.g., Cloudflare tunnels)
  allowedDevOrigins: [
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? [process.env.NEXT_PUBLIC_APP_URL]
      : []),
    "eas-university.site",
    "localhost:3000",
    "127.0.0.1:3000",
    "localhost:3100",
    "127.0.0.1:3100",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
