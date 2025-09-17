import { FileMismatchError } from '@/types/upload-errors';

// エラーハンドリングヘルパー
export class ErrorHandler {
  /**
   * FileMismatchErrorを安全に処理し、Next.jsのエラーハンドリングシステムでキャッチされないようにする
   */
  static handleFileMismatchError(error: Error, onFileMismatch?: (error: FileMismatchError) => void): boolean {
    if (error.name === 'FileMismatchError' || error.constructor.name === 'FileMismatchError') {
      // エラーをconsole.errorに出力しないようにし、カスタムハンドラに渡す
      if (onFileMismatch) {
        // Next.jsのエラーバウンダリーをバイパスするため、非同期で処理
        setTimeout(() => {
          onFileMismatch(error as FileMismatchError);
        }, 0);
      }
      return true; // エラーが処理されたことを示す
    }
    return false; // 他のエラーは通常通り処理
  }

  /**
   * エラーを適切にキャッチし、分類する
   */
  static async safeAsyncCall<T>(
    asyncFn: () => Promise<T>,
    onFileMismatch?: (error: FileMismatchError) => void,
    onOtherError?: (error: Error) => void
  ): Promise<T | null> {
    try {
      return await asyncFn();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      // FileMismatchErrorの特別処理
      if (this.handleFileMismatchError(err, onFileMismatch)) {
        return null;
      }

      // その他のエラー処理
      if (onOtherError) {
        onOtherError(err);
      } else {
        throw err; // 処理されなかったエラーは再スロー
      }
      return null;
    }
  }
}
