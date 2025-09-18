/**
 * Users Domain Schemas
 *
 * ユーザー・認証・プロファイル関連のスキーマ定義
 */

import { z } from 'zod';
import {
  IdSchema,
  EmailSchema,
  TimestampSchema,
  createApiResponseSchema,
  createListResponseSchema
} from '../../common';

// ===== Base User Entity =====

export const UserBaseSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  email: EmailSchema,
});

export const UserProfileSchema = UserBaseSchema.extend({
  bio: z.string().max(500, '自己紹介は500文字以内で入力してください').nullable(),
  avatar_url: z.string().url('有効なアバターURLを入力してください').nullable(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('light'),
    language: z.enum(['ja', 'en']).default('ja'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false),
    }).default({ email: true, push: true, sms: false }),
  }).default({ theme: 'light', language: 'ja', notifications: { email: true, push: true, sms: false } }),
}).merge(TimestampSchema);

// ===== Authentication Schemas =====

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, 'パスワードは8文字以上である必要があります'),
  remember_me: z.boolean().default(false),
});

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  email: EmailSchema,
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .max(128, 'パスワードは128文字以内で入力してください')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字・小文字・数字を含む必要があります'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "パスワードが一致しません",
  path: ["password_confirmation"],
});

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.string().datetime(),
});

// ===== Profile Management =====

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください').optional(),
  bio: z.string().max(500, '自己紹介は500文字以内で入力してください').nullable().optional(),
  avatar_url: z.string().url('有効なアバターURLを入力してください').nullable().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.enum(['ja', 'en']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const ChangePasswordRequestSchema = z.object({
  current_password: z.string().min(1, '現在のパスワードは必須です'),
  new_password: z.string()
    .min(8, '新しいパスワードは8文字以上である必要があります')
    .max(128, '新しいパスワードは128文字以内で入力してください')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '新しいパスワードは大文字・小文字・数字を含む必要があります'),
  new_password_confirmation: z.string(),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "新しいパスワードが一致しません",
  path: ["new_password_confirmation"],
});

// ===== Member Management (Harataku Members) =====

export const HaratakuMemberSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'メンバー名は必須です'),
  auth_id: IdSchema.nullable(),
}).merge(TimestampSchema);

export const CreateMemberRequestSchema = z.object({
  name: z.string().min(1, 'メンバー名は必須です').max(100, 'メンバー名は100文字以内で入力してください'),
  email: EmailSchema.optional(),
});

// ===== API Response Schemas =====

export const LoginResponseSchema = createApiResponseSchema(AuthResponseSchema);
export const RegisterResponseSchema = createApiResponseSchema(AuthResponseSchema);
export const ProfileResponseSchema = createApiResponseSchema(UserProfileSchema);
export const MemberResponseSchema = createApiResponseSchema(HaratakuMemberSchema);
export const MembersListResponseSchema = createListResponseSchema(HaratakuMemberSchema);

// ===== Password Reset =====

export const ForgotPasswordRequestSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'リセットトークンは必須です'),
  password: z.string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .max(128, 'パスワードは128文字以内で入力してください')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字・小文字・数字を含む必要があります'),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "パスワードが一致しません",
  path: ["password_confirmation"],
});

// ===== Type Exports =====

export type UserBase = z.infer<typeof UserBaseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export type HaratakuMember = z.infer<typeof HaratakuMemberSchema>;
export type CreateMemberRequest = z.infer<typeof CreateMemberRequestSchema>;

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type MemberResponse = z.infer<typeof MemberResponseSchema>;
export type MembersListResponse = z.infer<typeof MembersListResponseSchema>;

export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
