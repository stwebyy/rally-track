/**
 * YouTube API クォータ使用量追跡
 */

interface QuotaUsage {
  date: string;
  uploads: number;
  totalUnits: number;
}

const STORAGE_KEY = 'youtube_quota_usage';
const DAILY_LIMIT = 10000;
const UPLOAD_COST = 1600;

export class YouTubeQuotaTracker {
  /**
   * 本日のクォータ使用量を取得
   */
  static getTodayUsage(): QuotaUsage {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const usage: QuotaUsage = JSON.parse(stored);
      if (usage.date === today) {
        return usage;
      }
    }

    // 新しい日のデータを作成
    const newUsage: QuotaUsage = {
      date: today,
      uploads: 0,
      totalUnits: 0
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
    return newUsage;
  }

  /**
   * アップロード完了時にクォータ使用量を記録
   */
  static recordUpload(): void {
    const usage = this.getTodayUsage();
    usage.uploads += 1;
    usage.totalUnits += UPLOAD_COST;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));

    console.log('YouTube Quota Usage:', {
      uploads: usage.uploads,
      totalUnits: usage.totalUnits,
      remaining: DAILY_LIMIT - usage.totalUnits,
      maxUploadsToday: Math.floor((DAILY_LIMIT - usage.totalUnits) / UPLOAD_COST)
    });
  }

  /**
   * アップロード可能かチェック
   */
  static canUpload(): boolean {
    const usage = this.getTodayUsage();
    return usage.totalUnits + UPLOAD_COST <= DAILY_LIMIT;
  }

  /**
   * 残りクォータ情報を取得
   */
  static getRemainingQuota(): {
    remaining: number;
    maxUploads: number;
    usedToday: number;
  } {
    const usage = this.getTodayUsage();
    const remaining = DAILY_LIMIT - usage.totalUnits;

    return {
      remaining,
      maxUploads: Math.floor(remaining / UPLOAD_COST),
      usedToday: usage.uploads
    };
  }
}
