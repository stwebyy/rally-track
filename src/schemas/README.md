# Schemas Directory

> **Zod-based Type-safe API Schema Management**
> プロジェクトの全APIスキーマとバリデーションを管理するディレクトリです

## 📁 ディレクトリ構成

```
src/schemas/
├── README.md                 # このファイル
├── index.ts                  # メインエクスポートポイント
├── common/                   # 共通スキーマ・ユーティリティ
│   └── index.ts             # ページネーション、レスポンス、バリデーション
├── domains/                 # ドメイン別スキーマ（推奨構成）
│   ├── index.ts             # 全ドメインの統合エクスポート
│   ├── games/               # ゲーム・試合関連
│   │   └── index.ts         # 試合、ゲーム、スコア管理
│   ├── users/               # ユーザー・認証関連
│   │   └── index.ts         # プロファイル、認証、メンバー管理
│   └── media/               # メディア・動画関連
│       └── index.ts         # 動画、YouTube、ファイルアップロード
├── api.ts                   # [LEGACY] 旧統合スキーマファイル
└── architecture-guide.ts    # 設計指針・ベストプラクティス
```

## 🎯 基本方針

### **ドメイン駆動設計（DDD）アプローチ**
- **ビジネスドメイン**ごとにスキーマを整理
- **チーム並行開発**でのコンフリクトを最小化
- **長期保守性**と**スケーラビリティ**を重視

### **型安全性の徹底**
```typescript
// ✅ 良い例：Zodスキーマから型を自動生成
export const UserSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレス'),
});
export type User = z.infer<typeof UserSchema>; // 型が自動生成

// ❌ 避ける例：手動での型定義
interface User {  // 手動メンテナンスが必要
  name: string;
  email: string;
}
```

## 🚀 開発フロー

### **1. 新しいAPIを作る場合**

```bash
# Step 1: 適切なドメインを特定
# 例：ユーザープロファイル更新API → users ドメイン

# Step 2: ドメインスキーマファイルを編集
vim src/schemas/domains/users/index.ts

# Step 3: スキーマを定義（型は自動生成される）
export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
```

### **2. APIエンドポイントでの使用**

```typescript
// app/api/users/profile/route.ts
import { UpdateProfileRequestSchema } from '@/schemas/domains/users';

export async function PATCH(request: NextRequest) {
  // Step 1: リクエストバリデーション
  const validation = UpdateProfileRequestSchema.safeParse(await request.json());

  if (!validation.success) {
    return NextResponse.json({
      error: validation.error.format() // 詳細なバリデーションエラー
    }, { status: 400 });
  }

  // Step 2: validation.data は完全に型安全
  const { name, bio } = validation.data; // 自動補完が効く！

  // ... ビジネスロジック
}
```

### **3. クライアントサイドでの使用**

```typescript
// hooks/useUpdateProfile.ts
import { UpdateProfileRequest } from '@/schemas/domains/users';

export function useUpdateProfile() {
  const updateProfile = async (data: UpdateProfileRequest) => {
    //                              ↑ 型が自動推論される
    const response = await fetch('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // レスポンスも型安全にハンドリング
  };

  return { updateProfile };
}
```

## 📋 スキーマ作成ガイドライン

### **命名規則**

```typescript
// ✅ 正しい命名
export const CreateUserRequestSchema = z.object({...});     // リクエストスキーマ
export const UserProfileResponseSchema = z.object({...});  // レスポンススキーマ
export const UserSchema = z.object({...});                 // エンティティスキーマ

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type User = z.infer<typeof UserSchema>;

// ❌ 避けるべき命名
export const userSchema = z.object({...});           // camelCase
export const USER_SCHEMA = z.object({...});          // SNAKE_CASE
export const User = z.object({...});                 // Schemaサフィックスなし
```

### **バリデーションメッセージ**

```typescript
// ✅ 良い例：ユーザーフレンドリーなメッセージ
export const UserSchema = z.object({
  name: z.string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください'),
  email: z.string()
    .email('有効なメールアドレスを入力してください'),
  age: z.number()
    .int('年齢は整数で入力してください')
    .min(0, '年齢は0以上である必要があります')
    .max(120, '年齢は120以下で入力してください'),
});

// ❌ 避ける例：メッセージなし
export const UserSchema = z.object({
  name: z.string().min(1),     // デフォルトメッセージ
  email: z.string().email(),   // 英語メッセージ
});
```

### **共通スキーマの活用**

