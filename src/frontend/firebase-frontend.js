// Firebase フロントエンド統合ユーティリティ
// index.html から使用される Firebase 機能

class FirebaseFrontend {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
  }

  // ==========================================
  // 認証関連メソッド
  // ==========================================

  /**
   * メール・パスワードでログイン
   */
  async signInWithEmail(email, password) {
    try {
      console.log('🔐 Firebase ログイン試行:', email);
      
      const result = await window.electronAPI.invoke('firebase-signin-email', email, password);
      
      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn = true;
        console.log('✅ ログイン成功:', result.user.email);
        
        // ログイン成功時の処理
        this.onLoginSuccess(result.user);
        
        return result;
      } else {
        console.error('❌ ログイン失敗:', result.error);
        this.showAuthError(result.error, result.code);
        return result;
      }
      
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * アカウント作成
   */
  async createAccount(email, password) {
    try {
      console.log('📝 アカウント作成試行:', email);
      
      const result = await window.electronAPI.invoke('firebase-create-user', email, password);
      
      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn = true;
        console.log('✅ アカウント作成成功:', result.user.email);
        
        // ログイン成功時の処理
        this.onLoginSuccess(result.user);
        
        return result;
      } else {
        console.error('❌ アカウント作成失敗:', result.error);
        this.showAuthError(result.error, result.code);
        return result;
      }
      
    } catch (error) {
      console.error('❌ アカウント作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Googleアカウントでログイン
   */
  async signInWithGoogle() {
    try {
      console.log('🌐 Google ログイン試行');
      
      const result = await window.electronAPI.invoke('firebase-signin-google');
      
      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn = true;
        console.log('✅ Google ログイン成功:', result.user.email);
        
        // ログイン成功時の処理
        this.onLoginSuccess(result.user);
        
        return result;
      } else {
        console.error('❌ Google ログイン失敗:', result.error);
        this.showAuthError(result.error, result.code);
        return result;
      }
      
    } catch (error) {
      console.error('❌ Google ログインエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ログアウト
   */
  async signOut() {
    try {
      console.log('👋 ログアウト試行');
      
      const result = await window.electronAPI.invoke('firebase-signout');
      
      if (result.success) {
        this.currentUser = null;
        this.isLoggedIn = false;
        console.log('✅ ログアウト成功');
        
        // ログアウト時の処理
        this.onLogout();
        
        return result;
      } else {
        console.error('❌ ログアウト失敗:', result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 現在のユーザー情報を取得
   */
  async getCurrentUser() {
    try {
      const result = await window.electronAPI.invoke('firebase-get-current-user');
      
      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn = !!result.user;
        return result;
      } else {
        return result;
      }
      
    } catch (error) {
      console.error('❌ ユーザー情報取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // プロジェクト同期メソッド
  // ==========================================

  /**
   * プロジェクトをFirebaseに同期
   */
  async syncProject(action, projectData) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('ログインが必要です');
      }

      console.log(`🔄 プロジェクト同期: ${action} - ${projectData.name}`);
      
      const result = await window.electronAPI.invoke('firebase-sync-project', action, projectData);
      
      if (result.success) {
        console.log(`✅ プロジェクト同期成功: ${action}`);
        return result;
      } else {
        console.error(`❌ プロジェクト同期失敗: ${action}`, result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ プロジェクト同期エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Firebase からプロジェクト一覧を取得（シンプル版を使用）
   */
  async getUserProjects() {
    try {
      if (!this.isLoggedIn) {
        throw new Error('ログインが必要です');
      }

      console.log('📋 プロジェクト一覧取得（シンプル版）');
      
      // シンプル版Functionを使用
      const result = await window.electronAPI.invoke('firebase-get-user-projects-simple');
      
      if (result.success) {
        console.log(`✅ プロジェクト一覧取得成功: ${result.projects.length}件`);
        return result;
      } else {
        console.error('❌ プロジェクト一覧取得失敗:', result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ プロジェクト一覧取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクト投稿履歴を取得
   */
  async getProjectHistory(projectId, limit = 50) {
    try {
      if (!this.isLoggedIn) {
        throw new Error('ログインが必要です');
      }

      console.log(`📊 投稿履歴取得: ${projectId}`);
      
      const result = await window.electronAPI.invoke('firebase-get-project-history', projectId, limit);
      
      if (result.success) {
        console.log(`✅ 投稿履歴取得成功: ${result.history.length}件`);
        return result;
      } else {
        console.error('❌ 投稿履歴取得失敗:', result.error);
        return result;
      }
      
    } catch (error) {
      console.error('❌ 投稿履歴取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // UI更新メソッド
  // ==========================================

  /**
   * ログイン成功時の処理
   */
  onLoginSuccess(user) {
    // ログインステータスを更新
    this.updateLoginStatus(true, user);
    
    // Firebase同期ボタンを有効化
    this.enableFirebaseSyncButtons();
    
    // プロジェクト一覧を同期
    this.syncProjectsFromFirebase();
    
    // 成功メッセージ表示
    this.showSuccessMessage(`${user.email} でログインしました`);
  }

  /**
   * ログアウト時の処理
   */
  onLogout() {
    // ログインステータスを更新
    this.updateLoginStatus(false, null);
    
    // Firebase同期ボタンを無効化
    this.disableFirebaseSyncButtons();
    
    // 成功メッセージ表示
    this.showSuccessMessage('ログアウトしました');
  }

  /**
   * ログインステータスUIを更新
   */
  updateLoginStatus(isLoggedIn, user) {
    const loginSection = document.getElementById('firebaseLoginSection');
    const userInfo = document.getElementById('firebaseUserInfo');
    
    if (isLoggedIn && user) {
      if (loginSection) loginSection.style.display = 'none';
      if (userInfo) {
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
          <div class="user-info">
            <span>👤 ${user.displayName || user.email}</span>
            <button onclick="firebaseFrontend.signOut()" class="btn btn-secondary">ログアウト</button>
          </div>
        `;
      }
    } else {
      if (loginSection) loginSection.style.display = 'block';
      if (userInfo) userInfo.style.display = 'none';
    }
  }

  /**
   * Firebase同期ボタンを有効化
   */
  enableFirebaseSyncButtons() {
    const syncButtons = document.querySelectorAll('.firebase-sync-btn');
    syncButtons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  }

  /**
   * Firebase同期ボタンを無効化
   */
  disableFirebaseSyncButtons() {
    const syncButtons = document.querySelectorAll('.firebase-sync-btn');
    syncButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
  }

  /**
   * Firebase からプロジェクトを同期
   */
  async syncProjectsFromFirebase() {
    try {
      const result = await this.getUserProjects();
      
      if (result.success && result.projects.length > 0) {
        // Firebase のプロジェクトをローカルと比較して同期
        // この処理は既存のプロジェクト管理機能と統合する必要があります
        console.log('🔄 Firebase プロジェクト同期:', result.projects);
      }
      
    } catch (error) {
      console.error('❌ Firebase プロジェクト同期エラー:', error);
    }
  }

  // ==========================================
  // エラー・成功メッセージ表示
  // ==========================================

  /**
   * 認証エラーメッセージを表示
   */
  showAuthError(error, code) {
    let message = error;
    
    // Firebase認証エラーコードを日本語に変換
    switch (code) {
      case 'auth/user-not-found':
        message = 'このメールアドレスは登録されていません';
        break;
      case 'auth/wrong-password':
        message = 'パスワードが間違っています';
        break;
      case 'auth/email-already-in-use':
        message = 'このメールアドレスは既に使用されています';
        break;
      case 'auth/weak-password':
        message = 'パスワードは6文字以上で入力してください';
        break;
      case 'auth/invalid-email':
        message = 'メールアドレスの形式が正しくありません';
        break;
      default:
        message = error;
    }
    
    alert(`❌ ${message}`);
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
      console.log('🔥 Firebase フロントエンド初期化開始');
      
      // 現在のログイン状態をチェック
      const result = await this.getCurrentUser();
      
      if (result.success && result.user) {
        console.log('✅ 既にログイン済み:', result.user.email);
        this.onLoginSuccess(result.user);
      } else {
        console.log('ℹ️ 未ログイン状態');
        this.updateLoginStatus(false, null);
      }
      
      console.log('✅ Firebase フロントエンド初期化完了');
      
    } catch (error) {
      console.error('❌ Firebase フロントエンド初期化エラー:', error);
    }
  }
}

// グローバルインスタンス作成
const firebaseFrontend = new FirebaseFrontend();