/**
 * YouTube関連のユーティリティ関数
 */

/**
 * YouTubeのURLから動画IDを抽出する
 * @param url YouTube動画のURL
 * @returns 動画ID、抽出できない場合はnull
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  // YouTube URL のパターン
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * YouTube動画IDからサムネイル画像のURLを生成する
 * @param videoId YouTube動画ID
 * @param quality 画質 ('maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault')
 * @returns サムネイル画像のURL
 */
export const getYouTubeThumbnailUrl = (
  videoId: string,
  quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' = 'hqdefault'
): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * YouTube動画のURLから直接サムネイルURLを取得する
 * @param url YouTube動画のURL
 * @param quality 画質
 * @returns サムネイル画像のURL、動画IDが抽出できない場合はnull
 */
export const getYouTubeThumbnailFromUrl = (
  url: string,
  quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' = 'hqdefault'
): string | null => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return getYouTubeThumbnailUrl(videoId, quality);
};
