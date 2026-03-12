/**
 * YouTube分析 フロントエンド統合スクリプト
 * ElectronのIPCを介してYouTube Data API機能を提供
 */

class YouTubeFrontend {
  constructor() {
    this.isConfigured = false;
    this.status = null;
    this.currentChannelAnalysis = null;
    this.searchResults = [];
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('🚀 YouTube分析 フロントエンド初期化開始');
      
      // 認証状態をチェック
      await this.refreshStatus();
      
      console.log('✅ YouTube分析 フロントエンド初期化完了');
    } catch (error) {
      console.error('❌ YouTube分析 フロントエンド初期化エラー:', error);
    }
  }

  /**
   * 認証状態を更新
   */
  async refreshStatus() {
    try {
      const result = await window.electronAPI.invoke('youtube-data-get-status');
      
      if (result.success) {
        this.status = result.status;
        this.isConfigured = result.status.isConfigured;
        this.updateStatusUI();
        console.log('📊 YouTube Data API 認証状態:', this.status);
      } else {
        console.error('❌ YouTube Data API 認証状態取得失敗:', result.error);
      }
    } catch (error) {
      console.error('❌ YouTube Data API 認証状態更新エラー:', error);
    }
  }

  /**
   * 認証情報を保存
   */
  async saveCredentials(credentials) {
    try {
      console.log('💾 YouTube Data API 認証情報保存開始');
      
      const result = await window.electronAPI.invoke('youtube-data-set-credentials', credentials);
      
      if (result.success) {
        console.log('✅ YouTube Data API 認証情報保存成功');
        await this.refreshStatus();
        alert('✅ YouTube Data API認証情報を保存しました！');
        return result;
      } else {
        console.error('❌ YouTube Data API 認証情報保存失敗:', result.error);
        alert(`❌ 認証情報保存エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ YouTube Data API 認証情報保存エラー:', error);
      alert(`❌ 認証情報保存エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 接続テスト
   */
  async testConnection() {
    try {
      console.log('🔗 YouTube Data API 接続テスト開始');
      
      const result = await window.electronAPI.invoke('youtube-data-test-connection');
      
      if (result.success) {
        console.log('✅ YouTube Data API 接続テスト成功');
        alert('✅ YouTube Data API に正常に接続できました！');
        return result;
      } else {
        console.error('❌ YouTube Data API 接続テスト失敗:', result.error);
        alert(`❌ 接続テストエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ YouTube Data API 接続テストエラー:', error);
      alert(`❌ 接続テストエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 認証情報をクリア
   */
  async clearCredentials() {
    try {
      if (!confirm('YouTube Data API認証情報を削除しますか？')) {
        return;
      }

      console.log('🗑️ YouTube Data API 認証情報クリア開始');
      
      const result = await window.electronAPI.invoke('youtube-data-clear-credentials');
      
      if (result.success) {
        console.log('✅ YouTube Data API 認証情報クリア成功');
        await this.refreshStatus();
        this.clearCredentialsForm();
        alert('✅ YouTube Data API認証情報をクリアしました！');
        return result;
      } else {
        console.error('❌ YouTube Data API 認証情報クリア失敗:', result.error);
        alert(`❌ 認証情報クリアエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ YouTube Data API 認証情報クリアエラー:', error);
      alert(`❌ 認証情報クリアエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * チャンネル分析を実行
   */
  async analyzeChannel(channelId) {
    try {
      if (!this.isConfigured) {
        alert('❌ YouTube Data API認証情報が設定されていません。');
        return;
      }

      if (!channelId) {
        alert('❌ チャンネルIDを入力してください。');
        return;
      }

      console.log('📊 チャンネル分析開始:', channelId);
      
      const result = await window.electronAPI.invoke('youtube-data-analyze-channel', channelId);
      
      if (result.success) {
        this.currentChannelAnalysis = result.data;
        this.updateChannelAnalysisUI();
        console.log('✅ チャンネル分析完了');
        return result;
      } else {
        console.error('❌ チャンネル分析失敗:', result.error);
        alert(`❌ チャンネル分析エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ チャンネル分析エラー:', error);
      alert(`❌ チャンネル分析エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 動画検索を実行
   */
  async searchVideos(query, maxResults = 10) {
    try {
      if (!this.isConfigured) {
        alert('❌ YouTube Data API認証情報が設定されていません。');
        return;
      }

      if (!query) {
        alert('❌ 検索キーワードを入力してください。');
        return;
      }

      console.log('🔍 動画検索開始:', query);
      
      const result = await window.electronAPI.invoke('youtube-data-search-videos', query, maxResults, {});
      
      if (result.success) {
        this.searchResults = result.data;
        this.updateSearchResultsUI();
        console.log('✅ 動画検索完了:', this.searchResults.length, '件');
        return result;
      } else {
        console.error('❌ 動画検索失敗:', result.error);
        alert(`❌ 動画検索エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ 動画検索エラー:', error);
      alert(`❌ 動画検索エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 認証状態UIを更新
   */
  updateStatusUI() {
    const statusElement = document.getElementById('youtubeStatus');
    if (!statusElement) return;

    if (this.isConfigured) {
      statusElement.innerHTML = `
        <div class="status-indicator">🟢 設定済み</div>
        <div>YouTube Data API認証情報が設定されています</div>
        ${this.status.quotaPercentUsed !== undefined ? 
          `<div style="font-size: 14px; color: #657786; margin-top: 5px;">
            クォータ使用率: ${this.status.quotaPercentUsed}% (${this.status.quotaUsed}/${this.status.quotaRemaining + this.status.quotaUsed} units)
          </div>` : ''
        }
      `;
      statusElement.style.background = '#d4edda';
      statusElement.style.borderColor = '#c3e6cb';
    } else {
      statusElement.innerHTML = `
        <div class="status-indicator">🔴 未設定</div>
        <div>YouTube Data API認証情報が設定されていません</div>
      `;
      statusElement.style.background = '#f8d7da';
      statusElement.style.borderColor = '#f5c6cb';
    }
  }

  /**
   * チャンネル分析結果UIを更新
   */
  updateChannelAnalysisUI() {
    const analysisElement = document.getElementById('channelAnalysis');
    if (!analysisElement || !this.currentChannelAnalysis) return;

    const { channel, recentVideos, analytics, insights } = this.currentChannelAnalysis;
    const thumbnailUrl = channel.thumbnails?.default?.url || '';

    let html = `
      <div class="channel-card">
        <div class="channel-header">
          ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${channel.title}" class="channel-thumbnail">` : '<div class="channel-thumbnail" style="background: #e1e8ed; display: flex; align-items: center; justify-content: center; font-size: 24px;">📺</div>'}
          <div class="channel-info">
            <h3>${channel.title}</h3>
            <p style="color: #657786; margin: 0;">${channel.description ? channel.description.substring(0, 100) + '...' : 'チャンネル説明なし'}</p>
          </div>
        </div>

        <div class="channel-stats">
          <div class="stat-item">
            <div class="stat-value">${this.formatNumber(channel.statistics.subscriberCount)}</div>
            <div class="stat-label">登録者数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.formatNumber(channel.statistics.viewCount)}</div>
            <div class="stat-label">総再生回数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.formatNumber(channel.statistics.videoCount)}</div>
            <div class="stat-label">動画数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.formatNumber(analytics.averageViews)}</div>
            <div class="stat-label">平均再生回数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${analytics.engagementRate}%</div>
            <div class="stat-label">エンゲージメント率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${analytics.uploadsPerMonth}</div>
            <div class="stat-label">月間投稿数</div>
          </div>
        </div>

        ${insights && insights.length > 0 ? `
          <div style="margin-top: 20px;">
            <h4>💡 インサイト</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${insights.map(insight => `<li style="margin: 5px 0; color: #657786;">${insight}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>

      ${recentVideos && recentVideos.length > 0 ? `
        <div class="channel-card">
          <h4>📹 最新動画 (${recentVideos.length}件)</h4>
          <div class="video-list">
            ${recentVideos.map(video => `
              <div class="video-item">
                ${video.thumbnails?.default?.url ? 
                  `<img src="${video.thumbnails.default.url}" alt="${video.title}" class="video-thumbnail">` :
                  '<div class="video-thumbnail" style="background: #e1e8ed; display: flex; align-items: center; justify-content: center; font-size: 18px;">📹</div>'
                }
                <div class="video-info">
                  <h5 class="video-title">${video.title}</h5>
                  <div class="video-stats">
                    再生回数: ${this.formatNumber(video.statistics.viewCount)} | 
                    いいね: ${this.formatNumber(video.statistics.likeCount)} | 
                    コメント: ${this.formatNumber(video.statistics.commentCount)}
                  </div>
                  <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    投稿日: ${new Date(video.publishedAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    analysisElement.innerHTML = html;
  }

  /**
   * 検索結果UIを更新
   */
  updateSearchResultsUI() {
    const resultsElement = document.getElementById('searchResults');
    if (!resultsElement) return;

    if (this.searchResults.length === 0) {
      resultsElement.innerHTML = `
        <div class="empty-state">
          <p>🔍 検索結果が見つかりませんでした</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="channel-card">
        <h4>🔍 検索結果 (${this.searchResults.length}件)</h4>
        <div class="video-list">
          ${this.searchResults.map(video => `
            <div class="video-item">
              ${video.thumbnails?.default?.url ? 
                `<img src="${video.thumbnails.default.url}" alt="${video.title}" class="video-thumbnail">` :
                '<div class="video-thumbnail" style="background: #e1e8ed; display: flex; align-items: center; justify-content: center; font-size: 18px;">📹</div>'
              }
              <div class="video-info">
                <h5 class="video-title">${video.title}</h5>
                <div class="video-stats">
                  チャンネル: ${video.channelTitle} | 
                  再生回数: ${this.formatNumber(video.statistics.viewCount)} | 
                  いいね: ${this.formatNumber(video.statistics.likeCount)}
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">
                  投稿日: ${new Date(video.publishedAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    resultsElement.innerHTML = html;
  }

  /**
   * 数値をフォーマット
   */
  formatNumber(num) {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    } else {
      return number.toLocaleString();
    }
  }

  /**
   * 認証情報フォームをクリア
   */
  clearCredentialsForm() {
    const field = document.getElementById('youtubeApiKey');
    if (field) field.value = '';
  }
}

// グローバルインスタンス
const youtubeFrontend = new YouTubeFrontend();

// グローバル関数として公開
window.saveYouTubeCredentials = async function() {
  const credentials = {
    apiKey: document.getElementById('youtubeApiKey').value.trim()
  };

  if (!credentials.apiKey) {
    alert('❌ YouTube Data API Keyを入力してください。');
    return;
  }

  await youtubeFrontend.saveCredentials(credentials);
};

window.testYouTubeConnection = async function() {
  await youtubeFrontend.testConnection();
};

window.clearYouTubeCredentials = async function() {
  await youtubeFrontend.clearCredentials();
};

window.analyzeChannel = async function() {
  const channelId = document.getElementById('channelId').value.trim();
  await youtubeFrontend.analyzeChannel(channelId);
};

window.searchVideos = async function() {
  const query = document.getElementById('searchQuery').value.trim();
  await youtubeFrontend.searchVideos(query);
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  youtubeFrontend.initialize();
});