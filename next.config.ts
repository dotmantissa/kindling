import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    // Public contract address baked in at build time — not a secret
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.CONTRACT_ADDRESS || "0x403B81D01A8BaBfee1C4fD2B422970201B4394fa",
  },
};

export default nextConfig;
