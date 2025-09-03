/**
 * Google Ads フロントエンド統合スクリプト
 * ElectronのIPCを介してGoogle Ads API機能を提供
 */

class GoogleAdsFrontend {
  constructor() {
    this.isConfigured = false;
    this.status = null;
    this.campaigns = [];
    this.lastRefresh = null;
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('🚀 Google Ads フロントエンド初期化開始');
      
      // 認証状態をチェック
      await this.refreshStatus();
      
      console.log('✅ Google Ads フロントエンド初期化完了');
    } catch (error) {
      console.error('❌ Google Ads フロントエンド初期化エラー:', error);
    }
  }

  /**
   * 認証状態を更新
   */
  async refreshStatus() {
    try {
      const result = await window.electronAPI.invoke('google-ads-get-status');
      
      if (result.success) {
        this.status = result.status;
        this.isConfigured = result.status.isConfigured;
        this.updateStatusUI();
        console.log('📊 Google Ads 認証状態:', this.status);
      } else {
        console.error('❌ Google Ads 認証状態取得失敗:', result.error);
      }
    } catch (error) {
      console.error('❌ Google Ads 認証状態更新エラー:', error);
    }
  }

  /**
   * 認証情報を保存
   */
  async saveCredentials(credentials) {
    try {
      console.log('💾 Google Ads 認証情報保存開始');
      
      const result = await window.electronAPI.invoke('google-ads-set-credentials', credentials);
      
      if (result.success) {
        console.log('✅ Google Ads 認証情報保存成功');
        await this.refreshStatus();
        alert('✅ Google Ads API認証情報を保存しました！');
        return result;
      } else {
        console.error('❌ Google Ads 認証情報保存失敗:', result.error);
        alert(`❌ 認証情報保存エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ Google Ads 認証情報保存エラー:', error);
      alert(`❌ 認証情報保存エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 接続テスト
   */
  async testConnection() {
    try {
      console.log('🔗 Google Ads API 接続テスト開始');
      
      const result = await window.electronAPI.invoke('google-ads-test-connection');
      
      if (result.success) {
        console.log('✅ Google Ads API 接続テスト成功');
        alert('✅ Google Ads API に正常に接続できました！');
        return result;
      } else {
        console.error('❌ Google Ads API 接続テスト失敗:', result.error);
        alert(`❌ 接続テストエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ Google Ads API 接続テストエラー:', error);
      alert(`❌ 接続テストエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 認証情報をクリア
   */
  async clearCredentials() {
    try {
      if (!confirm('Google Ads API認証情報を削除しますか？')) {
        return;
      }

      console.log('🗑️ Google Ads 認証情報クリア開始');
      
      const result = await window.electronAPI.invoke('google-ads-clear-credentials');
      
      if (result.success) {
        console.log('✅ Google Ads 認証情報クリア成功');
        await this.refreshStatus();
        this.clearCredentialsForm();
        alert('✅ Google Ads API認証情報をクリアしました！');
        return result;
      } else {
        console.error('❌ Google Ads 認証情報クリア失敗:', result.error);
        alert(`❌ 認証情報クリアエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ Google Ads 認証情報クリアエラー:', error);
      alert(`❌ 認証情報クリアエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * キャンペーン一覧を取得
   */
  async refreshCampaigns() {
    try {
      if (!this.isConfigured) {
        alert('❌ Google Ads API認証情報が設定されていません。');
        return;
      }

      console.log('📋 キャンペーン一覧取得開始');
      
      const result = await window.electronAPI.invoke('google-ads-get-campaigns');
      
      if (result.success) {
        this.campaigns = result.campaigns || [];
        this.lastRefresh = new Date();
        this.updateCampaignsUI();
        console.log('✅ キャンペーン一覧取得成功:', this.campaigns.length, '件');
        return result;
      } else {
        console.error('❌ キャンペーン一覧取得失敗:', result.error);
        alert(`❌ キャンペーン一覧取得エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ キャンペーン一覧取得エラー:', error);
      alert(`❌ キャンペーン一覧取得エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Performance Max キャンペーンを作成
   */
  async createCampaign(config) {
    try {
      if (!this.isConfigured) {
        alert('❌ Google Ads API認証情報が設定されていません。');
        return;
      }

      console.log('🎯 キャンペーン作成開始:', config);
      
      let result;
      if (config.type === 'PERFORMANCE_MAX') {
        result = await window.electronAPI.invoke('google-ads-create-performance-max', config);
      } else if (config.type === 'DEMAND_GEN') {
        result = await window.electronAPI.invoke('google-ads-create-demand-gen', config);
      } else {
        throw new Error(`サポートされていないキャンペーンタイプ: ${config.type}`);
      }
      
      if (result.success) {
        console.log('✅ キャンペーン作成成功:', result.campaignId);
        alert(`✅ ${config.type} キャンペーンを作成しました！`);
        await this.refreshCampaigns(); // キャンペーン一覧を更新
        return result;
      } else {
        console.error('❌ キャンペーン作成失敗:', result.error);
        alert(`❌ キャンペーン作成エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ キャンペーン作成エラー:', error);
      alert(`❌ キャンペーン作成エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * キャンペーンを一時停止/再開
   */
  async pauseResumeCampaign(campaignId, action) {
    try {
      if (!this.isConfigured) {
        alert('❌ Google Ads API認証情報が設定されていません。');
        return;
      }

      const actionText = action === 'PAUSED' ? '一時停止' : '再開';
      console.log(`⏸️ キャンペーン${actionText}開始:`, campaignId);
      
      const result = await window.electronAPI.invoke('google-ads-pause-resume-campaign', campaignId, action);
      
      if (result.success) {
        console.log(`✅ キャンペーン${actionText}成功`);
        alert(`✅ キャンペーンを${actionText}しました！`);
        await this.refreshCampaigns(); // キャンペーン一覧を更新
        return result;
      } else {
        console.error(`❌ キャンペーン${actionText}失敗:`, result.error);
        alert(`❌ キャンペーン${actionText}エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error(`❌ キャンペーン${actionText}エラー:`, error);
      alert(`❌ キャンペーン${actionText}エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 認証状態UIを更新
   */
  updateStatusUI() {
    const statusElement = document.getElementById('googleAdsStatus');
    if (!statusElement) return;

    if (this.isConfigured) {
      statusElement.innerHTML = `
        <div class="status-indicator">🟢 設定済み</div>
        <div>Google Ads API認証情報が設定されています</div>
      `;
      statusElement.style.background = '#d4edda';
      statusElement.style.borderColor = '#c3e6cb';
    } else {
      statusElement.innerHTML = `
        <div class="status-indicator">🔴 未設定</div>
        <div>Google Ads API認証情報が設定されていません</div>
      `;
      statusElement.style.background = '#f8d7da';
      statusElement.style.borderColor = '#f5c6cb';
    }
  }

  /**
   * キャンペーン一覧UIを更新
   */
  updateCampaignsUI() {
    const listElement = document.getElementById('campaignsList');
    if (!listElement) return;

    if (this.campaigns.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <p>📋 キャンペーンが見つかりませんでした</p>
          <p style="font-size: 14px; color: #657786;">新しいキャンペーンを作成するか、認証情報を確認してください</p>
        </div>
      `;
      return;
    }

    let html = '';
    this.campaigns.forEach(campaign => {
      const status = campaign.campaign?.status || 'UNKNOWN';
      const statusClass = status === 'ENABLED' ? 'connected' : status === 'PAUSED' ? 'unconfigured' : 'disconnected';
      const statusText = status === 'ENABLED' ? '有効' : status === 'PAUSED' ? '一時停止' : status;

      html += `
        <div class="campaign-item">
          <div class="campaign-info">
            <h4>${campaign.campaign?.name || 'キャンペーン名不明'}</h4>
            <p>ID: ${campaign.campaign?.id || 'N/A'} | タイプ: ${campaign.campaign?.advertisingChannelType || 'N/A'}</p>
            <p>インプレッション: ${campaign.metrics?.impressions || 0} | クリック: ${campaign.metrics?.clicks || 0}</p>
          </div>
          <div class="campaign-actions">
            <span class="platform-status ${statusClass}">${statusText}</span>
            ${status === 'ENABLED' ? 
              `<button class="btn btn-secondary" onclick="googleAdsFrontend.pauseResumeCampaign('${campaign.campaign?.resourceName}', 'PAUSED')">一時停止</button>` :
              `<button class="btn btn-success" onclick="googleAdsFrontend.pauseResumeCampaign('${campaign.campaign?.resourceName}', 'ENABLED')">再開</button>`
            }
          </div>
        </div>
      `;
    });

    listElement.innerHTML = html;
  }

  /**
   * 認証情報フォームをクリア
   */
  clearCredentialsForm() {
    const fields = ['googleAdsClientId', 'googleAdsClientSecret', 'googleAdsRefreshToken', 'googleAdsCustomerId'];
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.value = '';
    });
  }
}

// グローバルインスタンス
const googleAdsFrontend = new GoogleAdsFrontend();

// グローバル関数として公開
window.saveGoogleAdsCredentials = async function() {
  const credentials = {
    clientId: document.getElementById('googleAdsClientId').value.trim(),
    clientSecret: document.getElementById('googleAdsClientSecret').value.trim(),
    refreshToken: document.getElementById('googleAdsRefreshToken').value.trim(),
    customerID: document.getElementById('googleAdsCustomerId').value.trim()
  };

  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken || !credentials.customerID) {
    alert('❌ すべての認証情報を入力してください。');
    return;
  }

  await googleAdsFrontend.saveCredentials(credentials);
};

window.testGoogleAdsConnection = async function() {
  await googleAdsFrontend.testConnection();
};

window.clearGoogleAdsCredentials = async function() {
  await googleAdsFrontend.clearCredentials();
};

window.refreshCampaigns = async function() {
  await googleAdsFrontend.refreshCampaigns();
};

window.showCreateCampaignModal = function() {
  document.getElementById('createCampaignModal').style.display = 'flex';
};

window.hideCreateCampaignModal = function() {
  document.getElementById('createCampaignModal').style.display = 'none';
};

window.createCampaign = async function() {
  const config = {
    name: document.getElementById('campaignName').value.trim(),
    type: document.getElementById('campaignType').value,
    budgetId: document.getElementById('campaignBudgetId').value.trim(),
    biddingStrategy: document.getElementById('campaignBiddingStrategy').value
  };

  if (!config.name || !config.budgetId) {
    alert('❌ キャンペーン名と予算IDを入力してください。');
    return;
  }

  await googleAdsFrontend.createCampaign(config);
  
  // フォームをクリア
  document.getElementById('campaignName').value = '';
  document.getElementById('campaignBudgetId').value = '';
  
  // モーダルを閉じる
  hideCreateCampaignModal();
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  googleAdsFrontend.initialize();
});