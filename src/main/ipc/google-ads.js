/**
 * Google Ads関連 IPCハンドラー
 *
 * Google Ads API認証、キャンペーン管理のIPC通信を処理
 */

const { ipcMain } = require('electron');
const googleAdsService = require('../../services/google-ads-service');

// ==========================================
// Google Ads Configuration
// ==========================================

// Google Ads API認証情報を設定
ipcMain.handle('google-ads-set-credentials', async (event, credentials) => {
  try {
    const result = await googleAdsService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API設定状況を取得
ipcMain.handle('google-ads-get-status', async (event) => {
  try {
    const status = googleAdsService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API接続テスト
ipcMain.handle('google-ads-test-connection', async (event) => {
  try {
    const result = await googleAdsService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API認証情報をクリア
ipcMain.handle('google-ads-clear-credentials', async (event) => {
  try {
    const result = await googleAdsService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Google Ads Campaign Management
// ==========================================

// Performance Max Campaign作成
ipcMain.handle('google-ads-create-performance-max', async (event, config) => {
  try {
    const result = await googleAdsService.createPerformanceMaxCampaign(config);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Demand Gen Campaign作成
ipcMain.handle('google-ads-create-demand-gen', async (event, config) => {
  try {
    const result = await googleAdsService.createDemandGenCampaign(config);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// キャンペーンの一時停止・再開
ipcMain.handle('google-ads-pause-resume-campaign', async (event, campaignId, action) => {
  try {
    const result = await googleAdsService.pauseOrResumeCampaign(campaignId, action);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// キャンペーン一覧取得
ipcMain.handle('google-ads-get-campaigns', async (event) => {
  try {
    const result = await googleAdsService.getCampaigns();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

module.exports = {};
