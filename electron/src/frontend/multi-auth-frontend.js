/**
 * 統合認証管理 フロントエンド統合スクリプト
 * ElectronのIPCを介してマルチプラットフォーム認証管理機能を提供
 */

class MultiAuthFrontend {
  constructor() {
    this.platformStatus = {};
    this.lastStatusUpdate = null;
    this.crossPlatformReport = null;
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('🚀 統合認証管理 フロントエンド初期化開始');
      
      // 全プラットフォーム状況を取得
      await this.refreshAllPlatformStatus();
      
      console.log('✅ 統合認証管理 フロントエンド初期化完了');
    } catch (error) {
      console.error('❌ 統合認証管理 フロントエンド初期化エラー:', error);
    }
  }

  /**
   * 全プラットフォーム認証状況を更新
   */
  async refreshAllPlatformStatus() {
    try {
      console.log('📊 全プラットフォーム認証状況更新開始');
      
      const result = await window.electronAPI.invoke('multi-auth-get-all-status');
      
      if (result.success) {
        this.platformStatus = result.data;
        this.lastStatusUpdate = new Date();
        this.updatePlatformStatusUI();
        console.log('✅ プラットフォーム認証状況更新成功:', this.platformStatus);
        return result;
      } else {
        console.error('❌ プラットフォーム認証状況更新失敗:', result.error);
        alert(`❌ 認証状況更新エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ プラットフォーム認証状況更新エラー:', error);
      alert(`❌ 認証状況更新エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 全プラットフォーム接続テスト
   */
  async testAllConnections() {
    try {
      console.log('🔗 全プラットフォーム接続テスト開始');
      
      const result = await window.electronAPI.invoke('multi-auth-test-all-connections');
      
      if (result.success) {
        console.log('✅ 全プラットフォーム接続テスト完了:', result.results);
        this.showConnectionTestResults(result);
        await this.refreshAllPlatformStatus(); // 状況を更新
        return result;
      } else {
        console.error('❌ 全プラットフォーム接続テスト失敗:', result.error);
        alert(`❌ 接続テストエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ 全プラットフォーム接続テストエラー:', error);
      alert(`❌ 接続テストエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 統合キャンペーンを作成
   */
  async createCrossPlatformCampaign(campaignConfig) {
    try {
      console.log('🚀 統合キャンペーン作成開始:', campaignConfig);
      
      const result = await window.electronAPI.invoke('multi-auth-create-crossplatform-campaign', campaignConfig);
      
      if (result.success) {
        console.log('✅ 統合キャンペーン作成成功:', result);
        this.showCampaignCreationResults(result);
        return result;
      } else {
        console.error('❌ 統合キャンペーン作成失敗:', result.error);
        alert(`❌ 統合キャンペーン作成エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ 統合キャンペーン作成エラー:', error);
      alert(`❌ 統合キャンペーン作成エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 統合レポートを生成
   */
  async generateCrossPlatformReport() {
    try {
      console.log('📊 統合レポート生成開始');
      
      const result = await window.electronAPI.invoke('multi-auth-generate-crossplatform-report');
      
      if (result.success) {
        this.crossPlatformReport = result.data;
        this.updateReportUI();
        console.log('✅ 統合レポート生成成功');
        return result;
      } else {
        console.error('❌ 統合レポート生成失敗:', result.error);
        alert(`❌ レポート生成エラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error('❌ 統合レポート生成エラー:', error);
      alert(`❌ レポート生成エラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラットフォーム認証情報をクリア
   */
  async clearPlatformCredentials(platformName) {
    try {
      if (!confirm(`${platformName}の認証情報を削除しますか？`)) {
        return;
      }

      console.log(`🗑️ ${platformName} 認証情報クリア開始`);
      
      const result = await window.electronAPI.invoke('multi-auth-clear-platform-credentials', platformName);
      
      if (result.success) {
        console.log(`✅ ${platformName} 認証情報クリア成功`);
        await this.refreshAllPlatformStatus();
        alert(`✅ ${platformName}の認証情報をクリアしました！`);
        return result;
      } else {
        console.error(`❌ ${platformName} 認証情報クリア失敗:`, result.error);
        alert(`❌ ${platformName}認証情報クリアエラー: ${result.error}`);
        return result;
      }
    } catch (error) {
      console.error(`❌ ${platformName} 認証情報クリアエラー:`, error);
      alert(`❌ ${platformName}認証情報クリアエラー: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラットフォーム状況UIを更新
   */
  updatePlatformStatusUI() {
    const statusGridElement = document.getElementById('platformStatusGrid');
    if (!statusGridElement || !this.platformStatus.platforms) return;

    const platforms = this.platformStatus.platforms;
    const summary = this.platformStatus.summary;

    let html = '';

    // サマリーカードを追加
    html += `
      <div class="platform-card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1da1f2 0%, #1991db 100%); color: white;">
        <div class="platform-header">
          <div class="platform-name" style="color: white; font-size: 18px;">📊 統合認証サマリー</div>
          <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">
            最終更新: ${this.lastStatusUpdate ? this.lastStatusUpdate.toLocaleString('ja-JP') : '未取得'}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold;">${summary.totalPlatforms}</div>
            <div style="font-size: 14px; opacity: 0.8;">総プラットフォーム</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold;">${summary.configuredPlatforms}</div>
            <div style="font-size: 14px; opacity: 0.8;">設定済み</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold;">${summary.activePlatforms}</div>
            <div style="font-size: 14px; opacity: 0.8;">アクティブ</div>
          </div>
        </div>
      </div>
    `;

    // 各プラットフォームのカードを生成
    Object.entries(platforms).forEach(([platformName, status]) => {
      const platformDisplayName = this.getPlatformDisplayName(platformName);
      const platformEmoji = this.getPlatformEmoji(platformName);
      
      let statusClass = 'unconfigured';
      let statusText = '未設定';
      
      if (status.isConfigured && status.isInitialized) {
        statusClass = status.isConnected !== false ? 'connected' : 'disconnected';
        statusText = status.isConnected !== false ? '接続済み' : '接続エラー';
      } else if (status.isConfigured) {
        statusClass = 'unconfigured';
        statusText = '初期化中';
      }

      const errorText = status.error || status.connectionError || '';

      html += `
        <div class="platform-card">
          <div class="platform-header">
            <div class="platform-name">${platformEmoji} ${platformDisplayName}</div>
            <span class="platform-status ${statusClass}">${statusText}</span>
          </div>
          <div style="margin-top: 10px;">
            <div style="font-size: 14px; color: #657786;">
              <div>設定済み: ${status.isConfigured ? '✅' : '❌'}</div>
              <div>初期化済み: ${status.isInitialized ? '✅' : '❌'}</div>
              ${status.lastConfigured ? `<div>最終設定: ${new Date(status.lastConfigured).toLocaleDateString('ja-JP')}</div>` : ''}
              ${status.lastTested ? `<div>最終テスト: ${new Date(status.lastTested).toLocaleDateString('ja-JP')}</div>` : ''}
            </div>
            ${errorText ? `
              <div style="margin-top: 8px; padding: 8px; background: #f8d7da; border-radius: 6px; font-size: 12px; color: #721c24;">
                ${errorText}
              </div>
            ` : ''}
          </div>
          <div style="margin-top: 15px; text-align: right;">
            <button class="btn btn-secondary" style="font-size: 12px; padding: 5px 10px;" onclick="multiAuthFrontend.clearPlatformCredentials('${platformName}')">
              クリア
            </button>
          </div>
        </div>
      `;
    });

    statusGridElement.innerHTML = html;
  }

  /**
   * 接続テスト結果を表示
   */
  showConnectionTestResults(result) {
    const { results, summary } = result;
    
    let message = `🔗 全プラットフォーム接続テスト結果\n\n`;
    message += `✅ 成功: ${summary.passed}件\n`;
    message += `❌ 失敗: ${summary.failed}件\n`;
    message += `⏭️ スキップ: ${summary.skipped}件\n\n`;

    Object.entries(results).forEach(([platformName, platformResult]) => {
      const platformDisplayName = this.getPlatformDisplayName(platformName);
      const status = platformResult.success ? '✅' : platformResult.skipped ? '⏭️' : '❌';
      message += `${status} ${platformDisplayName}: ${platformResult.success ? '接続成功' : platformResult.error || '接続失敗'}\n`;
    });

    alert(message);
  }

  /**
   * キャンペーン作成結果を表示
   */
  showCampaignCreationResults(result) {
    const { results, summary, campaignName } = result;
    
    let message = `🚀 統合キャンペーン「${campaignName}」作成結果\n\n`;
    message += `✅ 成功: ${summary.successful}件\n`;
    message += `❌ 失敗: ${summary.failed}件\n\n`;

    Object.entries(results).forEach(([platformName, platformResult]) => {
      const platformDisplayName = this.getPlatformDisplayName(platformName);
      const status = platformResult.success ? '✅' : '❌';
      message += `${status} ${platformDisplayName}: ${platformResult.success ? 'キャンペーン作成成功' : platformResult.error}\n`;
    });

    alert(message);
  }

  /**
   * レポートUIを更新
   */
  updateReportUI() {
    const reportElement = document.getElementById('crossPlatformReport');
    if (!reportElement || !this.crossPlatformReport) return;

    const report = this.crossPlatformReport;

    let html = `
      <div class="platform-card">
        <div class="platform-header">
          <div class="platform-name">📊 統合レポート</div>
          <div style="font-size: 14px; color: #657786;">
            生成日時: ${new Date(report.generatedAt).toLocaleString('ja-JP')}
          </div>
        </div>
        
        <div style="margin-top: 20px;">
          <h4>📈 サマリー</h4>
          <div class="channel-stats">
            <div class="stat-item">
              <div class="stat-value">${report.summary.totalPlatforms}</div>
              <div class="stat-label">総プラットフォーム</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${report.summary.activePlatforms}</div>
              <div class="stat-label">アクティブプラットフォーム</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${report.summary.totalCampaigns}</div>
              <div class="stat-label">総キャンペーン数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.formatNumber(report.summary.totalImpressions)}</div>
              <div class="stat-label">総インプレッション</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.formatNumber(report.summary.totalClicks)}</div>
              <div class="stat-label">総クリック数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">¥${this.formatNumber(report.summary.totalCost)}</div>
              <div class="stat-label">総コスト</div>
            </div>
          </div>
        </div>

        ${Object.keys(report.platforms).length > 0 ? `
          <div style="margin-top: 30px;">
            <h4>🔍 プラットフォーム詳細</h4>
            ${Object.entries(report.platforms).map(([platformName, platformData]) => {
              const platformDisplayName = this.getPlatformDisplayName(platformName);
              const platformEmoji = this.getPlatformEmoji(platformName);
              
              return `
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #e1e8ed; border-radius: 8px;">
                  <h5 style="margin: 0 0 10px 0; color: #1da1f2;">${platformEmoji} ${platformDisplayName}</h5>
                  <div style="font-size: 14px; color: #657786;">
                    ${platformData.campaigns ? `
                      <div>キャンペーン数: ${platformData.campaignCount}件</div>
                    ` : ''}
                    ${platformData.status ? `
                      <div>状態: ${platformData.status}</div>
                    ` : ''}
                    ${platformData.error ? `
                      <div style="color: #721c24;">エラー: ${platformData.error}</div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${report.recommendations && report.recommendations.length > 0 ? `
          <div style="margin-top: 30px;">
            <h4>💡 推奨事項</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${report.recommendations.map(rec => `<li style="margin: 5px 0; color: #657786;">${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    reportElement.innerHTML = html;
  }

  /**
   * プラットフォーム表示名を取得
   */
  getPlatformDisplayName(platformName) {
    const displayNames = {
      googleAds: 'Google広告',
      youtubeData: 'YouTube分析',
      twitter: 'Twitter',
      metaAds: 'Meta広告',
      tiktokAds: 'TikTok広告'
    };
    return displayNames[platformName] || platformName;
  }

  /**
   * プラットフォーム絵文字を取得
   */
  getPlatformEmoji(platformName) {
    const emojis = {
      googleAds: '📊',
      youtubeData: '📺',
      twitter: '🐦',
      metaAds: '📘',
      tiktokAds: '🎵'
    };
    return emojis[platformName] || '🔗';
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
}

// グローバルインスタンス
const multiAuthFrontend = new MultiAuthFrontend();

// グローバル関数として公開
window.refreshAllPlatformStatus = async function() {
  await multiAuthFrontend.refreshAllPlatformStatus();
};

window.testAllConnections = async function() {
  await multiAuthFrontend.testAllConnections();
};

window.createCrossPlatformCampaign = async function() {
  const campaignName = document.getElementById('crossPlatformCampaignName').value.trim();
  const selectedPlatforms = [];

  // チェックされたプラットフォームを収集
  const checkboxes = document.querySelectorAll('.platform-checkboxes input[type="checkbox"]:checked');
  checkboxes.forEach(cb => selectedPlatforms.push(cb.value));

  if (!campaignName) {
    alert('❌ キャンペーン名を入力してください。');
    return;
  }

  if (selectedPlatforms.length === 0) {
    alert('❌ 対象プラットフォームを選択してください。');
    return;
  }

  const campaignConfig = {
    name: campaignName,
    platforms: selectedPlatforms,
    // 追加の設定は必要に応じて拡張
  };

  await multiAuthFrontend.createCrossPlatformCampaign(campaignConfig);

  // フォームをクリア
  document.getElementById('crossPlatformCampaignName').value = '';
  checkboxes.forEach(cb => cb.checked = false);
};

window.generateCrossPlatformReport = async function() {
  await multiAuthFrontend.generateCrossPlatformReport();
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  multiAuthFrontend.initialize();
});