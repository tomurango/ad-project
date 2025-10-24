/**
 * app.js - アプリケーション初期化・メインエントリーポイント
 *
 * このファイルにはアプリケーション全体の初期化処理、
 * グローバルイベントリスナー、ユーティリティ関数が含まれます。
 *
 * 主な機能:
 * - アプリケーション初期化
 * - DOMContentLoadedイベントハンドリング
 * - グローバルイベントリスナー（モーダル外クリック、ESCキー等）
 * - プラットフォーム判定（macOS等）
 * - 共通ユーティリティ関数
 *
 * 依存モジュール:
 * - config.js: グローバル変数と設定
 * - auth.js: 認証機能
 * - projects.js: プロジェクト管理
 * - plans.js: プラン管理
 * - posts.js: 投稿管理
 * - ai-service-manager.js: AI生成サービス
 *
 * @requires window.electronAPI - Electron IPCブリッジ
 */

// ========================================
// アプリケーション初期化
// ========================================

/**
 * DOMContentLoaded - アプリケーションメイン初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 アプリケーション初期化開始');

  // Electron API確認
  if (window.electronAPI) {
    console.log('✅ Electron API設定完了');
  } else {
    console.error('❌ Electron APIが見つかりません');
  }

  // Firebase認証初期化
  initializeAuth();

  // AI Service Manager初期化
  if (window.aiServiceManager) {
    console.log('✅ AI Service Manager利用可能');
  }

  // グローバルイベントリスナー登録
  setupGlobalEventListeners();

  // プラットフォーム判定
  detectPlatform();

  console.log('✅ アプリケーション初期化完了');
});

/**
 * 2つ目のDOMContentLoaded - UI初期化とイベントバインディング
 */
document.addEventListener('DOMContentLoaded', async () => {
  // フォームイベントリスナー設定
  setupFormEventListeners();

  // モーダルイベントリスナー設定
  setupModalEventListeners();

  // ボタンイベントリスナー設定
  setupButtonEventListeners();

  // テキストエリア・入力フィールドイベントリスナー
  setupInputEventListeners();

  // 頻度変更イベントリスナー
  setupFrequencyChangeListeners();

  console.log('✅ UI初期化・イベントバインディング完了');
});

// ========================================
// グローバルイベントリスナー
// ========================================

/**
 * グローバルイベントリスナーをセットアップ
 */
function setupGlobalEventListeners() {
  // 外側クリックでメニュー・モーダルを閉じる
  document.addEventListener('click', function(event) {
    // アカウントメニュー外クリック
    const accountMenu = document.getElementById('account-menu');
    const accountMenuBtn = document.getElementById('account-menu-btn');

    if (accountMenu && accountMenuBtn) {
      if (!accountMenuBtn.contains(event.target) && !accountMenu.contains(event.target)) {
        accountMenu.style.display = 'none';
        const arrow = document.getElementById('account-menu-arrow');
        if (arrow) {
          arrow.style.transform = 'rotate(0deg)';
        }
      }
    }

    // AI設定メニュー外クリック
    const aiMenu = document.getElementById('ai-provider-menu');
    const aiMenuBtn = document.getElementById('ai-provider-dropdown');

    if (aiMenu && aiMenuBtn) {
      if (!aiMenuBtn.contains(event.target) && !aiMenu.contains(event.target)) {
        aiMenu.style.display = 'none';
      }
    }
  });

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  // ウィンドウリサイズ時の処理
  window.addEventListener('resize', handleWindowResize);
}

/**
 * フォームイベントリスナーをセットアップ
 */
function setupFormEventListeners() {
  // プラン作成フォーム
  const planCreationForm = document.getElementById('plan-creation-form');
  if (planCreationForm) {
    planCreationForm.addEventListener('submit', submitPlanCreation);
  }

  // 手動投稿フォーム
  const manualPostForm = document.getElementById('manual-post-form');
  if (manualPostForm) {
    manualPostForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitManualPost();
    });
  }

  // 投稿編集フォーム
  const editPostForm = document.getElementById('edit-post-form');
  if (editPostForm) {
    editPostForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await submitEditPost();
    });
  }
}

/**
 * モーダルイベントリスナーをセットアップ
 */
function setupModalEventListeners() {
  // プラットフォーム選択モーダル背景クリック
  const platformModal = document.getElementById('platform-selection-modal');
  if (platformModal) {
    platformModal.addEventListener('click', (event) => {
      handleModalBackdropClick(event, 'platform-selection-modal');
    });
  }

  // プラン作成モーダル背景クリック
  const planCreationModal = document.getElementById('plan-creation-modal');
  if (planCreationModal) {
    planCreationModal.addEventListener('click', (event) => {
      handleModalBackdropClick(event, 'plan-creation-modal');
    });
  }

  // プラン編集モーダル背景クリック
  const planEditModal = document.getElementById('plan-edit-modal');
  if (planEditModal) {
    planEditModal.addEventListener('click', (event) => {
      handleModalBackdropClick(event, 'plan-edit-modal');
    });
  }
}

