/**
 * マルチプラットフォーム認証 IPCハンドラー
 *
 * Instagram/LinkedIn等のマルチプラットフォーム認証管理のIPC通信を処理
 */

const { ipcMain } = require('electron');
const { multiPlatformAuthManager } = require('../services-init');

// ==========================================
// Multi-Platform Authentication Status
// ==========================================

// 全プラットフォームの認証状況を取得
ipcMain.handle('multi-auth-get-all-status', async (event) => {
  try {
    const status = multiPlatformAuthManager.getAllPlatformStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 特定プラットフォームの接続テスト
ipcMain.handle('multi-auth-test-platform-connection', async (event, platformName) => {
  try {
    const result = await multiPlatformAuthManager.testPlatformConnection(platformName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 全プラットフォームの接続テスト
ipcMain.handle('multi-auth-test-all-connections', async (event) => {
  try {
    const result = await multiPlatformAuthManager.testAllConnections();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Multi-Platform Configuration
// ==========================================

// 特定プラットフォームの認証情報を設定
ipcMain.handle('multi-auth-set-platform-credentials', async (event, platformName, credentials) => {
  try {
    const result = await multiPlatformAuthManager.setPlatformCredentials(platformName, credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラットフォーム認証情報をクリア
ipcMain.handle('multi-auth-clear-platform-credentials', async (event, platformName) => {
  try {
    const result = await multiPlatformAuthManager.clearPlatformCredentials(platformName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 全プラットフォーム認証情報をクリア
ipcMain.handle('multi-auth-clear-all-credentials', async (event) => {
  try {
    const result = await multiPlatformAuthManager.clearAllCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Multi-Platform Campaign & Reporting
// ==========================================

// 統合広告キャンペーン作成
ipcMain.handle('multi-auth-create-crossplatform-campaign', async (event, campaignConfig) => {
  try {
    const result = await multiPlatformAuthManager.createCrossplatformCampaign(campaignConfig);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 統合データ分析レポート生成
ipcMain.handle('multi-auth-generate-crossplatform-report', async (event) => {
  try {
    const result = await multiPlatformAuthManager.generateCrossplatformReport();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

module.exports = {};
