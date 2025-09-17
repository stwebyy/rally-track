import { youtube_v3 } from 'googleapis';
import type {
  MatchResult,
  MatchGame,
  HaratakuMatchResult,
  HaratakuGameResult
} from './database';

export type VideoUploadRequest = {
  video: File;
  title: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
  tags?: string;
  categoryId?: string;
  thumbnail?: File;
};

export type VideoUploadResponse = {
  success: boolean;
  uploadId: string;
  videoId?: string;
  message: string;
  error?: string;
  details?: string;
};

export type ProgressResponse = {
  success: boolean;
  progress?: {
    uploadId: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress?: number;
    videoId?: string;
    error?: string;
    videoInfo?: youtube_v3.Schema$Video;
  };
  error?: string;
  details?: string;
};

export type AuthStatusResponse = {
  success: boolean;
  authenticated: boolean;
  message: string;
  error?: string;
  details?: string;
};

// YouTube カテゴリID定数
export const YOUTUBE_CATEGORIES = {
  FILM_ANIMATION: '1',
  AUTOS_VEHICLES: '2',
  MUSIC: '10',
  PETS_ANIMALS: '15',
  SPORTS: '17',
  TRAVEL_EVENTS: '19',
  GAMING: '20',
  PEOPLE_BLOGS: '22',
  COMEDY: '23',
  ENTERTAINMENT: '24',
  NEWS_POLITICS: '25',
  HOWTO_STYLE: '26',
  EDUCATION: '27',
  SCIENCE_TECHNOLOGY: '28',
  NONPROFITS_ACTIVISM: '29'
} as const;

// 動画アップロード関連の型定義
export type VideoUploadWithGame = {
  video: File | null;
  title: string;
  description: string;
  privacy?: 'public' | 'unlisted' | 'private';
  tags?: string;
  categoryId?: string;
  thumbnail?: File;
  matchType?: 'external' | 'internal';
  matchResultId?: number;
  gameResultId?: number;
};

export type VideoUploadStatus = {
  id: string;
  uploadId?: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  videoId?: string;
  videoUrl?: string;
  youtube_url?: string;
  title?: string;
  description?: string;
  error?: string;
  matchType?: 'external' | 'internal';
  matchResultId?: number;
  gameResultId?: number;
  createdAt: string;
  date?: string;
  opponent_name?: string;
  player_name?: string;
  score?: string;
  tournament_name?: string;
};

// 再エクスポート（database.tsから）
export type {
  MatchResult,
  MatchGame,
  HaratakuMatchResult,
  HaratakuGameResult
};