/**
 * ボタンイベントリスナーをセットアップ
 */
function setupButtonEventListeners() {
  // さらに投稿を読み込むボタン
  const loadMoreBtn = document.getElementById('load-more-posts');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMorePosts);
  }

  // プロジェクト作成ボタン
  const createProjectBtn = document.getElementById('create-project-btn');
  if (createProjectBtn) {
    createProjectBtn.addEventListener('click', openProjectModal);
  }

  // 新規プラン作成ボタン
  const createPlanBtn = document.getElementById('create-plan-btn');
  if (createPlanBtn) {
    createPlanBtn.addEventListener('click', createNewPlan);
  }

  // 手動投稿作成ボタン
  const createManualPostBtn = document.getElementById('create-manual-post-btn');
  if (createManualPostBtn) {
    createManualPostBtn.addEventListener('click', createManualPost);
  }

  // 投稿アシスタントボタン
  const postAssistantBtn = document.getElementById('post-assistant-btn');
  if (postAssistantBtn) {
    postAssistantBtn.addEventListener('click', openPostAssistant);
  }
}

/**
 * 入力フィールドイベントリスナーをセットアップ
 */
function setupInputEventListeners() {
  // Instagramテスト投稿文字数カウント
  const instagramTextarea = document.getElementById('test-instagram-text');
  if (instagramTextarea) {
    instagramTextarea.addEventListener('input', updateTestInstagramCharCount);
  }

  // LinkedInテスト投稿文字数カウント
  const linkedinTextarea = document.getElementById('test-linkedin-text');
  if (linkedinTextarea) {
    linkedinTextarea.addEventListener('input', updateTestLinkedinCharCount);
  }

  // 投稿アシスタント入力でEnterキー送信
  const assistantInput = document.getElementById('post-assistant-input');
  if (assistantInput) {
    assistantInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const message = this.value.trim();
        if (message) {
          generatePostContent(message);
        }
      }
    });
  }

  // 改善モーダル入力でEnterキー送信
  const improveInput = document.getElementById('improve-post-input');
  if (improveInput) {
    improveInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        improvePost();
      }
    });
  }
}

/**
 * 頻度変更イベントリスナーをセットアップ
 */
function setupFrequencyChangeListeners() {
  // プラン作成フォーム頻度変更
  const planFrequency = document.getElementById('plan-frequency');
  if (planFrequency) {
    planFrequency.addEventListener('change', updateFrequencySettings);
  }

  // プラン編集フォーム頻度変更
  const editPlanFrequency = document.getElementById('edit-plan-frequency');
  if (editPlanFrequency) {
    editPlanFrequency.addEventListener('change', updateFrequencySettings);
  }
}

// ========================================
// モーダル制御
// ========================================

/**
 * すべてのモーダルを閉じる
 */
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  });

  // 特定のモーダル用クリーンアップ
  if (window.currentEditingPost) {
    window.currentEditingPost = null;
  }
  if (window.currentEditingPlan) {
    window.currentEditingPlan = null;
  }
  if (window.currentEditingPostAssistant) {
    window.currentEditingPostAssistant = null;
  }
  if (window.currentImprovingPost) {
    window.currentImprovingPost = null;
  }
}

// ========================================
// フォーム送信処理
// ========================================

/**
 * 手動投稿フォームを送信
 */
