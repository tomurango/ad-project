/**
 * YouTube Data API関連 IPCハンドラー
 *
 * YouTube Data API認証、チャンネル・動画情報取得のIPC通信を処理
 */

const { ipcMain } = require('electron');
const { youtubeDataService } = require('../services-init');

// ==========================================
// YouTube Configuration
// ==========================================

// YouTube Data API認証情報を設定
ipcMain.handle('youtube-data-set-credentials', async (event, credentials) => {
  try {
    const result = await youtubeDataService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API設定状況を取得
ipcMain.handle('youtube-data-get-status', async (event) => {
  try {
    const status = youtubeDataService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API接続テスト
ipcMain.handle('youtube-data-test-connection', async (event) => {
  try {
    const result = await youtubeDataService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API認証情報をクリア
ipcMain.handle('youtube-data-clear-credentials', async (event) => {
  try {
    const result = await youtubeDataService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// YouTube Data API
// ==========================================

// チャンネル情報を取得
ipcMain.handle('youtube-data-get-channel-info', async (event, channelId) => {
  try {
    const result = await youtubeDataService.getChannelInfo(channelId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 動画情報を取得
ipcMain.handle('youtube-data-get-video-info', async (event, videoIds) => {
  try {
    const result = await youtubeDataService.getVideoInfo(videoIds);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// チャンネルの動画一覧を取得
ipcMain.handle('youtube-data-get-channel-videos', async (event, channelId, maxResults) => {
  try {
    const result = await youtubeDataService.getChannelVideos(channelId, maxResults);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 動画を検索
ipcMain.handle('youtube-data-search-videos', async (event, query, maxResults, options) => {
  try {
    const result = await youtubeDataService.searchVideos(query, maxResults, options);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// チャンネルを分析
ipcMain.handle('youtube-data-analyze-channel', async (event, channelId) => {
  try {
    const result = await youtubeDataService.analyzeChannel(channelId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

module.exports = {};
