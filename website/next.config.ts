import type { NextConfig } from "next";

// The site is exported as static HTML into `out/` and served by Apache at the
// domain root, beside the admin app (/admin) and the PHP API (/api).
// See the repo README for how the three are assembled and deployed.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // The repo root holds the admin app's lockfile; keep Turbopack rooted here.
  turbopack: { root: __dirname },
};

export default nextConfig;
