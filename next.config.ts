import { config } from "dotenv";
import { existsSync } from "fs";
import type { NextConfig } from "next";
import { resolve } from "path";

// 루트 .env 파일 로드 (Docker와 로컬 환경 모두 지원)
const envPaths = [
  resolve(process.cwd(), ".env"), // Docker 루트 경로
  ".env", // Docker 절대 경로
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    const result = config({ path: envPath });
    if (result.parsed) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      break;
    }
  }
}

const nextConfig: NextConfig = {
  // 환경변수 설정
  env: {
    API_URL: process.env.API_URL || "http://localhost:4000",
    RPC_URL: process.env.RPC_URL,
    CHAIN_ID: process.env.CHAIN_ID || "1337",
    DEFAULT_ACCOUNTS: process.env.DEFAULT_ACCOUNTS || "",
  },
  // Docker standalone 배포를 위한 설정
  output: "standalone",
};

export default nextConfig;
