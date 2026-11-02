import type { NextConfig } from "next";

// Google Maps JavaScript API needs its script, tile, font and worker origins
// (https://developers.google.com/maps/documentation/javascript/content-security-policy).
const GOOGLE = "https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com https://*.googleusercontent.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GOOGLE} blob:` + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://pics.avs.io ${GOOGLE}`,
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${GOOGLE} data: blob:`,
  "worker-src blob:",
  "frame-src https://*.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/flight-tracker", destination: "/flight-status", permanent: true },
      { source: "/train-route", destination: "/train-schedule?view=route", permanent: true },
      { source: "/seat-availability", destination: "/seats?tab=availability", permanent: true },
      { source: "/planner", destination: "/seats?tab=planner", permanent: true },
      { source: "/chart-vacancy", destination: "/seats?tab=vacancy", permanent: true },
      { source: "/travel-information", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
