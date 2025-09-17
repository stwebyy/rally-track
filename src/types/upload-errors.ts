// カスタムエラークラス
export class FileMismatchError extends Error {
  public readonly originalName: string;
  public readonly originalSize: number;
  public readonly selectedName: string;
  public readonly selectedSize: number;
  public readonly sessionId: string;

  constructor(
    originalName: string,
    originalSize: number,
    selectedName: string,
    selectedSize: number,
    sessionId: string
  ) {
    const message =
      `選択されたファイルが元のアップロードと一致しません。\n` +
      `元のファイル: ${originalName} (${originalSize}MB)\n` +
      `選択したファイル: ${selectedName} (${selectedSize}MB)\n` +
      `同じ動画ファイルを選択してください。`;

    super(message);
    this.name = 'FileMismatchError';
    this.originalName = originalName;
    this.originalSize = originalSize;
    this.selectedName = selectedName;
    this.selectedSize = selectedSize;
    this.sessionId = sessionId;
  }
}

export class UploadError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'UPLOAD_ERROR') {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

export class QuotaExceededError extends Error {
  public readonly usedQuota: number;
  public readonly maxQuota: number;

  constructor(usedQuota: number, maxQuota: number) {
    super(`YouTube API クォータが不足しています。使用量: ${usedQuota}/${maxQuota}`);
    this.name = 'QuotaExceededError';
    this.usedQuota = usedQuota;
    this.maxQuota = maxQuota;
  }
}
