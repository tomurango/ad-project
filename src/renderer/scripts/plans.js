/**
 * plans.js - プラン管理モジュール
 *
 * このファイルにはプランの作成、編集、削除、表示などの機能が含まれます。
 *
 * 主な機能:
 * - プランの読み込み・表示
 * - プランの作成・編集・削除
 * - プラットフォーム別設定
 * - スケジュール管理
 * - カスタムプロンプト管理
 *
 * グローバル変数:
 * - currentProjectId: 現在選択中のプロジェクトID (config.jsで定義)
 * - currentUser: 現在ログイン中のユーザー (auth.jsで定義)
 *
 * @requires window.electronAPI - Electron IPCブリッジ
 */

// ========================================
// ES Modules インポート
// ========================================

import {
  IPC_CHANNELS,
  PLATFORMS,
  FREQUENCIES,
  PLATFORM_LABELS,
  FREQUENCY_LABELS,
  getPlatformLabel,
  getFrequencyLabel
} from './modules/constants.js';

import {
  formatDateTime,
  formatTime,
  toDateString,
  toTimeString
} from './modules/date-utils.js';

import {
  getElementById,
  showModal,
  hideModal,
  getInputValue,
  setInputValue
} from './modules/dom-utils.js';

// ヘルパー関数は constants.js から import済み
// getPlatformLabel, getFrequencyLabel を使用

// ========================================
// プランデータ読み込み・表示
// ========================================

/**
 * プロジェクトのプラン一覧を読み込み・表示
 * @export
 */
