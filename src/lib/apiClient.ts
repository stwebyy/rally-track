/**
 * Type-safe API Client
 *
 * Zodスキーマに基づいた型安全なAPIクライアントです。
 * リクエスト・レスポンスの型チェックとランタイムバリデーションを提供します。
 */

import {
  apiEndpoints,
  type ApiEndpoints,
  type ApiRequest,
  type ApiResponse
} from '@/schemas/api';

// APIクライアント設定
interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * 型安全なAPI呼び出し
   */
  async call<TEndpoint extends keyof ApiEndpoints>(
    endpoint: TEndpoint,
    params?: ApiRequest<TEndpoint>,
    options: {
      headers?: Record<string, string>;
      signal?: AbortSignal;
    } = {}
  ): Promise<ApiResponse<TEndpoint>> {
    const endpointConfig = apiEndpoints[endpoint];
    const [method, path] = endpoint.split(' ') as [string, string];

    // リクエストパラメータのバリデーション
    let validatedParams: unknown;
    if ('body' in endpointConfig) {
      validatedParams = endpointConfig.body.parse(params);
    } else if ('query' in endpointConfig) {
      validatedParams = endpointConfig.query.parse(params);
    }

    // URLとリクエスト設定を構築
    let url = `${this.baseUrl}${path}`;
    const requestConfig: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      signal: options.signal,
    };

    // GET/DELETEの場合はクエリパラメータ、POST/PUT/PATCHの場合はbody
    if (method.toUpperCase() === 'GET' || method.toUpperCase() === 'DELETE') {
      if (validatedParams) {
        const searchParams = new URLSearchParams();
        Object.entries(validatedParams).forEach(([key, value]) => {
          if (value != null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
    } else {
      if (validatedParams) {
        requestConfig.body = JSON.stringify(validatedParams);
      }
    }

    try {
      console.log(`API Request: ${method} ${url}`, validatedParams);

      const response = await fetch(url, requestConfig);
      const responseData = await response.json();

      if (!response.ok) {
        // エラーレスポンスのバリデーション
        const errorData = endpointConfig.errorResponse.parse(responseData);
        throw new ApiError(errorData.error, {
          status: response.status,
          data: errorData,
        });
      }

      // 成功レスポンスのバリデーション
      const validatedResponse = endpointConfig.response.parse(responseData);
      console.log(`API Response: ${method} ${url}`, validatedResponse);

      return validatedResponse as ApiResponse<TEndpoint>;
    } catch (error) {
      console.error(`API Error: ${method} ${url}`, error);

      if (error instanceof ApiError) {
        throw error;
      }

      // 予期しないエラー
      throw new ApiError('Unexpected error occurred', {
        status: 0,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }
}

/**
 * カスタムエラークラス
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public details: {
      status: number;
      data: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// デフォルトのAPIクライアントインスタンス
export const apiClient = new ApiClient();

/**
 * 型安全なAPI呼び出し関数（簡単な使用のため）
 */
export async function callApi<TEndpoint extends keyof ApiEndpoints>(
  endpoint: TEndpoint,
  params?: ApiRequest<TEndpoint>,
  options?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
): Promise<ApiResponse<TEndpoint>> {
  return apiClient.call(endpoint, params, options);
}

// 特定のAPIエンドポイント用のヘルパー関数
export const api = {
  games: {
    /**
     * ゲーム一覧を取得
     */
    list: async (params: { type: 'external' | 'internal'; matchId: string }) => {
      return callApi('GET /api/games', params);
    },
  },

  movies: {
    /**
     * 動画一覧を取得
     */
    list: async (params: { page?: number; limit?: number; search?: string } = {}) => {
      return callApi('GET /api/movies', params);
    },
  },

  members: {
    /**
     * メンバーを作成
     */
    create: async (params: { name: string; email?: string }) => {
      return callApi('POST /api/members/create', params);
    },
  },

  youtube: {
    upload: {
      /**
       * アップロードを開始
       */
      initiate: async (params: {
        fileName: string;
        fileSize: number;
        title: string;
        description?: string;
      }) => {
        return callApi('POST /api/youtube/upload/initiate', params);
      },

      /**
       * アップロード進捗を取得
       */
      progress: async (params: { sessionId: string }) => {
        return callApi('GET /api/youtube/upload/progress', params);
      },
    },
  },
} as const;

export default apiClient;
