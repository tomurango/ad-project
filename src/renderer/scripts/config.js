/**
 * config.js
 *
 * グローバル設定とElectron API初期化
 * このファイルは最初に読み込まれる必要があります
 */

// ==================================================
// Electron API設定
// ==================================================

const { ipcRenderer } = require('electron');

// electronAPIオブジェクトを作成（既存のコードとの互換性のため）
window.electronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
};

console.log('✅ Electron API設定完了');

// プラットフォーム判定してクラスを追加
(async () => {
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      document.body.classList.add('platform-darwin');
      document.querySelector('.header').classList.add('platform-darwin');
    }
  } catch (error) {
    console.log('プラットフォーム判定エラー:', error);
  }
})();

// ==================================================
// グローバル変数
// ==================================================

// 認証関連
let currentUser = null;

// プロジェクト詳細関連
let currentProjectId = null;
let currentProjectData = null;
let allPosts = []; // 全投稿データ
let displayedPostsCount = 15; // 初期表示件数

// 定数
const INITIAL_POSTS_COUNT = 15; // 初期表示件数
const LOAD_MORE_COUNT = 20; // 追加読み込み件数

// 投稿アシスタント関連
let chatHistory = [];
let currentPostContext = '';
let editingPostId = null;
let editingPlanId = null;
let isComposing = false; // 日本語入力中フラグ