async function submitManualPost() {
  const planId = document.getElementById('manual-post-plan').value;
  const content = document.getElementById('manual-post-content').value.trim();
  const datetime = document.getElementById('manual-post-datetime').value;

  if (!planId) {
    alert('❌ プランを選択してください');
    return;
  }

  if (!content) {
    alert('❌ 投稿内容を入力してください');
    return;
  }

  if (!datetime) {
    alert('❌ 投稿日時を設定してください');
    return;
  }

  try {
    // 投稿データ作成
    const postData = {
      content: content,
      scheduledAt: new Date(datetime).toISOString(),
      status: 'scheduled',
      type: 'manual',
      platform: document.getElementById('manual-post-plan').selectedOptions[0].text.match(/\((.+)\)/)[1],
      createdAt: new Date().toISOString()
    };

    const result = await window.electronAPI.invoke('firebase-create-post', {
      projectId: currentProjectId,
      planId: planId,
      postData: postData
    });

    if (result.success) {
      alert('✅ 手動投稿を作成しました');
      document.getElementById('manual-post-modal').style.display = 'none';
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 投稿作成エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 手動投稿作成エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿編集フォームを送信
 */
async function submitEditPost() {
  if (!window.currentEditingPost) {
    alert('❌ 編集対象の投稿が見つかりません');
    return;
  }

  const { postId, planId } = window.currentEditingPost;
  const content = document.getElementById('edit-post-content').value.trim();
  const datetime = document.getElementById('edit-post-datetime').value;

  if (!content) {
    alert('❌ 投稿内容を入力してください');
    return;
  }

  if (!datetime) {
    alert('❌ 投稿日時を設定してください');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('firebase-update-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId,
      updateData: {
        content: content,
        scheduledAt: new Date(datetime).toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    if (result.success) {
      alert('✅ 投稿を更新しました');
      document.getElementById('edit-post-modal').style.display = 'none';
      window.currentEditingPost = null;
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 投稿更新エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// ========================================
// プラットフォーム判定
// ========================================

/**
 * プラットフォームを判定（macOS等）
 */
function detectPlatform() {
  const platform = navigator.platform.toLowerCase();

  if (platform.includes('mac')) {
    console.log('🍎 macOS環境を検出');
    document.body.classList.add('platform-mac');
  } else if (platform.includes('win')) {
    console.log('🪟 Windows環境を検出');
    document.body.classList.add('platform-windows');
  } else if (platform.includes('linux')) {
    console.log('🐧 Linux環境を検出');
    document.body.classList.add('platform-linux');
  }
}

// ========================================
// ウィンドウリサイズ処理
// ========================================

/**
 * ウィンドウリサイズ時の処理
 */
function handleWindowResize() {
  // モーダルの位置調整等が必要な場合はここに実装
  console.log('📐 ウィンドウリサイズ:', window.innerWidth, 'x', window.innerHeight);
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 日付を日本語形式でフォーマット
 */
function formatDateJapanese(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 相対時間を取得（例: "3分前", "2時間前"）
 */
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '今';
  } else if (diffMins < 60) {
    return `${diffMins}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    return formatDateJapanese(dateString);
  }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * テキストを切り詰め
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * URLからドメインを抽出
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
}

/**
 * ローディング表示
 */
function showLoading(message = '読み込み中...') {
  const loadingDiv = document.getElementById('global-loading');
  if (loadingDiv) {
    loadingDiv.textContent = message;
    loadingDiv.style.display = 'flex';
  }
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const loadingDiv = document.getElementById('global-loading');
  if (loadingDiv) {
    loadingDiv.style.display = 'none';
  }
}

/**
 * トースト通知を表示
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // スタイル設定
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.zIndex = '10000';
  toast.style.animation = 'slideInRight 0.3s ease-out';

  // タイプ別色設定
  if (type === 'success') {
    toast.style.background = '#17bf63';
    toast.style.color = 'white';
  } else if (type === 'error') {
    toast.style.background = '#e0245e';
    toast.style.color = 'white';
  } else if (type === 'warning') {
    toast.style.background = '#ffad1f';
    toast.style.color = 'white';
  } else {
    toast.style.background = '#1da1f2';
    toast.style.color = 'white';
  }

  document.body.appendChild(toast);

  // 3秒後に自動削除
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * 確認ダイアログ（プロミスベース）
 */
function confirmDialog(message) {
  return new Promise((resolve) => {
    const result = confirm(message);
    resolve(result);
  });
}

/**
 * デバッグ情報をコンソールに出力
 */
function debugInfo() {
  console.log('=== Debug Information ===');
  console.log('Current User:', currentUser);
  console.log('Current Project ID:', currentProjectId);
  console.log('Current Project Name:', currentProjectName);
  console.log('Window Width:', window.innerWidth);
  console.log('Window Height:', window.innerHeight);
  console.log('Platform:', navigator.platform);
  console.log('User Agent:', navigator.userAgent);

  if (window.aiServiceManager) {
    console.log('AI Provider:', window.aiServiceManager.currentProvider);
  }

  console.log('========================');
}

// ========================================
// グローバル関数エクスポート
// ========================================

// デバッグ用にグローバルスコープに公開
window.debugInfo = debugInfo;
window.showToast = showToast;
window.formatDateJapanese = formatDateJapanese;
window.getRelativeTime = getRelativeTime;

// ========================================
// アプリケーション終了時のクリーンアップ
// ========================================

window.addEventListener('beforeunload', () => {
  console.log('👋 アプリケーション終了処理開始');

  // 必要なクリーンアップ処理をここに追加
  // 例: 未保存データの警告、セッション情報のクリア等

  console.log('✅ アプリケーション終了処理完了');
});

// ========================================
// エラーハンドリング
// ========================================

/**
 * グローバルエラーハンドラー
 */
window.addEventListener('error', (event) => {
  console.error('🚨 グローバルエラー:', event.error);

  // ユーザーに通知（本番環境では詳細を隠す）
  if (process.env.NODE_ENV === 'development') {
    showToast(`エラーが発生しました: ${event.error.message}`, 'error');
  } else {
    showToast('エラーが発生しました。再度お試しください。', 'error');
  }
});

/**
 * Promise拒否ハンドラー
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 未処理のPromise拒否:', event.reason);

  // ユーザーに通知
  if (process.env.NODE_ENV === 'development') {
    showToast(`非同期エラー: ${event.reason}`, 'error');
  } else {
    showToast('処理中にエラーが発生しました。', 'error');
  }
});

console.log('✅ app.js読み込み完了');
