# Rally Track

## 🚀 Getting Started

### 前提条件
- Node.js 18+
- yarn
- Supabaseアカウント
- YouTube Data API v3のAPIキー
- vercel

### セットアップ

1. リポジトリをクローンし、依存関係をインストール：
```bash
git clone https://github.com/stwebyy/rally-track.git
cd rally-track
yarn install
```

2. 環境変数を設定：
```bash
cp .env.local.example .env.local
# 必要な環境変数を設定
```

3. 開発サーバーを起動：
```bash
yarn dev
```

4. [http://localhost:3000](http://localhost:3000) でアプリケーションが起動します

## 📁 ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── games/         # ゲーム関連API
│   │   ├── matches/       # マッチ関連API
│   │   ├── members/       # メンバー関連API
│   │   ├── movies/        # 動画関連API
│   │   └── youtube/       # YouTube関連API
│   ├── auth/              # 認証関連ページ
│   ├── club/              # クラブ管理ページ
│   ├── events/            # イベント管理ページ
│   ├── member_record/     # メンバー記録ページ
│   └── youtube/           # YouTube動画管理ページ
├── components/            # Reactコンポーネント
│   ├── atoms/             # Atomic Design - Atoms
│   ├── molescules/        # Atomic Design - Molecules
│   └── index.ts           # コンポーネントのbarrel exports
├── hooks/                 # カスタムReact Hooks
│   ├── api/               # API関連フック
│   │   ├── useGames.ts    # ゲームデータ取得フック
│   │   ├── useMovies.ts   # 動画データ取得フック
│   │   └── index.ts       # API関連フックのbarrel exports
│   ├── useAuth.ts         # 認証フック
│   ├── useSidebar.ts      # サイドバー状態管理フック
│   ├── useUploadResume.ts # アップロード再開フック
│   └── index.ts           # フックのbarrel exports
├── lib/                   # ライブラリとユーティリティ
│   ├── apiClient.ts       # 型安全APIクライアント
│   ├── supabaseClient.ts  # Supabaseクライアント
│   └── youtubeClient.ts   # YouTube API クライアント
├── schemas/               # Zodスキーマ定義
│   ├── api.ts             # API関連スキーマ
│   ├── common/            # 共通スキーマ
│   └── domains/           # ドメイン別スキーマ
├── types/                 # TypeScript型定義
├── utils/                 # ユーティリティ関数
└── middleware.ts          # Next.js ミドルウェア
```

## 🛠️ 使用している主なライブラリ

### フロントエンド
- **Next.js 15.5.0** - Reactフレームワーク（App Router使用）
- **React 19.1.0** - UIライブラリ
- **Material-UI (MUI) 7.3.1** - UIコンポーネントライブラリ
  - `@mui/material` - コアコンポーネント
  - `@mui/icons-material` - アイコン
  - `@mui/x-data-grid` - データグリッド
- **Emotion 11** - CSS-in-JS（MUIの依存関係）

### バックエンド・データベース
- **Supabase** - BaaS（Backend as a Service）
  - `@supabase/supabase-js` - JavaScriptクライアント
  - `@supabase/ssr` - Server-Side Rendering対応

### 外部API・統合
- **Google APIs** - YouTube Data API v3の利用
- **YouTube Upload** - カスタム動画アップロード機能

### バリデーション・型安全性
- **Zod 4.1.9** - スキーマバリデーション
- **TypeScript 5.9.2** - 型安全性の確保

### 開発ツール
- **ESLint** - コードの静的解析
- **Turbopack** - 高速ビルドツール

## 🔄 開発フロー

### 1. API開発
```bash
# API Routesを追加 (src/app/api/)
# 対応するスキーマを追加 (src/schemas/)
# カスタムフックを作成 (src/hooks/api/)
# 型定義を更新 (src/types/)
```

### 2. コンポーネント開発
```bash
# Atomic Designに従ってコンポーネントを作成
# atoms: 基本コンポーネント
# molecules: atoms を組み合わせた複合コンポーネント
# components/index.ts でエクスポート
```

## 📝 コーディング規約

### TypeScript規約
- **型定義は `type` を使用**（`interface` は使用しない）
  ```typescript
  // ✅ Good
  export type User = {
    id: string;
    name: string;
  };

  // ❌ Bad
  export interface User {
    id: string;
    name: string;
  }
  ```

- **アロー関数を使用**（`function` 宣言は使用しない）
  ```typescript
  // ✅ Good
  export const getUserById = (id: string) => {
    // ...
  };

  // ❌ Bad
  export function getUserById(id: string) {
    // ...
  }
  ```

### 命名規約
- **キャメルケースを使用**
  ```typescript
  // ✅ Good
  const userProfile = { firstName: 'John' };
  const fetchUserData = () => { /* ... */ };

  // ❌ Bad
  const user_profile = { first_name: 'John' };
  const fetch_user_data = () => { /* ... */ };
  ```

### ファイル・ディレクトリ構成
- **Barrel exports の活用** - `index.ts` でモジュールを一括エクスポート
- **関心の分離** - 機能別にディレクトリを分割
- **型安全性** - 全ての外部データに対してZodスキーマでバリデーション

### React/Next.js 規約
- **Server Components** をデフォルトで使用
- **Client Components** は `'use client'` ディレクティブで明示
- **カスタムフック** でロジックを分離
- **Atomic Design** でコンポーネントを分類
