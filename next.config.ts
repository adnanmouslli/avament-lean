import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ✅ تعطيل فحص الـ TypeScript وقت build مؤقتًا
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ تعطيل ESLint وقت build مؤقتًا
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
