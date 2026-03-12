/**
 * サービス初期化モジュール
 *
 * 各種サービス（Firebase、Twitter、Google Ads等）の初期化を管理
 */

const OllamaService = require('../services/ollama-service');
const aiServiceManager = require('../services/ai-service-manager');
const firebaseService = require('../services/firebase-service');
const twitterService = require('../services/twitter-service');
const twitterOAuthService = require('../services/twitter-oauth-service');
const { getBlueskyService } = require('../services/bluesky-service');
const googleAdsService = require('../services/google-ads-service');
const youtubeDataService = require('../services/youtube-data-service');
const multiPlatformAuthManager = require('../services/multi-platform-auth-manager');
const MigrationService = require('../services/migration-service');
const http = require('http');

// Ollama Service初期化
const ollamaService = new OllamaService();

// Bluesky Service初期化
const blueskyService = getBlueskyService();

// Migration Service（Firebase初期化後に設定）
let migrationService;

// Twitter OAuth コールバックサーバー
let callbackServer = null;

/**
 * Firebase設定を環境変数から構築
 */
function getFirebaseConfigFromEnv() {
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "ad-project-64e9b.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "ad-project-64e9b",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ad-project-64e9b.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "774397013456",
    appId: process.env.FIREBASE_APP_ID || "1:774397013456:web:a123456789abcdef"
  };
}

/**
 * Firebase Service初期化
 */
async function initializeFirebase() {
  try {
    // 環境変数からFirebase設定を取得
    const firebaseConfig = getFirebaseConfigFromEnv();

    if (!firebaseConfig.apiKey) {
      throw new Error('FIREBASE_API_KEY が .env ファイルに設定されていません');
    }

    // firebase-config.jsに設定を送信
    const configModule = require('../../config/firebase-config');
    configModule.setFirebaseConfig(firebaseConfig);

    const result = await firebaseService.initialize();
    if (result.success) {
      console.log('✅ Firebase サービス初期化完了');

      // Firebase初期化後にMigrationServiceを初期化
      migrationService = new MigrationService(firebaseService);
      console.log('✅ Migration サービス初期化完了');
    } else {
      console.error('❌ Firebase サービス初期化失敗:', result.error);
    }
  } catch (error) {
    console.error('❌ Firebase 初期化エラー:', error);
  }
}

/**
 * Twitter Service初期化
 */
async function initializeTwitter() {
  try {
    const result = await twitterService.initialize();
    if (result.success) {
      console.log('✅ Twitter サービス初期化完了');
    } else {
      console.log('ℹ️ Twitter サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ Twitter 初期化エラー:', error);
  }
}

/**
 * Google Ads Service初期化
 */
async function initializeGoogleAds() {
  try {
    const result = await googleAdsService.initialize();
    if (result.success) {
      console.log('✅ Google Ads サービス初期化完了');
    } else {
      console.log('ℹ️ Google Ads サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ Google Ads 初期化エラー:', error);
  }
}

/**
 * YouTube Data Service初期化
 */
async function initializeYouTubeData() {
  try {
    const result = await youtubeDataService.initialize();
    if (result.success) {
      console.log('✅ YouTube Data サービス初期化完了');
    } else {
      console.log('ℹ️ YouTube Data サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ YouTube Data 初期化エラー:', error);
  }
}

/**
 * マルチプラットフォーム認証管理初期化
 */
async function initializeMultiPlatformAuth() {
  try {
    const result = await multiPlatformAuthManager.initialize();
    if (result.success) {
      console.log('✅ マルチプラットフォーム認証管理初期化完了');
    } else {
      console.log('ℹ️ マルチプラットフォーム認証管理初期化:', result.error);
    }
  } catch (error) {
    console.error('❌ マルチプラットフォーム認証管理初期化エラー:', error);
  }
}

/**
 * 全サービスの初期化
 */
async function initializeAllServices() {
  console.log('🚀 サービス初期化を開始...');

  await initializeFirebase();
  await initializeTwitter();
  await initializeGoogleAds();
  await initializeYouTubeData();
  await initializeMultiPlatformAuth();

  console.log('✅ 全サービスの初期化完了');
}

/**
 * サービスインスタンスをエクスポート
 */
module.exports = {
  // サービスインスタンス
  ollamaService,
  aiServiceManager,
  firebaseService,
  twitterService,
  twitterOAuthService,
  blueskyService,
  googleAdsService,
  youtubeDataService,
  multiPlatformAuthManager,
  getMigrationService: () => migrationService,

  // 初期化関数
  initializeAllServices,
  initializeFirebase,
  initializeTwitter,
  initializeGoogleAds,
  initializeYouTubeData,
  initializeMultiPlatformAuth,

  // OAuth サーバー
  callbackServer,
  setCallbackServer: (server) => { callbackServer = server; },
  getCallbackServer: () => callbackServer
};
