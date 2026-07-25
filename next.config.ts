import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/zeitmanagement-animationen" : undefined,
  assetPrefix: isGithubPages ? "/zeitmanagement-animationen/" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
