/**
 * Bluesky関連 IPCハンドラー
 *
 * Bluesky API認証、投稿のIPC通信を処理
 */

const { ipcMain } = require('electron');

// サービスの初期化は後で行う（循環参照を避けるため）
let blueskyService = null;
let firebaseService = null;

/**
 * サービスを初期化
 * main.jsから呼び出される
 */
function initializeServices(services) {
  blueskyService = services.blueskyService;
  firebaseService = services.firebaseService;
}

// ==========================================
// Bluesky API Handlers (プロジェクト固有)
// ==========================================

// プロジェクトのBluesky設定を取得
ipcMain.handle('bluesky-get-project-config', async (event, { projectId }) => {
  try {
    const result = await firebaseService.getProjectBlueskyAuth(projectId);
    return {
      success: result.success,
      config: result.blueskyAuth,
      isConnected: result.isConnected,
      error: result.error
    };
  } catch (error) {
    console.error('❌ Bluesky設定取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのBluesky設定を保存
ipcMain.handle('bluesky-save-project-config', async (event, { projectId, config }) => {
  try {
    // 保存時に自動的にenabledフラグを追加
    const configWithEnabled = {
      ...config,
      enabled: true
    };
    const result = await firebaseService.saveProjectBlueskyAuth(projectId, configWithEnabled);
    return result;
  } catch (error) {
    console.error('❌ Bluesky設定保存エラー:', error);
    return { success: false, error: error.message };
  }
});

// Bluesky設定で接続テスト
ipcMain.handle('bluesky-test-config', async (event, config) => {
  try {
    const result = await blueskyService.testConnection({
      identifier: config.identifier,
      password: config.appPassword
    });

    return result;
  } catch (error) {
    console.error('❌ Bluesky接続テストエラー:', error);
    return { success: false, error: error.message };
  }
});

// Bluesky投稿を作成
ipcMain.handle('bluesky-create-post', async (event, { identifier, password, text, options }) => {
  try {
    // セッション作成
    const sessionResult = await blueskyService.createSession(identifier, password);
    if (!sessionResult.success) {
      return sessionResult;
    }

    // 投稿作成
    const postResult = await blueskyService.createPost(text, options);
    return postResult;

  } catch (error) {
    console.error('❌ Bluesky投稿作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのBluesky連携を解除
ipcMain.handle('bluesky-remove-project-auth', async (event, { projectId }) => {
  try {
    const result = await firebaseService.removeProjectBlueskyAuth(projectId);

    // サービスのセッションもクリア
    if (blueskyService) {
      blueskyService.clearSession();
    }

    return result;
  } catch (error) {
    console.error('❌ Bluesky連携解除エラー:', error);
    return { success: false, error: error.message };
  }
});

module.exports = { initializeServices };
