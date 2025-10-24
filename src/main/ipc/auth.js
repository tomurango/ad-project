/**
 * Firebase認証 IPCハンドラー
 *
 * ユーザー認証関連のIPC通信を処理
 * - メール・パスワード認証
 * - Google認証
 * - 認証状態の管理
 * - ログアウト処理
 */

const { ipcMain } = require('electron');
const firebaseService = require('../../services/firebase-service');

// ==========================================
// Firebase Authentication 基本IPCハンドラー
// ==========================================

// Firebase認証 - メール・パスワードでログイン
ipcMain.handle('firebase-signin-email', async (event, email, password) => {
  try {
    const result = await firebaseService.signInWithEmail(email, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - アカウント作成
ipcMain.handle('firebase-create-user', async (event, email, password) => {
  try {
    const result = await firebaseService.createUserWithEmail(email, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - Googleでログイン
ipcMain.handle('firebase-signin-google', async (event) => {
  try {
    const result = await firebaseService.signInWithGoogle();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - ログアウト
ipcMain.handle('firebase-signout', async (event) => {
  try {
    const result = await firebaseService.signOut();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - 現在のユーザー取得
ipcMain.handle('firebase-get-current-user', async (event) => {
  try {
    const user = firebaseService.getCurrentUser();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - ログイン状態チェック
ipcMain.handle('firebase-is-logged-in', async (event) => {
  try {
    const isLoggedIn = firebaseService.isLoggedIn();
    return { success: true, isLoggedIn };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Firebase Authentication 専用IPCハンドラー
// ==========================================

// 認証状態を確認
ipcMain.handle('check-auth-state', async (event) => {
  try {
    const user = firebaseService.getCurrentUser();
    const isLoggedIn = firebaseService.isLoggedIn();

    if (isLoggedIn && user) {
      return {
        success: true,
        authenticated: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      return {
        success: true,
        authenticated: false,
        user: null
      };
    }
  } catch (error) {
    console.error('認証状態確認エラー:', error);
    return {
      success: false,
      error: error.message,
      authenticated: false,
      user: null
    };
  }
});

// メール・パスワードでログイン
ipcMain.handle('login-with-email', async (event, email, password) => {
  try {
    console.log('メールログイン試行:', email);

    const result = await firebaseService.signInWithEmail(email, password);

    if (result.success) {
      const user = result.user;
      console.log('ログイン成功:', user.email);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'ログインに失敗しました');
    }
  } catch (error) {
    console.error('メールログインエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// メール・パスワードでサインアップ
ipcMain.handle('signup-with-email', async (event, email, password) => {
  try {
    console.log('メールサインアップ試行:', email);

    const result = await firebaseService.createUserWithEmail(email, password);

    if (result.success) {
      const user = result.user;
      console.log('サインアップ成功:', user.email);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'アカウント作成に失敗しました');
    }
  } catch (error) {
    console.error('メールサインアップエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Googleでログイン
ipcMain.handle('login-with-google', async (event) => {
  try {
    console.log('Googleログイン試行');

    const result = await firebaseService.signInWithGoogle();

    if (result.success) {
      const user = result.user;
      console.log('Googleログイン成功:', user.email);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'Googleログインに失敗しました');
    }
  } catch (error) {
    console.error('Googleログインエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ログアウト
ipcMain.handle('logout', async (event) => {
  try {
    console.log('ログアウト試行');

    const result = await firebaseService.signOut();

    if (result.success) {
      console.log('ログアウト成功');
      return {
        success: true,
        message: 'ログアウトしました'
      };
    } else {
      throw new Error(result.error || 'ログアウトに失敗しました');
    }
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});
