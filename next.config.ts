import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactivé : ConvexReactClient + useQuery ne passent pas le prerender
  // strict de cacheComponents (Math.random / absence de provider SSR).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
