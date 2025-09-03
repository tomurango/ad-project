// Twitter フロントエンド統合ユーティリティ
// index.html から使用される Twitter API 機能

class TwitterFrontend {
  constructor() {
    this.isConfigured = false;
    this.status = {};
  }

  // ==========================================
  // 認証情報管理メソッド
  // ==========================================

  /**
   * Twitter API認証情報を設定
   */
  async setCredentials(credentials) {
    try {
      console.log('🐦 Twitter API認証情報設定開始');
      
      const result = await window.electronAPI.invoke('twitter-set-credentials', credentials);
      
      if (result.success) {
        this.isConfigured = true;
        console.log('✅ Twitter API認証情報設定成功');
        
        // 設定成功時の処理
        this.onCredentialsSet();
        this.showSuccessMessage(result.message);
        
        return result;
      } else {
        console.error('❌ Twitter API認証情報設定失敗:', result.error);
        this.showError(result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ Twitter API認証情報設定エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Twitter API設定状況を取得
   */
  async getStatus() {
    try {
      const result = await window.electronAPI.invoke('twitter-get-status');
      
      if (result.success) {
        this.status = result.status;
        this.isConfigured = result.status.isConfigured;
        return result;
      } else {
        return result;
      }
      
    } catch (error) {
      console.error('❌ Twitter API状況取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Twitter API接続テスト
   */
  async testConnection() {
    try {
      console.log('🔌 Twitter API接続テスト開始');
      
      const result = await window.electronAPI.invoke('twitter-test-connection');
      
      if (result.success) {
        console.log('✅ Twitter API接続テスト成功:', result.username);
        this.showSuccessMessage(`✅ @${result.username} として接続しました`);
        return result;
      } else {
        console.error('❌ Twitter API接続テスト失敗:', result.error);
        this.showError(`接続テスト失敗: ${result.error}`);
        return result;
      }
      
    } catch (error) {
      console.error('❌ Twitter API接続テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Twitter API認証情報をクリア
   */
  async clearCredentials() {
    try {
      if (!confirm('Twitter API認証情報を削除しますか？\n\nこの操作は取り消せません。')) {
        return { success: false, canceled: true };
      }

      console.log('🗑️ Twitter API認証情報クリア開始');
      
      const result = await window.electronAPI.invoke('twitter-clear-credentials');
      
      if (result.success) {
        this.isConfigured = false;
        this.status = {};
        console.log('✅ Twitter API認証情報クリア成功');
        
        // クリア成功時の処理
        this.onCredentialsCleared();
        this.showSuccessMessage(result.message);
        
        return result;
      } else {
        console.error('❌ Twitter API認証情報クリア失敗:', result.error);
        this.showError(result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ Twitter API認証情報クリアエラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // ツイート投稿メソッド
  // ==========================================

  /**
   * ツイートを投稿
   */
  async postTweet(tweetText) {
    try {
      if (!this.isConfigured) {
        throw new Error('Twitter API認証情報が設定されていません');
      }

      if (!tweetText || tweetText.trim().length === 0) {
        throw new Error('ツイート内容を入力してください');
      }

      if (tweetText.length > 280) {
        throw new Error(`ツイートが280文字を超えています（現在: ${tweetText.length}文字）`);
      }

      console.log('📤 ツイート投稿開始:', tweetText.substring(0, 50) + '...');
      
      const result = await window.electronAPI.invoke('twitter-post-tweet', tweetText);
      
      if (result.success) {
        console.log('✅ ツイート投稿成功:', result.tweetId);
        this.showSuccessMessage(`✅ ツイートを投稿しました (ID: ${result.tweetId})`);
        
        // 投稿成功時の処理
        this.onTweetPosted(result);
        
        return result;
      } else {
        console.error('❌ ツイート投稿失敗:', result.error);
        this.showError(`ツイート投稿失敗: ${result.error}`);
        return result;
      }
      
    } catch (error) {
      console.error('❌ ツイート投稿エラー:', error);
      this.showError(error.message);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // UI更新メソッド
  // ==========================================

  /**
   * 認証情報設定時の処理
   */
  onCredentialsSet() {
    // Twitter設定UIを更新
    this.updateTwitterConfigUI(true);
    
    // ツイート投稿ボタンを有効化
    this.enableTweetButtons();
  }

  /**
   * 認証情報クリア時の処理
   */
  onCredentialsCleared() {
    // Twitter設定UIを更新
    this.updateTwitterConfigUI(false);
    
    // ツイート投稿ボタンを無効化
    this.disableTweetButtons();
  }

  /**
   * ツイート投稿成功時の処理
   */
  onTweetPosted(result) {
    // ツイートフォームをクリア
    const tweetTextarea = document.getElementById('tweetText');
    if (tweetTextarea) {
      tweetTextarea.value = '';
      // 文字数カウンターを更新
      if (typeof updateCharCount === 'function') {
        updateCharCount();
      }
    }

    // 投稿履歴に追加（既存の機能と連携）
    if (typeof addTweetToHistory === 'function') {
      addTweetToHistory({
        text: result.tweetText,
        id: result.tweetId,
        timestamp: new Date().toISOString(),
        platform: 'twitter'
      });
    }
  }

  /**
   * Twitter設定UIを更新
   */
  updateTwitterConfigUI(isConfigured) {
    const statusIndicator = document.getElementById('twitterStatusIndicator');
    const testButton = document.getElementById('testTwitterConnectionBtn');
    const clearButton = document.getElementById('clearTwitterCredentialsBtn');

    if (statusIndicator) {
      statusIndicator.innerHTML = isConfigured ? 
        '<span style="color: #1da1f2;">✅ 設定済み</span>' : 
        '<span style="color: #657786;">❌ 未設定</span>';
    }

    if (testButton) {
      testButton.disabled = !isConfigured;
    }

    if (clearButton) {
      clearButton.disabled = !isConfigured;
    }
  }

  /**
   * ツイート投稿ボタンを有効化
   */
  enableTweetButtons() {
    const buttons = document.querySelectorAll('.twitter-post-btn');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  }

  /**
   * ツイート投稿ボタンを無効化
   */
  disableTweetButtons() {
    const buttons = document.querySelectorAll('.twitter-post-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
  }

  // ==========================================
  // エラー・成功メッセージ表示
  // ==========================================

  /**
   * エラーメッセージを表示
   */
  showError(message) {
    // 既存のaddAIMessage関数を利用
    if (typeof addAIMessage === 'function') {
      addAIMessage(`❌ ${message}`);
    } else {
      alert(`❌ ${message}`);
    }
  }

  /**
   * 成功メッセージを表示
   */
  showSuccessMessage(message) {
    // 既存のaddAIMessage関数を利用
    if (typeof addAIMessage === 'function') {
      addAIMessage(`✅ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  }

  // ==========================================
  // 初期化処理
  // ==========================================

  /**
   * アプリ起動時の初期化
   */
  async initialize() {
    try {
      console.log('🐦 Twitter フロントエンド初期化開始');
      
      // 現在の設定状況をチェック
      const result = await this.getStatus();
      
      if (result.success) {
        console.log('✅ Twitter 設定状況確認完了:', result.status);
        this.updateTwitterConfigUI(result.status.isConfigured);
        
        if (result.status.isConfigured) {
          this.enableTweetButtons();
        } else {
          this.disableTweetButtons();
        }
      } else {
        console.log('ℹ️ Twitter 設定状況取得失敗:', result.error);
        this.updateTwitterConfigUI(false);
        this.disableTweetButtons();
      }
      
      console.log('✅ Twitter フロントエンド初期化完了');
      
    } catch (error) {
      console.error('❌ Twitter フロントエンド初期化エラー:', error);
      this.updateTwitterConfigUI(false);
      this.disableTweetButtons();
    }
  }

  // ==========================================
  // ユーティリティメソッド
  // ==========================================

  /**
   * ツイート文字数をチェック
   */
  validateTweetLength(text) {
    const length = text.length;
    return {
      isValid: length > 0 && length <= 280,
      length: length,
      remaining: 280 - length
    };
  }

  /**
   * ツイートテキストを短縮
   */
  truncateTweet(text, maxLength = 280) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // 文の区切りで短縮を試行
    const sentences = text.split(/[。！？\.\!\?]/);
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length <= maxLength - 3) {
        result += sentence;
        if (sentence.endsWith('。') || sentence.endsWith('！') || sentence.endsWith('？') ||
            sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?')) {
          result += sentence.slice(-1);
        }
      } else {
        break;
      }
    }
    
    return result.length > 0 ? result + '...' : text.substring(0, maxLength - 3) + '...';
  }
}

// グローバルインスタンス作成
const twitterFrontend = new TwitterFrontend();