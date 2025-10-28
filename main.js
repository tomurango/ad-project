/**
 * Electronメインプロセス
 *
 * モジュール化されたアーキテクチャ:
 * - サービス初期化: src/main/services-init.js
 * - ウィンドウ管理: src/main/window.js
 * - IPCハンドラー: src/main/ipc/*.js
 */

const { app, BrowserWindow } = require('electron');
const http = require('http');

// Load environment variables
require('dotenv').config();

// ==========================================
// モジュールのインポート
// ==========================================

// ウィンドウ管理
const { createWindow } = require('./src/main/window');

// サービス初期化
const {
  initializeAllServices,
  ollamaService,
  aiServiceManager,
  firebaseService,
  twitterService,
  twitterOAuthService,
  blueskyService,
  googleAdsService,
  youtubeDataService,
  multiPlatformAuthManager,
  getMigrationService,
  setCallbackServer
} = require('./src/main/services-init');

// IPCハンドラー（サービス初期化後に設定）
const authIPC = require('./src/main/ipc/auth');
const aiIPC = require('./src/main/ipc/ai');
const firestoreIPC = require('./src/main/ipc/firestore');
const twitterIPC = require('./src/main/ipc/twitter');
const blueskyIPC = require('./src/main/ipc/bluesky');
const googleAdsIPC = require('./src/main/ipc/google-ads');
const youtubeIPC = require('./src/main/ipc/youtube');
const platformsIPC = require('./src/main/ipc/platforms');
const systemIPC = require('./src/main/ipc/system');

// ==========================================
// Twitter OAuth コールバックサーバー
// ==========================================

/**
 * Twitter OAuth 1.0a コールバックサーバーを起動
 *
 * ブラウザからの認証コールバックを受け取り、
 * アクセストークンを取得してFirestoreに保存
 */
function startTwitterOAuthCallbackServer() {
  const callbackServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8888');

    if (url.pathname === '/twitter-callback') {
      const oauthToken = url.searchParams.get('oauth_token');
      const oauthVerifier = url.searchParams.get('oauth_verifier');
      const sessionId = url.searchParams.get('session_id');

      if (!oauthToken || !oauthVerifier || !sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>認証エラー</h1><p>必要なパラメータが不足しています</p>');
        return;
      }

      try {
        // Access Token取得
        const result = await twitterOAuthService.handleCallback(sessionId, oauthToken, oauthVerifier);

        // Firestoreに保存
        const saveResult = await firebaseService.saveProjectTwitterAuth(
          result.projectId,
          result.credentials
        );

        if (saveResult.success) {
          // 成功画面を表示
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head>
                <title>Twitter認証成功</title>
                <style>
                  body { font-family: sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #1DA1F2; }
                  .success { color: #17BF63; font-size: 48px; }
                  .info { margin-top: 20px; color: #666; }
                </style>
              </head>
              <body>
                <div class="success">✓</div>
                <h1>Twitter連携成功！</h1>
                <p class="info">@${result.credentials.username} として連携しました</p>
                <p class="info">このウィンドウを閉じて、アプリに戻ってください</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `);

          console.log('✅ Twitter認証完了 & Firestore保存成功');
        } else {
          throw new Error(saveResult.error);
        }
      } catch (error) {
        console.error('❌ Twitter認証処理エラー:', error);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head>
              <title>Twitter認証エラー</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                h1 { color: #E0245E; }
                .error { color: #E0245E; font-size: 48px; }
              </style>
            </head>
            <body>
              <div class="error">✗</div>
              <h1>Twitter認証エラー</h1>
              <p>${error.message}</p>
              <p>このウィンドウを閉じて、再度お試しください</p>
            </body>
          </html>
        `);
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  callbackServer.listen(8888, '127.0.0.1', () => {
    console.log('✅ Twitter OAuthコールバックサーバー起動: http://127.0.0.1:8888');
  });

  callbackServer.on('error', (error) => {
    console.error('❌ コールバックサーバーエラー:', error);
  });

  // サーバーインスタンスを保存
  setCallbackServer(callbackServer);
}

// ==========================================
// アプリケーションライフサイクル
// ==========================================

/**
 * アプリ起動時の初期化
 */
app.whenReady().then(async () => {
  // ウィンドウ作成
  createWindow();

  // 全サービス初期化
  await initializeAllServices();

  // IPCハンドラーにサービスを注入
  if (aiIPC.initializeServices) {
    aiIPC.initializeServices({
      ollamaService,
      aiServiceManager,
      firebaseService
    });
  }

  if (firestoreIPC.initializeServices) {
    firestoreIPC.initializeServices({
      firebaseService,
      aiServiceManager,
      migrationService: getMigrationService()
    });
  }

  if (twitterIPC.initializeServices) {
    twitterIPC.initializeServices({
      twitterService,
      twitterOAuthService,
      firebaseService
    });
  }

  if (blueskyIPC.initializeServices) {
    blueskyIPC.initializeServices({
      blueskyService,
      firebaseService
    });
  }

  // Twitter OAuthコールバックサーバー起動
  startTwitterOAuthCallbackServer();
});

/**
 * 全ウィンドウが閉じられた時
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * アクティベーション時（macOS）
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
