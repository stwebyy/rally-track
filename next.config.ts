import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // 大きなファイルのアップロードに対応するためminificationを無効化
    serverMinification: false,
    // App Routerで大きなファイルを扱うための設定
    serverComponentsExternalPackages: ['googleapis'],
  },
  // App Routerでの大きなファイル処理のための設定
  images: {
    unoptimized: true
  },
  // Vercelでのサーバーレス関数設定（開発環境でも適用）
  serverRuntimeConfig: {
    maxFileSize: '10gb',
  },
};

export default nextConfig;
