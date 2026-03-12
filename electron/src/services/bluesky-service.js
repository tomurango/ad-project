/**
 * Bluesky API Service
 *
 * Bluesky (ATProtocol) APIとの連携機能を提供
 *
 * 公式ドキュメント: https://docs.bsky.app/
 * API Reference: https://docs.bsky.app/docs/api/
 */

const axios = require('axios');

class BlueskyService {
  constructor() {
    this.baseURL = 'https://bsky.social/xrpc';
    this.session = null;
  }

  /**
   * セッションを作成（認証）
   * @param {string} identifier - Blueskyハンドル（例: user.bsky.social）またはメールアドレス
   * @param {string} password - アプリパスワード
   * @returns {Promise<Object>} セッション情報（accessJwt, refreshJwt, did等）
   */
  async createSession(identifier, password) {
    try {
      console.log('🔐 Blueskyセッション作成開始:', identifier);

      const response = await axios.post(`${this.baseURL}/com.atproto.server.createSession`, {
        identifier,
        password
      });

      this.session = response.data;

      console.log('✅ Blueskyセッション作成成功');
      console.log('- DID:', this.session.did);
      console.log('- Handle:', this.session.handle);

      return {
        success: true,
        session: this.session
      };

    } catch (error) {
      console.error('❌ Blueskyセッション作成エラー:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * 既存のセッションをリフレッシュ
   * @param {string} refreshJwt - リフレッシュトークン
   * @returns {Promise<Object>} 新しいセッション情報
   */
  async refreshSession(refreshJwt) {
    try {
      console.log('🔄 Blueskyセッションリフレッシュ開始');

      const response = await axios.post(
        `${this.baseURL}/com.atproto.server.refreshSession`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${refreshJwt}`
          }
        }
      );

      this.session = {
        ...this.session,
        accessJwt: response.data.accessJwt,
        refreshJwt: response.data.refreshJwt
      };

      console.log('✅ Blueskyセッションリフレッシュ成功');

      return {
        success: true,
        session: this.session
      };

    } catch (error) {
      console.error('❌ Blueskyセッションリフレッシュエラー:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * 投稿を作成
   * @param {string} text - 投稿テキスト（300文字まで）
   * @param {Object} options - オプション（langs, facets, reply, embed等）
   * @returns {Promise<Object>} 作成された投稿情報
   */
  async createPost(text, options = {}) {
    try {
      if (!this.session || !this.session.accessJwt) {
        throw new Error('セッションが作成されていません。先にcreateSession()を呼び出してください。');
      }

      console.log('📝 Bluesky投稿作成開始');
      console.log('- テキスト:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // 投稿レコードを構築
      const record = {
        $type: 'app.bsky.feed.post',
        text: text,
        createdAt: new Date().toISOString()
      };

      // オプション設定を追加
      if (options.langs) {
        record.langs = options.langs;
      }
      if (options.facets) {
        record.facets = options.facets;
      }
      if (options.reply) {
        record.reply = options.reply;
      }
      if (options.embed) {
        record.embed = options.embed;
      }

      const response = await axios.post(
        `${this.baseURL}/com.atproto.repo.createRecord`,
        {
          repo: this.session.did,
          collection: 'app.bsky.feed.post',
          record: record
        },
        {
          headers: {
            'Authorization': `Bearer ${this.session.accessJwt}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Bluesky投稿作成成功');
      console.log('- URI:', response.data.uri);

      return {
        success: true,
        uri: response.data.uri,
        cid: response.data.cid
      };

    } catch (error) {
      console.error('❌ Bluesky投稿作成エラー:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * 接続テスト
   * @param {Object} credentials - 認証情報 {identifier, password}
   * @returns {Promise<Object>} テスト結果
   */
  async testConnection(credentials) {
    try {
      console.log('🔍 Bluesky接続テスト開始');

      const result = await this.createSession(credentials.identifier, credentials.password);

      if (result.success) {
        console.log('✅ Bluesky接続テスト成功');
        return {
          success: true,
          message: 'Blueskyに正常に接続できました',
          handle: result.session.handle,
          did: result.session.did
        };
      } else {
        return result;
      }

    } catch (error) {
      console.error('❌ Bluesky接続テストエラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 現在のセッション情報を取得
   * @returns {Object|null} セッション情報
   */
  getSession() {
    return this.session;
  }

  /**
   * セッションをクリア
   */
  clearSession() {
    this.session = null;
    console.log('🔒 Blueskyセッションをクリアしました');
  }
}

// シングルトンインスタンス
let blueskyServiceInstance = null;

function getBlueskyService() {
  if (!blueskyServiceInstance) {
    blueskyServiceInstance = new BlueskyService();
  }
  return blueskyServiceInstance;
}

module.exports = {
  BlueskyService,
  getBlueskyService
};
