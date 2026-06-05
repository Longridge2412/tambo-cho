/**
 * 画面が再表示されたとき(バックグラウンド → フォアグラウンド)に
 * onRefresh を呼ぶフック。
 *
 *   - 連打防止: 最後の呼出しから minIntervalMs 経過していなければスキップ
 *   - PWAで一旦バックグラウンドに行って戻ってきたとき、最新データが見える
 *   - 画面を閉じている間は通信しない(バッテリー・通信量に優しい)
 */

const { useEffect, useRef } = React;

export function useVisibilityRefresh(onRefresh, minIntervalMs = 60000) {
  const lastRef = useRef(Date.now());
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRef.current < minIntervalMs) return;
      lastRef.current = now;
      try { onRefresh(); } catch (e) { console.warn('visibility refresh error:', e); }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [onRefresh, minIntervalMs]);
}
