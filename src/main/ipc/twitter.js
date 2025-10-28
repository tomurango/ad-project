/**
 * Twitter/X関連 IPCハンドラー
 *
 * Twitter API認証、投稿、OAuth認証のIPC通信を処理
 */

const { ipcMain, shell } = require('electron');

// サービスの初期化は後で行う（循環参照を避けるため）
let twitterService = null;
let twitterOAuthService = null;
let firebaseService = null;

/**
 * サービスを初期化
 * main.jsから呼び出される
 */
function initializeServices(services) {
  twitterService = services.twitterService;
  twitterOAuthService = services.twitterOAuthService;
  firebaseService = services.firebaseService;
}

// ==========================================
// Twitter Basic API Handlers
// ==========================================

// Twitter API認証情報を設定
ipcMain.handle('twitter-set-credentials', async (event, credentials) => {
  try {
    const result = await twitterService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API認証情報の状態を取得
ipcMain.handle('twitter-get-status', async (event) => {
  try {
    const status = twitterService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API接続テスト
ipcMain.handle('twitter-test-connection', async (event) => {
  try {
    const result = await twitterService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ツイート投稿
ipcMain.handle('twitter-post-tweet', async (event, tweetText) => {
  try {
    const result = await twitterService.postTweet(tweetText);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API認証情報をクリア
ipcMain.handle('twitter-clear-credentials', async (event) => {
  try {
    const result = await twitterService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Twitter OAuth Handlers
// ==========================================

// Twitter OAuth 1.0a認証フロー開始
ipcMain.handle('twitter-oauth-start', async (event, { projectId, consumerKey, consumerSecret }) => {
  try {
    const result = await twitterOAuthService.startAuthFlow(projectId, consumerKey, consumerSecret);

    // ブラウザで認証URLを開く
    shell.openExternal(result.authUrl);

    return {
      success: true,
      message: 'Twitter認証画面を開きました。ブラウザで認証を完了してください。'
    };
  } catch (error) {
    console.error('❌ Twitter OAuth開始エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter認証情報を取得
ipcMain.handle('get-project-twitter-auth', async (event, { projectId }) => {
  try {
    const result = await firebaseService.getProjectTwitterAuth(projectId);
    return result;
  } catch (error) {
    console.error('❌ Twitter認証情報取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter連携を解除
ipcMain.handle('remove-project-twitter-auth', async (event, { projectId }) => {
  try {
    const result = await firebaseService.removeProjectTwitterAuth(projectId);
    return result;
  } catch (error) {
    console.error('❌ Twitter連携解除エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter設定を取得
ipcMain.handle('twitter-get-project-config', async (event, { projectId }) => {
  try {
    // まずプロジェクトのTwitter Basic Auth設定を取得
    const authResult = await firebaseService.getProjectTwitterAuth(projectId);

    return {
      success: authResult.success,
      config: authResult.twitterAuth,
      isConnected: authResult.isConnected,
      error: authResult.error
    };
  } catch (error) {
    console.error('❌ Twitter設定取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter設定を保存
ipcMain.handle('twitter-save-project-config', async (event, { projectId, config }) => {
  try {
    const result = await firebaseService.saveProjectTwitterAuth(projectId, config);
    console.log('✅ Twitter設定を保存しました');
    return result;
  } catch (error) {
    console.error('❌ Twitter設定保存エラー:', error);
    return { success: false, error: error.message };
  }
});

// Twitter設定で接続テスト
ipcMain.handle('twitter-test-config', async (event, config) => {
  try {
    // 一時的にtwitterServiceに設定を適用してテスト
    const result = await twitterService.testConnection({
      consumer_key: config.apiKey,
      consumer_secret: config.apiSecret,
      access_token_key: config.accessToken,
      access_token_secret: config.accessTokenSecret
    });

    return result;
  } catch (error) {
    console.error('❌ Twitter接続テストエラー:', error);
    return { success: false, error: error.message };
  }
});

module.exports = { initializeServices };
