import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy: tells the browser which sources the page may load code, styles and data from.
 * Anything not on this list is blocked, which stops injected scripts from running or sending data out.
 * Example: a script tag pointing at evil.example.com is refused because only our own site is allowed.
 * 'unsafe-eval' is added in development only, because Next.js dev tools need it; production never gets it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' https://api.fda.gov",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Extra safety headers sent with every page and API response.
 * Example: "frame-ancestors 'none'" stops another website from showing our app inside a hidden frame.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Stops the browser from guessing a file's type, so a text file can't be run as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // When a link leaves our site, only our domain is shared, never the full page address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Older-browser version of frame-ancestors 'none'.
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
