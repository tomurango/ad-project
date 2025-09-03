// Google Ads API v2 サービス管理クラス
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Google Ads API統合サービス
 * Performance Max・Demand Gen Campaignsを通じてYouTube広告を制御
 */
class GoogleAdsService {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.refreshToken = null;
    this.accessToken = null;
    this.customerID = null;
    this.isConfigured = false;
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.configFilePath = path.join(__dirname, 'google-ads-config-encrypted.json');
  }

  /**
   * 暗号化キーを取得または生成
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, '.google-ads-key');
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
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
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
   * Google Ads API認証情報を設定
   */
  async setCredentials(credentials) {
    try {
      const { clientId, clientSecret, refreshToken, customerID } = credentials;
      
      if (!clientId || !clientSecret || !refreshToken || !customerID) {
        throw new Error('必要なGoogle Ads API認証情報が不足しています');
      }

      // 認証情報を暗号化して保存
      const encryptedConfig = {
        clientId: this.encrypt(clientId),
        clientSecret: this.encrypt(clientSecret),
        refreshToken: this.encrypt(refreshToken),
        customerID: this.encrypt(customerID),
        configuredAt: new Date().toISOString()
      };

      await fs.writeFile(this.configFilePath, JSON.stringify(encryptedConfig, null, 2), 'utf8');

      // メモリに保存
      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.refreshToken = refreshToken;
      this.customerID = customerID;
      this.isConfigured = true;

      // アクセストークンを取得
      await this.refreshAccessToken();

      console.log('✅ Google Ads API認証情報を設定・保存しました');
      return { success: true, message: 'Google Ads API認証情報を保存しました' };

    } catch (error) {
      console.error('❌ Google Ads API認証情報設定エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存されているGoogle Ads API認証情報を読み込み
   */
  async loadCredentials() {
    try {
      const configData = await fs.readFile(this.configFilePath, 'utf8');
      const encryptedConfig = JSON.parse(configData);

      // 復号化
      this.clientId = this.decrypt(encryptedConfig.clientId);
      this.clientSecret = this.decrypt(encryptedConfig.clientSecret);
      this.refreshToken = this.decrypt(encryptedConfig.refreshToken);
      this.customerID = this.decrypt(encryptedConfig.customerID);
      this.isConfigured = true;

      // アクセストークンを取得
      await this.refreshAccessToken();

      console.log('✅ Google Ads API認証情報を読み込みました');
      return { success: true, message: 'Google Ads API認証情報を読み込みました' };

    } catch (error) {
      console.log('ℹ️ Google Ads API認証情報が未設定です');
      return { success: false, error: 'Google Ads API認証情報が未設定です' };
    }
  }

  /**
   * OAuth 2.0アクセストークンをリフレッシュ
   */
  async refreshAccessToken() {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OAuth token refresh failed: ${errorData.error_description || response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      console.log('✅ Google Ads APIアクセストークンをリフレッシュしました');
      return { success: true, accessToken: this.accessToken };

    } catch (error) {
      console.error('❌ Google Ads APIトークンリフレッシュエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Ads API設定状況を確認
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasRefreshToken: !!this.refreshToken,
      hasCustomerID: !!this.customerID,
      hasAccessToken: !!this.accessToken
    };
  }

  /**
   * Google Ads API認証情報をクリア
   */
  async clearCredentials() {
    try {
      // ファイルを削除
      await fs.unlink(this.configFilePath);
      
      // メモリをクリア
      this.clientId = null;
      this.clientSecret = null;
      this.refreshToken = null;
      this.customerID = null;
      this.accessToken = null;
      this.isConfigured = false;

      console.log('✅ Google Ads API認証情報をクリアしました');
      return { success: true, message: 'Google Ads API認証情報をクリアしました' };

    } catch (error) {
      console.error('❌ Google Ads API認証情報クリアエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Ads APIへのリクエスト実行
   */
  async makeAPIRequest(endpoint, method = 'GET', data = null) {
    try {
      if (!this.isConfigured) {
        throw new Error('Google Ads API認証情報が設定されていません');
      }

      if (!this.accessToken) {
        await this.refreshAccessToken();
      }

      const url = `https://googleads.googleapis.com/v16/${endpoint}`;
      const options = {
        method: method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'YOUR_DEVELOPER_TOKEN',
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Ads API エラー: ${errorData.error?.message || response.statusText}`);
      }

      const responseData = await response.json();
      return { success: true, data: responseData };

    } catch (error) {
      console.error('❌ Google Ads API リクエストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Performance Max Campaign作成
   */
  async createPerformanceMaxCampaign(config) {
    try {
      const campaignData = {
        campaign: {
          name: config.name,
          advertisingChannelType: 'PERFORMANCE_MAX',
          status: 'ENABLED',
          campaignBudget: `customers/${this.customerID}/campaignBudgets/${config.budgetId}`,
          biddingStrategyType: config.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
          ...config.additionalSettings
        }
      };

      const endpoint = `customers/${this.customerID}/campaigns:mutate`;
      const result = await this.makeAPIRequest(endpoint, 'POST', {
        operations: [{
          create: campaignData.campaign
        }]
      });

      if (result.success) {
        console.log('✅ Performance Max Campaign作成成功');
        return {
          success: true,
          campaignId: result.data.results[0].resourceName,
          message: 'Performance Max Campaignを作成しました'
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Performance Max Campaign作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Demand Gen Campaign作成
   */
  async createDemandGenCampaign(config) {
    try {
      const campaignData = {
        campaign: {
          name: config.name,
          advertisingChannelType: 'DEMAND_GEN',
          status: 'ENABLED',
          campaignBudget: `customers/${this.customerID}/campaignBudgets/${config.budgetId}`,
          biddingStrategyType: config.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
          ...config.additionalSettings
        }
      };

      const endpoint = `customers/${this.customerID}/campaigns:mutate`;
      const result = await this.makeAPIRequest(endpoint, 'POST', {
        operations: [{
          create: campaignData.campaign
        }]
      });

      if (result.success) {
        console.log('✅ Demand Gen Campaign作成成功');
        return {
          success: true,
          campaignId: result.data.results[0].resourceName,
          message: 'Demand Gen Campaignを作成しました'
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Demand Gen Campaign作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * キャンペーンの一時停止・再開
   */
  async pauseOrResumeCampaign(campaignId, action = 'PAUSED') {
    try {
      const endpoint = `customers/${this.customerID}/campaigns:mutate`;
      const result = await this.makeAPIRequest(endpoint, 'POST', {
        operations: [{
          update: {
            resourceName: campaignId,
            status: action // 'PAUSED' or 'ENABLED'
          },
          updateMask: 'status'
        }]
      });

      if (result.success) {
        const actionText = action === 'PAUSED' ? '一時停止' : '再開';
        console.log(`✅ キャンペーン${actionText}成功`);
        return {
          success: true,
          message: `キャンペーンを${actionText}しました`
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ キャンペーン制御エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * キャンペーン一覧取得
   */
  async getCampaigns() {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros
        FROM campaign 
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const endpoint = `customers/${this.customerID}/googleAds:searchStream`;
      const result = await this.makeAPIRequest(endpoint, 'POST', { query });

      if (result.success) {
        console.log('✅ キャンペーン一覧取得成功');
        return {
          success: true,
          campaigns: result.data.results || [],
          message: 'キャンペーン一覧を取得しました'
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ キャンペーン一覧取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Google Ads API接続テスト
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        throw new Error('Google Ads API認証情報が設定されていません');
      }

      const endpoint = `customers/${this.customerID}`;
      const result = await this.makeAPIRequest(endpoint, 'GET');

      if (result.success) {
        console.log('✅ Google Ads API接続テスト成功');
        return {
          success: true,
          customerInfo: result.data,
          message: 'Google Ads APIに正常に接続できました'
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Google Ads API接続テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('📊 Google Ads サービス初期化開始...');
      
      // 保存されている認証情報を読み込み
      await this.loadCredentials();
      
      console.log('✅ Google Ads サービス初期化完了');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Google Ads サービス初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// シングルトンインスタンス
const googleAdsService = new GoogleAdsService();

module.exports = googleAdsService;