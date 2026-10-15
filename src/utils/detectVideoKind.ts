import type { VideoKind } from '../types';

export function detectVideoKind(url: string): VideoKind {
  if (/youtu\.be\/|youtube\.com\/(watch|embed|shorts)/i.test(url)) return 'youtube';
  if (/\.(mp4|webm|mov|m3u8|mkv|m4v)(\?|#|$)/i.test(url)) return 'direct';
  return 'other';
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}
