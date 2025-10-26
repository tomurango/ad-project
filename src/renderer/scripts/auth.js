/**
 * auth.js
 *
 * Firebase認証関連の全関数
 * - ログイン/ログアウト
 * - サインアップ
 * - 認証状態管理
 * - UI表示切り替え
 */

// ==================================================
// 認証状態管理
// ==================================================

// 認証初期化
function initializeAuth() {
  console.log('🔐 Firebase Authentication 初期化開始');

  // 認証状態の確認
  checkAuthState();
}

// 認証状態チェック
async function checkAuthState() {
  try {
    const result = await window.electronAPI.invoke('check-auth-state');

    if (result.success && result.user) {
      currentUser = result.user;
      showAuthenticatedUI();
      console.log('✅ ユーザー認証済み:', currentUser.email);
    } else {
      currentUser = null;
      showAuthenticationUI();
      console.log('❌ ユーザー未認証');
    }
  } catch (error) {
    console.error('❌ 認証状態確認エラー:', error);
    showAuthenticationUI();
  }
}

// ==================================================
// UI表示切り替え
// ==================================================

// 認証済みUI表示
function showAuthenticatedUI() {
  const authSection = document.getElementById('auth-section');
  authSection.style.display = 'none';

  document.getElementById('user-info').style.display = 'block';
  document.getElementById('user-name').textContent = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'ユーザー';
  document.getElementById('user-email').textContent = currentUser?.email || '';

  // ヘッダーを再表示
  const header = document.querySelector('.header');
  if (header) {
    header.style.display = 'block';
  }

  // プロジェクト一覧画面を表示
  showProjectsMainScreen();
}

// 認証UI表示
function showAuthenticationUI() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('user-info').style.display = 'none';

  // ヘッダーを非表示
  const header = document.querySelector('.header');
  if (header) {
    header.style.display = 'none';
  }

  // 他のセクションを非表示
  document.querySelectorAll('.section').forEach(section => {
    if (section.id !== 'auth-section') {
      section.style.display = 'none';
    }
  });
}

// アカウントメニューの開閉
function toggleAccountMenu() {
  const menu = document.getElementById('account-menu');
  const arrow = document.getElementById('account-menu-arrow');

  if (menu.style.display === 'none' || menu.style.display === '') {
    menu.style.display = 'block';
    arrow.style.transform = 'rotate(180deg)';
  } else {
    menu.style.display = 'none';
    arrow.style.transform = 'rotate(0deg)';
  }
}

// ログイン・サインアップフォーム切り替え
function showSignupForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'block';
}

function showLoginForm() {
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

// 認証ローディング表示
function showAuthLoading(show) {
  const loadingDiv = document.getElementById('auth-loading');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (show) {
    loadingDiv.style.display = 'block';
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
  } else {
    loadingDiv.style.display = 'none';
    if (document.getElementById('signup-form').style.display === 'block') {
      signupForm.style.display = 'block';
    } else {
      loginForm.style.display = 'block';
    }
  }
}

// ==================================================
// ログイン/ログアウト
// ==================================================

// メールでログイン
async function loginWithEmail() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('❌ メールアドレスとパスワードを入力してください。');
    return;
  }

  showAuthLoading(true);

  try {
    const result = await window.electronAPI.invoke('login-with-email', email, password);

    if (result.success) {
      currentUser = result.user;
      showAuthenticatedUI();

      // AI設定をFirestoreに同期（AIServiceManager準備待ち）
      await ensureAIServiceManagerReady();
      if (window.aiServiceManager && result.user.uid) {
        try {

          if (typeof window.aiServiceManager.onUserLogin === 'function') {
            // ログイン後にFirestore初期化を強制実行
            if (typeof window.aiServiceManager.initializeFirestore === 'function') {
              await window.aiServiceManager.initializeFirestore();
            }
            await window.aiServiceManager.onUserLogin(result.user.uid);
          } else {
            console.warn('⚠️ onUserLogin method not available');
            console.warn('利用可能なメソッド:', Object.getOwnPropertyNames(window.aiServiceManager.__proto__));
          }
        } catch (error) {
          console.error('❌ AI設定同期エラー:', error);
        }
      }

      alert('✅ ログインしました！');
    } else {
      alert('❌ ログインに失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ ログインエラー:', error);
    alert('❌ ログインエラーが発生しました');
  } finally {
    showAuthLoading(false);
  }
}

// メールでサインアップ
async function signupWithEmail() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !password) {
    alert('❌ 全ての項目を入力してください。');
    return;
  }

  if (password.length < 6) {
    alert('❌ パスワードは6文字以上で入力してください。');
    return;
  }

  showAuthLoading(true);

  try {
    const result = await window.electronAPI.invoke('signup-with-email', email, password);

    if (result.success) {
      currentUser = result.user;
      showAuthenticatedUI();
      alert('✅ アカウントを作成しました！');
    } else {
      alert('❌ アカウント作成に失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ サインアップエラー:', error);
    alert('❌ アカウント作成エラーが発生しました');
  } finally {
    showAuthLoading(false);
  }
}

// Googleログイン
async function loginWithGoogle() {
  showAuthLoading(true);

  try {
    const result = await window.electronAPI.invoke('login-with-google');

    if (result.success) {
      currentUser = result.user;
      showAuthenticatedUI();

      // AI設定をFirestoreに同期（AIServiceManager準備待ち）
      await ensureAIServiceManagerReady();
      if (window.aiServiceManager && result.user.uid) {
        try {
          if (typeof window.aiServiceManager.onUserLogin === 'function') {
            // ログイン後にFirestore初期化を強制実行
            if (typeof window.aiServiceManager.initializeFirestore === 'function') {
              await window.aiServiceManager.initializeFirestore();
            }
            await window.aiServiceManager.onUserLogin(result.user.uid);
          } else {
            console.warn('⚠️ onUserLogin method not available');
          }
        } catch (error) {
          console.error('❌ AI設定同期エラー:', error);
        }
      }

      alert('✅ Googleでログインしました！');
    } else {
      alert('❌ Googleログインに失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Googleログインエラー:', error);
    alert('❌ Googleログインエラーが発生しました');
  } finally {
    showAuthLoading(false);
  }
}

// ログアウト
async function logoutUser() {
  const confirmed = confirm('ログアウトしますか？');
  if (!confirmed) return;

  try {
    const result = await window.electronAPI.invoke('logout');

    if (result.success) {
      currentUser = null;

      // AI設定をクリア
      if (window.aiServiceManager) {
        try {
          if (typeof window.aiServiceManager.onUserLogout === 'function') {
            window.aiServiceManager.onUserLogout();
          } else {
            console.warn('⚠️ onUserLogout method not available');
          }
        } catch (error) {
          console.error('❌ AI設定クリアエラー:', error);
        }
      }

      showAuthenticationUI();
      alert('✅ ログアウトしました');
    } else {
      alert('❌ ログアウトに失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ ログアウトエラー:', error);
    alert('❌ ログアウトエラーが発生しました');
  }
}
