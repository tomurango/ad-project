// マルチプラットフォーム認証管理システム
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * 複数の広告プラットフォーム認証を統合管理するクラス
 * Google Ads API、Meta Ads API、TikTok Ads API、Twitter APIを統一的に管理
 */
class MultiPlatformAuthManager {
  constructor() {
    this.platforms = {
      googleAds: require('./google-ads-service'),
      youtubeData: require('./youtube-data-service'),
      twitter: require('./twitter-service')
      // 将来的にMeta Ads API、TikTok Ads APIも追加
    };
    
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.configFilePath = path.join(__dirname, 'multi-auth-config-encrypted.json');
    this.platformStatus = {};
    
    this.initializePlatformStatus();
  }

  /**
   * 暗号化キーを取得または生成
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, '.multi-auth-key');
    try {
      const key = require('fs').readFileSync(keyPath, 'utf8');
      return key;
    } catch (error) {
      // キーが存在しない場合は新しく生成
      const newKey = crypto.randomBytes(32).toString('hex');
      require('fs').writeFileSync(keyPath, newKey, 'utf8');
      return newKey;
    }
  }

  /**
   * データを暗号化
   */
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  /**
   * データを復号化
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * プラットフォーム状態を初期化
   */
  async initializePlatformStatus() {
    for (const [platformName, platformService] of Object.entries(this.platforms)) {
      try {
        await platformService.initialize();
        const status = platformService.getConfigurationStatus();
        this.platformStatus[platformName] = {
          ...status,
          platformName: platformName,
          isInitialized: true,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        console.error(`❌ ${platformName} 初期化エラー:`, error);
        this.platformStatus[platformName] = {
          isConfigured: false,
          isInitialized: false,
          error: error.message,
          platformName: platformName,
          lastChecked: new Date().toISOString()
        };
      }
    }
  }

  /**
   * 全プラットフォームの認証状況を取得
   */
  getAllPlatformStatus() {
    return {
      platforms: this.platformStatus,
      summary: {
        totalPlatforms: Object.keys(this.platforms).length,
        configuredPlatforms: Object.values(this.platformStatus).filter(status => status.isConfigured).length,
        activePlatforms: Object.values(this.platformStatus).filter(status => status.isConfigured && status.isInitialized).length,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * 特定プラットフォームの認証情報を設定
   */
  async setPlatformCredentials(platformName, credentials) {
    try {
      if (!this.platforms[platformName]) {
        throw new Error(`サポートされていないプラットフォーム: ${platformName}`);
      }

      const result = await this.platforms[platformName].setCredentials(credentials);
      
      if (result.success) {
        // 状態を更新
        const status = this.platforms[platformName].getConfigurationStatus();
        this.platformStatus[platformName] = {
          ...status,
          platformName: platformName,
          isInitialized: true,
          lastConfigured: new Date().toISOString(),
          lastChecked: new Date().toISOString()
        };

        console.log(`✅ ${platformName} 認証情報設定完了`);
      }

      return result;
    } catch (error) {
      console.error(`❌ ${platformName} 認証情報設定エラー:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 特定プラットフォームの接続テスト
   */
  async testPlatformConnection(platformName) {
    try {
      if (!this.platforms[platformName]) {
        throw new Error(`サポートされていないプラットフォーム: ${platformName}`);
      }

      const result = await this.platforms[platformName].testConnection();
      
      // 状態を更新
      this.platformStatus[platformName] = {
        ...this.platformStatus[platformName],
        isConnected: result.success,
        lastTested: new Date().toISOString(),
        connectionError: result.success ? null : result.error
      };

      return result;
    } catch (error) {
      console.error(`❌ ${platformName} 接続テストエラー:`, error);
      this.platformStatus[platformName] = {
        ...this.platformStatus[platformName],
        isConnected: false,
        lastTested: new Date().toISOString(),
        connectionError: error.message
      };
      return { success: false, error: error.message };
    }
  }

  /**
   * 全プラットフォームの接続テスト
   */
  async testAllConnections() {
    const results = {};
    
    for (const platformName of Object.keys(this.platforms)) {
      if (this.platformStatus[platformName]?.isConfigured) {
        results[platformName] = await this.testPlatformConnection(platformName);
      } else {
        results[platformName] = { 
          success: false, 
          error: '認証情報が未設定です',
          skipped: true 
        };
      }
    }

    const summary = {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success && !r.skipped).length,
      skipped: Object.values(results).filter(r => r.skipped).length
    };

    return {
      success: summary.failed === 0,
      results: results,
      summary: summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 統合広告キャンペーン作成
   */
  async createCrossplatformCampaign(campaignConfig) {
    try {
      const results = {};
      const { platforms, ...baseConfig } = campaignConfig;

      // 各プラットフォームでキャンペーンを作成
      for (const platformName of platforms) {
        if (!this.platforms[platformName]) {
          results[platformName] = { 
            success: false, 
            error: `サポートされていないプラットフォーム: ${platformName}` 
          };
          continue;
        }

        if (!this.platformStatus[platformName]?.isConfigured) {
          results[platformName] = { 
            success: false, 
            error: '認証情報が未設定です' 
          };
          continue;
        }

        try {
          // プラットフォーム固有の設定を適用
          const platformConfig = this.adaptConfigForPlatform(platformName, baseConfig);
          
          let result;
          switch (platformName) {
            case 'googleAds':
              result = await this.platforms[platformName].createPerformanceMaxCampaign(platformConfig);
              break;
            case 'twitter':
              // Twitter は有機的な投稿のみ（広告は別途設定）
              result = { success: false, error: 'Twitter広告キャンペーンは未実装です' };
              break;
            default:
              result = { success: false, error: '未実装のプラットフォームです' };
          }

          results[platformName] = result;
        } catch (error) {
          results[platformName] = { success: false, error: error.message };
        }
      }

      const summary = {
        total: platforms.length,
        successful: Object.values(results).filter(r => r.success).length,
        failed: Object.values(results).filter(r => !r.success).length
      };

      return {
        success: summary.successful > 0,
        results: results,
        summary: summary,
        campaignName: baseConfig.name,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 統合キャンペーン作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラットフォーム固有の設定に変換
   */
  adaptConfigForPlatform(platformName, baseConfig) {
    const platformConfig = { ...baseConfig };

    switch (platformName) {
      case 'googleAds':
        // Google Ads 固有の設定変換
        if (baseConfig.budget) {
          platformConfig.budgetId = baseConfig.budget.budgetId || 'default';
          platformConfig.biddingStrategy = baseConfig.budget.strategy || 'MAXIMIZE_CONVERSIONS';
        }
        break;
      
      case 'twitter':
        // Twitter 固有の設定変換（将来的に広告API対応時）
        break;
      
      default:
        break;
    }

    return platformConfig;
  }

  /**
   * プラットフォーム認証情報をクリア
   */
  async clearPlatformCredentials(platformName) {
    try {
      if (!this.platforms[platformName]) {
        throw new Error(`サポートされていないプラットフォーム: ${platformName}`);
      }

      const result = await this.platforms[platformName].clearCredentials();
      
      if (result.success) {
        this.platformStatus[platformName] = {
          ...this.platformStatus[platformName],
          isConfigured: false,
          isConnected: false,
          lastCleared: new Date().toISOString()
        };
        console.log(`✅ ${platformName} 認証情報クリア完了`);
      }

      return result;
    } catch (error) {
      console.error(`❌ ${platformName} 認証情報クリアエラー:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 全プラットフォーム認証情報をクリア
   */
  async clearAllCredentials() {
    const results = {};
    
    for (const platformName of Object.keys(this.platforms)) {
      results[platformName] = await this.clearPlatformCredentials(platformName);
    }

    return {
      success: Object.values(results).every(r => r.success),
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 統合データ分析レポート生成
   */
  async generateCrossplatformReport() {
    try {
      const report = {
        platforms: {},
        summary: {
          totalPlatforms: 0,
          activePlatforms: 0,
          totalCampaigns: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0
        },
        recommendations: [],
        generatedAt: new Date().toISOString()
      };

      // 各プラットフォームからデータを収集
      for (const [platformName, platformService] of Object.entries(this.platforms)) {
        if (!this.platformStatus[platformName]?.isConfigured) {
          continue;
        }

        try {
          let platformData = {};
          
          switch (platformName) {
            case 'googleAds':
              const campaigns = await platformService.getCampaigns();
              if (campaigns.success) {
                platformData = {
                  campaigns: campaigns.campaigns,
                  campaignCount: campaigns.campaigns.length
                };
              }
              break;
            
            case 'youtubeData':
              // YouTube分析データ（今後実装）
              platformData = { status: 'configured', type: 'analytics' };
              break;
            
            case 'twitter':
              // Twitter分析データ（今後実装）
              platformData = { status: 'configured', type: 'organic' };
              break;
          }

          report.platforms[platformName] = platformData;
          report.summary.totalPlatforms++;
          if (platformData.campaigns || platformData.status === 'configured') {
            report.summary.activePlatforms++;
          }

        } catch (error) {
          console.error(`❌ ${platformName} データ取得エラー:`, error);
          report.platforms[platformName] = { error: error.message };
        }
      }

      // 推奨事項を生成
      if (report.summary.activePlatforms === 0) {
        report.recommendations.push('プラットフォームの認証設定を完了してください');
      }
      
      if (report.summary.totalCampaigns === 0) {
        report.recommendations.push('広告キャンペーンの作成を検討してください');
      }

      return {
        success: true,
        data: report
      };

    } catch (error) {
      console.error('❌ 統合レポート生成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('🔐 マルチプラットフォーム認証管理初期化開始...');
      
      await this.initializePlatformStatus();
      
      console.log('✅ マルチプラットフォーム認証管理初期化完了');
      return { success: true };
      
    } catch (error) {
      console.error('❌ マルチプラットフォーム認証管理初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// シングルトンインスタンス
const multiPlatformAuthManager = new MultiPlatformAuthManager();

module.exports = multiPlatformAuthManager;