```typescript
// ✅ 共通スキーマを積極活用
import {
  IdSchema,
  TimestampSchema,
  PaginationRequestSchema,
  createApiResponseSchema
} from '@/schemas/common';

export const UserSchema = z.object({
  id: IdSchema,                    // UUID検証付き
  name: z.string().min(1),
  email: z.string().email(),
}).merge(TimestampSchema);           // created_at, updated_at追加

export const GetUsersRequestSchema = z.object({
  search: z.string().optional(),
}).merge(PaginationRequestSchema);   // page, limit追加

export const GetUsersResponseSchema = createApiResponseSchema(
  z.object({
    users: z.array(UserSchema),
    total: z.number(),
  })
);
```

## ⚠️ 重要な注意点

### **1. 型定義は手動で書かない**

```typescript
// ✅ 正しい方法：z.inferで型を自動生成
export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
export type User = z.infer<typeof UserSchema>; // 自動生成

// ❌ 間違った方法：手動で型定義
export interface User {  // スキーマとの不整合リスク
  name: string;
  email: string;
}
```

### **2. スキーマの重複を避ける**

```typescript
// ✅ 良い例：共通スキーマを分割して再利用
export const UserBaseSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export const CreateUserRequestSchema = UserBaseSchema;
export const UpdateUserRequestSchema = UserBaseSchema.partial();
export const UserResponseSchema = UserBaseSchema.extend({
  id: IdSchema,
}).merge(TimestampSchema);

// ❌ 避ける例：同じフィールドを重複定義
export const CreateUserRequestSchema = z.object({
  name: z.string(),        // 重複
  email: z.string().email(), // 重複
});
export const UpdateUserRequestSchema = z.object({
  name: z.string(),        // 重複
  email: z.string().email(), // 重複
});
```

### **3. ファイルサイズの管理**

```typescript
// ⚠️ ファイルサイズの目安
// 理想：< 200行
// 注意：> 300行（分割を検討）
// 危険：> 500行（必ず分割）

// ✅ 大きくなった場合は分割
// domains/users/index.ts → 分割後
export * from './auth';          //認証関連
export * from './profile';       // プロファイル関連
export * from './members';       // メンバー管理関連
```

### **4. チーム開発でのコンフリクト回避**

```typescript
// ✅ 推奨：ドメイン別でファイルを分離
// Aチーム: domains/games/index.ts を担当
// Bチーム: domains/users/index.ts を担当
// Cチーム: domains/media/index.ts を担当

// ❌ 避ける：全員が同じファイルを編集
// 全チーム: api.ts を編集 → コンフリクト多発
```

## 🔧 ユーティリティ関数

### **共通レスポンス形式の生成**

```typescript
import { createApiResponseSchema, createListResponseSchema } from '@/schemas/common';

// 単一リソースのレスポンス
export const UserResponseSchema = createApiResponseSchema(UserSchema);
// 生成される型: { success: true, data: User, message?: string, timestamp?: string }

// リスト形式のレスポンス
export const UsersListResponseSchema = createListResponseSchema(UserSchema);
// 生成される型: { items: User[], pagination: PaginationResponse }
```

### **エラーハンドリング**

```typescript
import { ErrorResponseSchema } from '@/schemas/common';

// APIエラーレスポンスの統一
export async function handleApiError(error: unknown): Promise<ErrorResponse> {
  if (error instanceof ZodError) {
    return {
      success: false,
      error: 'Validation Error',
      details: error.format(),
    };
  }

  return {
    success: false,
    error: 'Internal Server Error',
  };
}
```

## 📚 参考資料

- [Zod公式ドキュメント](https://zod.dev/)
- [TypeScript型推論](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [`architecture-guide.ts`](./architecture-guide.ts) - 詳細な設計指針
- [`development-timeline.ts`](./development-timeline.ts) - 開発フローの詳細

## 🆘 トラブルシューティング

### **よくある問題と解決法**

```typescript
// 問題1: 型エラー「z.infer型が複雑すぎる」
// 解決法: スキーマを分割する
const LargeSchema = BaseSchema.extend({...}).merge({...}); // 複雑
const SimpleSchema = z.object({...}); // シンプル

// 問題2: バリデーションエラーが英語で表示される
// 解決法: 日本語メッセージを明示的に指定
z.string().email('有効なメールアドレスを入力してください')

// 問題3: 既存の型との互換性エラー
// 解決法: 段階的移行を行う
export type User = z.infer<typeof UserSchema> | LegacyUser;
```

## 🎉 開発チームへ

このスキーマ管理システムにより：

- ✅ **型安全性**: コンパイル時とランタイムの両方で型チェック
- ✅ **開発効率**: 自動補完とエラー検出
- ✅ **チーム開発**: コンフリクトの最小化
- ✅ **保守性**: 一元管理された型定義
- ✅ **品質向上**: バリデーションの統一

新しいAPIを開発する際は、このガイドラインに従って**型安全で保守しやすいコード**を作成してください！🚀

---

> 💡 **Tip**: 不明な点があれば、[`architecture-guide.ts`](./architecture-guide.ts)の詳細解説も参照してください。
