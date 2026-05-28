/**
 * 「あなた」の現在の選択(localStorage 永続化)
 *
 * 各画面で「あなた」を一度選ぶと、次回以降は記憶される。
 * 端末ごとに別個に持つので、家族で共有端末を使う場合は適宜選び直す。
 */

const KEY = 'tambo_current_user';

export function getCurrentUser() {
  try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
}

export function setCurrentUser(id) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch (e) {}
}