export async function loadProjectPlans(projectId) {
  try {
    console.log('📋 プラン一覧読み込み開始:', projectId);

    // 認証状態確認
    if (!currentUser) {
      console.log('ℹ️ 未認証ユーザー - 空のプラン一覧を表示');
      displayPlans([]);
      return { success: true, plans: [] };
    }

    const result = await window.electronAPI.invoke('firebase-get-project-plans', projectId);

    if (result.success) {
      displayPlans(result.plans);
      console.log(`✅ プラン一覧読み込み成功: ${result.plans.length}件`);
    } else {
      console.warn('⚠️ プラン一覧取得に問題がありました:', result.error);
      // エラーでも空の一覧を表示
      displayPlans([]);
    }

    return result;

  } catch (error) {
    console.error('❌ プラン一覧読み込みエラー:', error);
    displayPlansError(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * プラン一覧を表示
 */
function displayPlans(plans) {
  const plansContainer = document.getElementById('project-plans-list');

  if (!plans || plans.length === 0) {
    plansContainer.innerHTML = `
      <div style="text-align: center; color: #657786; padding: 40px;">
        <div style="font-size: 18px; margin-bottom: 10px;">📋</div>
        <div>プランがまだ作成されていません</div>
        <div style="font-size: 14px; margin-top: 5px;">「新規プラン作成」ボタンからプランを作成してください</div>
      </div>
    `;
    return;
  }

  let plansHTML = '';
  plans.forEach(plan => {
    const isActive = plan.isActive !== false;
    const activeClass = isActive ? 'active' : 'inactive';
    const activeText = isActive ? '有効' : '無効';

    plansHTML += `
      <div class="plan-card ${activeClass}">
        <div class="plan-header">
          <h3>${plan.name}</h3>
          <div class="plan-status">
            <span class="status-badge ${activeClass}">${activeText}</span>
            <span class="platform-badge">${getPlatformLabel(plan.platform)}</span>
          </div>
        </div>

        <div class="plan-description">${plan.description || ''}</div>

        <div class="plan-schedule">
          <div class="schedule-item">
            <span class="schedule-label">頻度:</span>
            <span>${getFrequencyLabel(plan.schedule.frequency)}</span>
          </div>
          <div class="schedule-item">
            <span class="schedule-label">投稿時刻:</span>
            <span>${plan.schedule.time}</span>
          </div>
        </div>

        <div class="plan-actions">
          <button onclick="editPlan('${plan.id}')" class="btn-primary">✏️ 編集</button>
          <button onclick="deletePlan('${plan.id}')" class="btn-danger">🗑️ 削除</button>
        </div>
      </div>
    `;
  });

  plansContainer.innerHTML = plansHTML;
}

/**
 * プランエラー表示
 */
function displayPlansError(errorMessage) {
  const plansContainer = document.getElementById('project-plans-list');
  plansContainer.innerHTML = `
    <div style="text-align: center; color: #e0245e; padding: 40px;">
      <div style="font-size: 18px; margin-bottom: 10px;">❌</div>
      <div>プラン一覧の読み込みに失敗しました</div>
      <div style="font-size: 14px; margin-top: 10px; color: #657786;">${errorMessage}</div>
    </div>
  `;
}

// ========================================
// プラン作成・編集・削除
// ========================================

/**
 * 新規プラン作成（モーダル表示）
 * @export
 */
export function createNewPlan() {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  // プラットフォーム選択モーダルを表示
  document.getElementById('platform-selection-modal').style.display = 'block';

  // プラットフォームカードにホバー効果を追加
  addPlatformCardHoverEffects();
}

/**
 * プラットフォーム選択モーダルを閉じる
 * @export
 */
export function closePlatformSelectionModal() {
  document.getElementById('platform-selection-modal').style.display = 'none';
}

/**
 * プラットフォーム選択後のプラン作成
 * @export
 */
export function selectPlatformForPlan(platform) {
  // プラットフォーム選択モーダルを閉じる
  closePlatformSelectionModal();

  // 選択されたプラットフォームを記録
  window.selectedPlatform = platform;

  // プラン作成モーダルを初期化して表示
  initializePlanCreationModal(platform);
}

/**
 * プラン作成モーダルを初期化
 */
function initializePlanCreationModal(platform) {
  // プラットフォームタイトルを設定
  document.getElementById('plan-platform-title').textContent = getPlatformLabel(platform);

  // フォームをリセット
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-description').value = '';
  document.getElementById('plan-custom-prompt').value = '';

  // デフォルト値を設定
  applyPlatformDefaults(platform);

  // プラットフォーム固有UIを設定
  setupPlatformSpecificUI(platform);

  // モーダルを表示
  document.getElementById('plan-creation-modal').style.display = 'block';
}

/**
 * プラン作成モーダルを閉じる
 * @export
 */
export function closePlanCreationModal() {
  document.getElementById('plan-creation-modal').style.display = 'none';
  window.selectedPlatform = null;
}

/**
 * プラン作成フォームを送信
 * @export
 */
// プラン作成の重複実行防止フラグ
let isCreatingPlan = false;

export async function submitPlanCreation(event) {
  event.preventDefault();

  // 重複実行防止
  if (isCreatingPlan) {
    console.log('⚠️ プラン作成処理が既に実行中です');
    return;
  }

  if (!currentProjectId || !window.selectedPlatform) {
    alert('プロジェクトまたはプラットフォームが選択されていません');
    return;
  }

  isCreatingPlan = true;

  try {
    // フォームデータ収集
    const planData = collectPlanFormData();

    // データ検証
    const validationResult = validatePlanData(planData);
    if (!validationResult.valid) {
      alert('❌ ' + validationResult.error);
      isCreatingPlan = false;
      return;
    }

    // プラン作成
    const result = await window.electronAPI.invoke('firebase-create-plan', {
      projectId: currentProjectId,
      planData: planData
    });

    if (result.success) {
      alert('✅ プランを作成しました');
      closePlanCreationModal();
      await loadProjectPlans(currentProjectId);
    } else {
      alert('❌ プラン作成エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ プラン作成エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  } finally {
    isCreatingPlan = false;
  }
}

/**
 * プランフォームデータを収集
 */
function collectPlanFormData() {
  const platform = window.selectedPlatform;
  const frequency = document.getElementById('plan-frequency').value;

  const planData = {
    name: document.getElementById('plan-name').value.trim(),
    description: document.getElementById('plan-description').value.trim(),
    platform: platform,
    schedule: {
      frequency: frequency,  // ← 正規化: scheduleオブジェクト内に統一
      time: document.getElementById('plan-time').value,
      enabled: true
    },
    customPrompt: document.getElementById('plan-custom-prompt').value.trim(),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  // 頻度別の追加設定
  if (frequency === 'weekly') {
    const selectedWeekday = parseInt(document.getElementById('plan-weekday').value);
    // 曜日番号を文字列に変換（Cloud Functions形式）
    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    planData.schedule.weekdays = [weekdayNames[selectedWeekday]];  // 配列形式で統一
  } else if (frequency === 'monthly') {
    planData.schedule.dayOfMonth = parseInt(document.getElementById('plan-day').value);  // フィールド名統一
  }

  // プラットフォーム固有の設定
  if (platform === 'instagram') {
    const hashtagsEl = document.getElementById('instagram-hashtags');
    const imageSourceEl = document.getElementById('instagram-image-source');
    if (hashtagsEl && imageSourceEl) {
      planData.instagram = {
        includeHashtags: hashtagsEl.checked,
        imageSource: imageSourceEl.value
      };
    }
  } else if (platform === 'linkedin') {
    const postTypeEl = document.getElementById('linkedin-post-type');
    if (postTypeEl) {
      planData.linkedin = {
        postType: postTypeEl.value,
        includeProfessionalTone: true
      };
    }
  }

  return planData;
}

/**
 * プランデータを検証
 */
function validatePlanData(planData) {
  if (!planData.name || planData.name.length < 1) {
    return { valid: false, error: 'プラン名を入力してください' };
  }

  if (!planData.schedule.time) {
    return { valid: false, error: '投稿時刻を設定してください' };
  }

  if (planData.schedule.frequency === 'weekly' && !planData.schedule.weekday) {
    return { valid: false, error: '曜日を選択してください' };
  }

  if (planData.schedule.frequency === 'monthly' && !planData.schedule.day) {
    return { valid: false, error: '日付を選択してください' };
  }

  return { valid: true };
}

/**
 * プランを編集
 * @export
 */
export async function editPlan(planId) {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // プランデータ取得
    const result = await window.electronAPI.invoke('firebase-get-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    if (!result.success) {
      alert('❌ プランデータの取得に失敗しました: ' + result.error);
      return;
    }

    const plan = result.plan;

    // 編集モーダルを表示
    showPlanEditModal(plan);

  } catch (error) {
    console.error('❌ プラン編集エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * プラン編集モーダルを表示
 */
function showPlanEditModal(plan) {
  // フォームにデータを設定
  document.getElementById('edit-plan-name').value = plan.name;
  document.getElementById('edit-plan-description').value = plan.description || '';
  document.getElementById('edit-plan-frequency').value = plan.schedule.frequency;
  document.getElementById('edit-plan-time').value = plan.schedule.time;
  document.getElementById('edit-plan-active').checked = plan.isActive !== false;
  document.getElementById('edit-plan-custom-prompt').value = plan.customPrompt || '';

  // 頻度別の設定を表示
  updateFrequencySettings();

  if (plan.schedule.frequency === 'weekly') {
    document.getElementById('edit-plan-weekday').value = plan.schedule.weekday || 1;
  } else if (plan.schedule.frequency === 'monthly') {
    document.getElementById('edit-plan-day').value = plan.schedule.day || 1;
  }

  // 編集対象のIDを保存
  window.currentEditingPlan = { planId: plan.id };

  // モーダルを表示
  document.getElementById('plan-edit-modal').style.display = 'block';
}

/**
 * プラン編集モーダルを閉じる
 * @export
 */
export function closePlanEditModal() {
  document.getElementById('plan-edit-modal').style.display = 'none';
  window.currentEditingPlan = null;
}

/**
 * プラン編集を保存
 * @export
 */
// プラン編集の重複実行防止フラグ
let isSavingPlan = false;

export async function savePlanEdit(planId) {
  // 重複実行防止
  if (isSavingPlan) {
    console.log('⚠️ プラン保存処理が既に実行中です');
    return;
  }

  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  isSavingPlan = true;

  try {
    const frequency = document.getElementById('edit-plan-frequency').value;

    // 更新データ収集
    const updateData = {
      name: document.getElementById('edit-plan-name').value.trim(),
      description: document.getElementById('edit-plan-description').value.trim(),
      schedule: {
        frequency: frequency,
        time: document.getElementById('edit-plan-time').value,
        enabled: true
      },
      customPrompt: document.getElementById('edit-plan-custom-prompt').value.trim(),
      isActive: document.getElementById('edit-plan-active').checked,
      updatedAt: new Date().toISOString()
    };

    // 頻度別の追加設定
    if (frequency === 'weekly') {
      updateData.schedule.weekday = parseInt(document.getElementById('edit-plan-weekday').value);
    } else if (frequency === 'monthly') {
      updateData.schedule.day = parseInt(document.getElementById('edit-plan-day').value);
    }

    // データ検証
    const validationResult = validatePlanData(updateData);
    if (!validationResult.valid) {
      alert('❌ ' + validationResult.error);
      isSavingPlan = false;
      return;
    }

    // プラン更新
    const result = await window.electronAPI.invoke('firebase-update-plan', {
      projectId: currentProjectId,
      planId: planId,
      updateData: updateData
    });

    if (result.success) {
      alert('✅ プランを更新しました');
      closePlanEditModal();
      await loadProjectPlans(currentProjectId);
    } else {
      alert('❌ プラン更新エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ プラン更新エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  } finally {
    isSavingPlan = false;
  }
}

/**
 * プランを削除
 * @export
 */
export async function deletePlan(planId) {
  if (!confirm('このプランを削除しますか？\n\nこのプランに紐づく投稿もすべて削除されます。')) {
    return;
  }

  try {
    const result = await window.electronAPI.invoke('firebase-delete-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    if (result.success) {
      alert('✅ プランを削除しました');
      await loadProjectPlans(currentProjectId);
      await loadProjectPosts(currentProjectId); // 投稿一覧も更新
    } else {
      alert('❌ プラン削除エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ プラン削除エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// ========================================
// プラットフォーム固有の処理
// ========================================

/**
 * プラットフォームのデフォルト値を適用
 */
function applyPlatformDefaults(platform) {
  document.getElementById('plan-frequency').value = getPlatformDefaultFrequency(platform);
  document.getElementById('plan-time').value = getPlatformDefaultTime(platform);
}

/**
 * プラットフォーム固有のUIをセットアップ
 */
function setupPlatformSpecificUI(platform) {
  // プラットフォーム固有の設定セクションを表示/非表示
  const twitterSettings = document.getElementById('twitter-specific-settings');
  const instagramSettings = document.getElementById('instagram-specific-settings');
  const linkedinSettings = document.getElementById('linkedin-specific-settings');

  // すべて非表示
  if (twitterSettings) twitterSettings.style.display = 'none';
  if (instagramSettings) instagramSettings.style.display = 'none';
  if (linkedinSettings) linkedinSettings.style.display = 'none';

  // 該当するプラットフォームのみ表示
  if (platform === 'twitter' && twitterSettings) {
    twitterSettings.style.display = 'block';
  } else if (platform === 'instagram' && instagramSettings) {
    instagramSettings.style.display = 'block';
  } else if (platform === 'linkedin' && linkedinSettings) {
    linkedinSettings.style.display = 'block';
  }
}

/**
 * プラットフォームのデフォルト頻度を取得
 */
function getPlatformDefaultFrequency(platform) {
  const defaults = {
    'twitter': 'daily',
    'instagram': 'weekly',
    'linkedin': 'weekly',
    'facebook': 'weekly'
  };
  return defaults[platform] || 'daily';
}

/**
 * プラットフォームのデフォルト時刻を取得
 */
function getPlatformDefaultTime(platform) {
  const defaults = {
    'twitter': '10:00',
    'instagram': '12:00',
    'linkedin': '09:00',
    'facebook': '18:00'
  };
  return defaults[platform] || '10:00';
}

// getPlatformDisplayName は constants.js の getPlatformLabel として import済み

// ========================================
// スケジュール設定
// ========================================

/**
 * 頻度設定を更新（週次/月次の追加フィールド表示）
 * @export
 */
export function updateFrequencySettings() {
  const frequency = document.getElementById('edit-plan-frequency')?.value ||
                    document.getElementById('plan-frequency')?.value;

  const weekdayField = document.getElementById('plan-weekday-field') ||
                       document.getElementById('edit-plan-weekday-field');
  const dayField = document.getElementById('plan-day-field') ||
                   document.getElementById('edit-plan-day-field');

  if (weekdayField && dayField) {
    if (frequency === 'weekly') {
      weekdayField.style.display = 'block';
      dayField.style.display = 'none';
    } else if (frequency === 'monthly') {
      weekdayField.style.display = 'none';
      dayField.style.display = 'block';
    } else {
      weekdayField.style.display = 'none';
      dayField.style.display = 'none';
    }
  }
}

// getFrequencyText は constants.js の getFrequencyLabel として import済み

// ========================================
// UI補助関数
// ========================================

/**
 * プラットフォームカードにホバー効果を追加
 */
function addPlatformCardHoverEffects() {
  const cards = document.querySelectorAll('.platform-card');

  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-4px)';
      this.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
    });

    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    });
  });
}

/**
 * モーダル背景クリックで閉じる
 */
function handleModalBackdropClick(event, modalId) {
  const modal = document.getElementById(modalId);

  if (event.target === modal) {
    if (modalId === 'platform-selection-modal') {
      closePlatformSelectionModal();
    } else if (modalId === 'plan-creation-modal') {
      closePlanCreationModal();
    } else if (modalId === 'plan-edit-modal') {
      closePlanEditModal();
    }
  }
}

/**
 * 成功メッセージを表示
 */
function showSuccessMessage(message) {
  alert('✅ ' + message);
}

/**
 * エラーメッセージを表示
 */
function showErrorMessage(message) {
  alert('❌ ' + message);
}

// ========================================
// プラットフォーム認証・連携（Instagram, LinkedIn等）
// ========================================

/**
 * Instagram認証情報を保存
 */
async function saveInstagramCredentials() {
  const username = document.getElementById('instagram-username').value.trim();
  const password = document.getElementById('instagram-password').value.trim();

  if (!username || !password) {
    alert('❌ ユーザー名とパスワードを入力してください');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('save-instagram-credentials', {
      projectId: currentProjectId,
      username: username,
      password: password
    });

    if (result.success) {
      alert('✅ Instagram認証情報を保存しました');
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ Instagram認証保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * LinkedIn認証情報を保存
 */
async function saveLinkedinCredentials() {
  const email = document.getElementById('linkedin-email').value.trim();
  const password = document.getElementById('linkedin-password').value.trim();

  if (!email || !password) {
    alert('❌ メールアドレスとパスワードを入力してください');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('save-linkedin-credentials', {
      projectId: currentProjectId,
      email: email,
      password: password
    });

    if (result.success) {
      alert('✅ LinkedIn認証情報を保存しました');
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ LinkedIn認証保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * Instagram認証情報をクリア
 */
async function clearInstagramCredentials() {
  if (!confirm('Instagram認証情報を削除しますか？')) {
    return;
  }

  try {
    const result = await window.electronAPI.invoke('clear-instagram-credentials', {
      projectId: currentProjectId
    });

    if (result.success) {
      alert('✅ Instagram認証情報を削除しました');
      document.getElementById('instagram-username').value = '';
      document.getElementById('instagram-password').value = '';
    } else {
      alert('❌ 削除エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ Instagram認証削除エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * LinkedIn認証情報をクリア
 */
async function clearLinkedinCredentials() {
  if (!confirm('LinkedIn認証情報を削除しますか？')) {
    return;
  }

  try {
    const result = await window.electronAPI.invoke('clear-linkedin-credentials', {
      projectId: currentProjectId
    });

    if (result.success) {
      alert('✅ LinkedIn認証情報を削除しました');
      document.getElementById('linkedin-email').value = '';
      document.getElementById('linkedin-password').value = '';
    } else {
      alert('❌ 削除エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ LinkedIn認証削除エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * Instagram接続テスト
 */
async function testInstagramConnection() {
  alert('Instagram接続テスト機能は準備中です');
}

/**
 * LinkedIn接続テスト
 */
async function testLinkedinConnection() {
  alert('LinkedIn接続テスト機能は準備中です');
}

/**
 * プラットフォームタブを切り替え
 */
function switchPlatformTab(platform) {
  // すべてのタブコンテンツを非表示
  const tabContents = document.querySelectorAll('.platform-tab-content');
  tabContents.forEach(content => {
    content.style.display = 'none';
  });

  // すべてのタブボタンを非アクティブ
  const tabButtons = document.querySelectorAll('.platform-tab-button');
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });

  // 選択されたタブを表示
  const selectedContent = document.getElementById(`${platform}-tab-content`);
  if (selectedContent) {
    selectedContent.style.display = 'block';
  }

  // 選択されたタブボタンをアクティブ
  const selectedButton = document.querySelector(`[onclick="switchPlatformTab('${platform}')"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }
}

/**
 * プラットフォーム認証タブを切り替え
 */
function switchPlatformAuthTab(platform, tabName) {
  const authTabContents = document.querySelectorAll(`.${platform}-auth-tab-content`);
  authTabContents.forEach(content => {
    content.style.display = 'none';
  });

  const authTabButtons = document.querySelectorAll(`.${platform}-auth-tab-button`);
  authTabButtons.forEach(button => {
    button.classList.remove('active');
  });

  const selectedContent = document.getElementById(`${platform}-${tabName}-tab`);
  if (selectedContent) {
    selectedContent.style.display = 'block';
  }

  const selectedButton = document.querySelector(`[onclick="switchPlatformAuthTab('${platform}', '${tabName}')"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }
}

// ========================================
// テスト投稿機能
// ========================================

/**
 * Instagramテスト投稿
 */
async function postTestInstagram() {
  const text = document.getElementById('test-instagram-text').value.trim();

  if (!text) {
    alert('❌ テキストを入力してください');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('post-test-instagram', {
      projectId: currentProjectId,
      text: text
    });

    if (result.success) {
      alert('✅ Instagramにテスト投稿しました');
    } else {
      alert('❌ 投稿エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ Instagramテスト投稿エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * LinkedInテスト投稿
 */
async function postTestLinkedin() {
  const text = document.getElementById('test-linkedin-text').value.trim();

  if (!text) {
    alert('❌ テキストを入力してください');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('post-test-linkedin', {
      projectId: currentProjectId,
      text: text
    });

    if (result.success) {
      alert('✅ LinkedInにテスト投稿しました');
    } else {
      alert('❌ 投稿エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ LinkedInテスト投稿エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * Instagramテキストの文字数をカウント
 */
function updateTestInstagramCharCount() {
  const text = document.getElementById('test-instagram-text')?.value || '';
  const counter = document.getElementById('instagram-char-count');

  if (counter) {
    counter.textContent = `${text.length} / 2200文字`;
  }
}

/**
 * LinkedInテキストの文字数をカウント
 */
function updateTestLinkedinCharCount() {
  const text = document.getElementById('test-linkedin-text')?.value || '';
  const counter = document.getElementById('linkedin-char-count');

  if (counter) {
    counter.textContent = `${text.length} / 3000文字`;
  }
}

// ========================================
// カスタムプロンプト管理
// ========================================

/**
 * プランのカスタムプロンプトを保存
 */
async function savePlanCustomPrompt(customPrompt) {
  if (!window.currentEditingPlan) {
    return { success: false, error: '編集対象のプランが見つかりません' };
  }

  try {
    const result = await window.electronAPI.invoke('firebase-update-plan', {
      projectId: currentProjectId,
      planId: window.currentEditingPlan.planId,
      updateData: {
        customPrompt: customPrompt,
        updatedAt: new Date().toISOString()
      }
    });

    return result;

  } catch (error) {
    console.error('❌ カスタムプロンプト保存エラー:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// ES Modules: HTML onclick用にwindowに公開
// ========================================

// HTML onclick属性から呼び出される関数をwindowに公開
if (typeof window !== 'undefined') {
  window.loadProjectPlans = loadProjectPlans;
  window.createNewPlan = createNewPlan;
  window.closePlatformSelectionModal = closePlatformSelectionModal;
  window.selectPlatformForPlan = selectPlatformForPlan;
  window.closePlanCreationModal = closePlanCreationModal;
  window.submitPlanCreation = submitPlanCreation;
  window.editPlan = editPlan;
  window.closePlanEditModal = closePlanEditModal;
  window.savePlanEdit = savePlanEdit;
  window.deletePlan = deletePlan;
  window.updateFrequencySettings = updateFrequencySettings;

  console.log('✅ plans.js (ES Module) loaded and functions exposed to window');
}
