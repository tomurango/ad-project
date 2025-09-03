// Twitter API v2 サービス管理クラス
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class TwitterService {
  constructor() {
    this.apiKey = null;
    this.apiSecret = null;
    this.accessToken = null;
    this.accessTokenSecret = null;
    this.bearerToken = null;
    this.isConfigured = false;
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.configFilePath = path.join(__dirname, 'twitter-config-encrypted.json');
  }

  /**
   * 暗号化キーを取得または生成
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, '.twitter-key');
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
   * Twitter API認証情報を設定
   */
  async setCredentials(credentials) {
    try {
      const { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken } = credentials;
      
      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        throw new Error('必要なTwitter API認証情報が不足しています');
      }

      // 認証情報を暗号化して保存
      const encryptedConfig = {
        apiKey: this.encrypt(apiKey),
        apiSecret: this.encrypt(apiSecret),
        accessToken: this.encrypt(accessToken),
        accessTokenSecret: this.encrypt(accessTokenSecret),
        bearerToken: bearerToken ? this.encrypt(bearerToken) : null,
        configuredAt: new Date().toISOString()
      };

      await fs.writeFile(this.configFilePath, JSON.stringify(encryptedConfig, null, 2), 'utf8');

      // メモリに保存
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
      this.accessToken = accessToken;
      this.accessTokenSecret = accessTokenSecret;
      this.bearerToken = bearerToken;
      this.isConfigured = true;

      console.log('✅ Twitter API認証情報を設定・保存しました');
      return { success: true, message: 'Twitter API認証情報を保存しました' };

    } catch (error) {
      console.error('❌ Twitter API認証情報設定エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存されているTwitter API認証情報を読み込み
   */
  async loadCredentials() {
    try {
      const configData = await fs.readFile(this.configFilePath, 'utf8');
      const encryptedConfig = JSON.parse(configData);

      // 復号化
      this.apiKey = this.decrypt(encryptedConfig.apiKey);
      this.apiSecret = this.decrypt(encryptedConfig.apiSecret);
      this.accessToken = this.decrypt(encryptedConfig.accessToken);
      this.accessTokenSecret = this.decrypt(encryptedConfig.accessTokenSecret);
      this.bearerToken = encryptedConfig.bearerToken ? this.decrypt(encryptedConfig.bearerToken) : null;
      this.isConfigured = true;

      console.log('✅ Twitter API認証情報を読み込みました');
      return { success: true, message: 'Twitter API認証情報を読み込みました' };

    } catch (error) {
      console.log('ℹ️ Twitter API認証情報が未設定です');
      return { success: false, error: 'Twitter API認証情報が未設定です' };
    }
  }

  /**
   * Twitter API設定状況を確認
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      hasAccessToken: !!this.accessToken,
      hasAccessTokenSecret: !!this.accessTokenSecret,
      hasBearerToken: !!this.bearerToken
    };
  }

  /**
   * Twitter API認証情報をクリア
   */
  async clearCredentials() {
    try {
      // ファイルを削除
      await fs.unlink(this.configFilePath);
      
      // メモリをクリア
      this.apiKey = null;
      this.apiSecret = null;
      this.accessToken = null;
      this.accessTokenSecret = null;
      this.bearerToken = null;
      this.isConfigured = false;

      console.log('✅ Twitter API認証情報をクリアしました');
      return { success: true, message: 'Twitter API認証情報をクリアしました' };

    } catch (error) {
      console.error('❌ Twitter API認証情報クリアエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Twitter API v2でツイートを投稿
   */
  async postTweet(tweetText) {
    try {
      if (!this.isConfigured) {
        throw new Error('Twitter API認証情報が設定されていません');
      }

      if (!tweetText || tweetText.trim().length === 0) {
        throw new Error('ツイート内容が空です');
      }

      if (tweetText.length > 280) {
        throw new Error('ツイートが280文字を超えています');
      }

      // Twitter API v2エンドポイント
      const url = 'https://api.twitter.com/2/tweets';
      
      // OAuth 1.0a認証ヘッダーを生成
      const authHeader = this.generateOAuthHeader('POST', url, { text: tweetText });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: tweetText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter API エラー: ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ ツイート投稿成功:', data.data.id);
      return {
        success: true,
        tweetId: data.data.id,
        tweetText: data.data.text,
        message: 'ツイートを投稿しました'
      };

    } catch (error) {
      console.error('❌ ツイート投稿エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * OAuth 1.0a認証ヘッダーを生成
   */
  generateOAuthHeader(method, url, params = {}) {
    const oauth = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: '1.0'
    };

    // パラメータをマージ
    const allParams = { ...params, ...oauth };

    // パラメータを辞書順にソート
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // ベース文字列を作成
    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // 署名キーを作成
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // HMAC-SHA1署名を生成
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(baseString)
      .digest('base64');

    oauth.oauth_signature = signature;

    // Authorizationヘッダーを作成
    const authHeader = 'OAuth ' + Object.keys(oauth)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
      .join(', ');

    return authHeader;
  }

  /**
   * Twitter API接続テスト
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        throw new Error('Twitter API認証情報が設定されていません');
      }

      const url = 'https://api.twitter.com/2/users/me';
      const authHeader = this.generateOAuthHeader('GET', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter API接続エラー: ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Twitter API接続テスト成功:', data.data.username);
      return {
        success: true,
        username: data.data.username,
        name: data.data.name,
        message: 'Twitter APIに正常に接続できました'
      };

    } catch (error) {
      console.error('❌ Twitter API接続テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('🐦 Twitter サービス初期化開始...');
      
      // 保存されている認証情報を読み込み
      await this.loadCredentials();
      
      console.log('✅ Twitter サービス初期化完了');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Twitter サービス初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// シングルトンインスタンス
const twitterService = new TwitterService();

module.exports = twitterService;