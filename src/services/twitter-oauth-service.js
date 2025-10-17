/**
 * Twitter OAuth 1.0a認証サービス（プロジェクト別管理）
 * Electron環境でのTwitter認証フローを管理
 */

const OAuth = require('oauth').OAuth;
const crypto = require('crypto');

class TwitterOAuthService {
  constructor() {
    // OAuth認証中のセッション管理（projectId → oauthSession）
    this.pendingSessions = new Map();

    // Twitter OAuth設定
    this.requestTokenURL = 'https://api.twitter.com/oauth/request_token';
    this.accessTokenURL = 'https://api.twitter.com/oauth/access_token';
    this.authorizeURL = 'https://api.twitter.com/oauth/authorize';
    this.apiVersion = '1.0A';
    this.signatureMethod = 'HMAC-SHA1';

    // コールバックURL（Electronアプリ内サーバー）
    this.callbackURL = 'http://127.0.0.1:8888/twitter-callback';
  }

  /**
   * OAuth 1.0aクライアントを作成
   * @param {string} consumerKey - Twitter API Key
   * @param {string} consumerSecret - Twitter API Secret
   * @returns {OAuth}
   */
  createOAuthClient(consumerKey, consumerSecret) {
    return new OAuth(
      this.requestTokenURL,
      this.accessTokenURL,
      consumerKey,
      consumerSecret,
      this.apiVersion,
      this.callbackURL,
      this.signatureMethod
    );
  }

  /**
   * Twitter認証フローを開始
   * @param {string} projectId - プロジェクトID
   * @param {string} consumerKey - Twitter API Key
   * @param {string} consumerSecret - Twitter API Secret
   * @returns {Promise<{authUrl: string, requestToken: string}>}
   */
  async startAuthFlow(projectId, consumerKey, consumerSecret) {
    return new Promise((resolve, reject) => {
      const oauth = this.createOAuthClient(consumerKey, consumerSecret);

      oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret, results) => {
        if (error) {
          console.error('❌ Request Token取得エラー:', error);
          reject(new Error(`Twitter認証の開始に失敗しました: ${error.data || error.message}`));
          return;
        }

        // セッション情報を保存
        const sessionId = crypto.randomBytes(16).toString('hex');
        this.pendingSessions.set(sessionId, {
          projectId,
          consumerKey,
          consumerSecret,
          oauthToken,
          oauthTokenSecret,
          createdAt: Date.now()
        });

        // 認証URLを生成
        const authUrl = `${this.authorizeURL}?oauth_token=${oauthToken}&session_id=${sessionId}`;

        console.log('✅ Twitter認証URL生成成功');
        console.log('📍 Project ID:', projectId);
        console.log('🔑 OAuth Token:', oauthToken.substring(0, 10) + '...');

        resolve({
          authUrl,
          requestToken: oauthToken,
          sessionId
        });
      });
    });
  }

  /**
   * OAuth認証コールバックを処理してAccess Tokenを取得
   * @param {string} sessionId - セッションID
   * @param {string} oauthToken - OAuth Token
   * @param {string} oauthVerifier - OAuth Verifier
   * @returns {Promise<{projectId: string, credentials: object}>}
   */
  async handleCallback(sessionId, oauthToken, oauthVerifier) {
    return new Promise((resolve, reject) => {
      // セッション情報を取得
      const session = this.pendingSessions.get(sessionId);

      if (!session) {
        reject(new Error('認証セッションが見つかりません。時間切れの可能性があります。'));
        return;
      }

      // セッション情報を削除
      this.pendingSessions.delete(sessionId);

      // トークンが一致するか確認
      if (session.oauthToken !== oauthToken) {
        reject(new Error('OAuth Tokenが一致しません'));
        return;
      }

      const oauth = this.createOAuthClient(session.consumerKey, session.consumerSecret);

      oauth.getOAuthAccessToken(
        oauthToken,
        session.oauthTokenSecret,
        oauthVerifier,
        (error, accessToken, accessTokenSecret, results) => {
          if (error) {
            console.error('❌ Access Token取得エラー:', error);
            reject(new Error(`Twitter認証に失敗しました: ${error.data || error.message}`));
            return;
          }

          console.log('✅ Twitter Access Token取得成功');
          console.log('📍 Project ID:', session.projectId);
          console.log('👤 Username:', results.screen_name);
          console.log('🆔 User ID:', results.user_id);

          resolve({
            projectId: session.projectId,
            credentials: {
              apiKey: session.consumerKey,
              apiSecret: session.consumerSecret,
              accessToken,
              accessTokenSecret,
              username: results.screen_name,
              userId: results.user_id,
              enabled: true,
              connectedAt: new Date().toISOString()
            }
          });
        }
      );
    });
  }

  /**
   * 期限切れセッションをクリーンアップ（5分以上経過したもの）
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expirationTime = 5 * 60 * 1000; // 5分

    for (const [sessionId, session] of this.pendingSessions.entries()) {
      if (now - session.createdAt > expirationTime) {
        console.log('🧹 期限切れセッションを削除:', sessionId);
        this.pendingSessions.delete(sessionId);
      }
    }
  }

  /**
   * セッション情報を取得（デバッグ用）
   */
  getSessionInfo(sessionId) {
    return this.pendingSessions.get(sessionId);
  }

  /**
   * 全セッション数を取得（デバッグ用）
   */
  getActiveSessions() {
    return this.pendingSessions.size;
  }
}

// シングルトンインスタンス
const twitterOAuthService = new TwitterOAuthService();

// 定期的に期限切れセッションをクリーンアップ（5分ごと）
setInterval(() => {
  twitterOAuthService.cleanupExpiredSessions();
}, 5 * 60 * 1000);

module.exports = twitterOAuthService;
