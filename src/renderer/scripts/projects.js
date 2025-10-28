/**
 * projects.js
 *
 * プロジェクト管理関連の全関数
 * - プロジェクト作成/編集/削除
 * - プロジェクト一覧表示
 * - プロジェクト詳細表示
 * - プラン管理
 */

// ========================================
// ES Modules インポート
// ========================================

import { loadProjectPlans } from './plans.js';
import { loadProjectPosts } from './posts.js';

import {
  getPlatformLabel,
  getFrequencyLabel
} from './modules/constants.js';

import {
  formatDateTime
} from './modules/date-utils.js';

// ==================================================
// プロジェクト一覧表示
// ==================================================

// プロジェクト一覧メイン画面表示
function showProjectsMainScreen() {
  // 全セクションを非表示
  document.querySelectorAll('.section').forEach(section => {
    section.style.display = 'none';
  });

  // プロジェクト一覧セクションのみ表示
  const projectsSection = document.getElementById('projects-section');

  if (projectsSection) {
    projectsSection.style.display = 'block';

    // AI設定UIを更新
    if (typeof updateAIStatus === 'function') {
      updateAIStatus();
    }
    if (typeof syncAIProviderSelectors === 'function') {
      syncAIProviderSelectors();
    }

    // プロジェクト一覧を更新
    refreshProjectList();

  } else {
    console.error('❌ プロジェクト一覧セクションが見つかりません');
  }
}

// プロジェクト一覧を更新（Firestore統合版）
async function refreshProjectList() {
  // 認証状態確認
  if (!currentUser) {
    console.log('❌ 未認証ユーザー - プロジェクト一覧は表示できません');
    displayProjectList([]);
    return;
  }

  try {
    // Firestoreからプロジェクト一覧を取得
    const result = await window.electronAPI.invoke('get-firestore-projects');
    console.log('Firestoreプロジェクト一覧取得結果:', result);

    if (result.success) {
      const projects = result.projects || [];
      displayProjectList(projects);
    } else {
      console.error('❌ Firestoreプロジェクト一覧取得失敗:', result.error);
      displayProjectList([]);
      console.log('ℹ️ プロジェクトが見つかりませんでした');
    }
  } catch (error) {
    console.error('❌ プロジェクト一覧取得エラー:', error);
    // エラー時も空の配列で表示を更新
    displayProjectList([]);
  }
}

// プロジェクト一覧を表示
function displayProjectList(projects) {
  const projectList = document.getElementById('projectList');
  const emptyState = document.getElementById('emptyProjectState');

  // プロジェクト管理セクション全体の表示状態も確認
  const projectsSection = document.getElementById('projects-section');
  if (projectsSection) {
    // 強制的にプロジェクトセクションを表示
    projectsSection.style.display = 'block';
    projectsSection.style.visibility = 'visible';
    projectsSection.style.opacity = '1';
    projectsSection.classList.add('active');

    // 他のセクションを非アクティブ化
    document.querySelectorAll('.section').forEach(section => {
      if (section.id !== 'projects-section') {
        section.classList.remove('active');
        section.style.display = 'none';
      }
    });
  }

  if (!projects || projects.length === 0) {
    // 既存のプロジェクト表示をクリア（空の状態要素は保持）
    if (projectList) {
      // 空の状態要素以外の子要素を削除
      const children = Array.from(projectList.children);
      children.forEach(child => {
        if (child.id !== 'emptyProjectState') {
          child.remove();
        }
      });
    }
    // 空の状態を表示
    if (emptyState) {
      emptyState.style.display = 'block';
    } else {
      // 空の状態要素を動的に作成
      const newEmptyState = document.createElement('div');
      newEmptyState.id = 'emptyProjectState';
      newEmptyState.className = 'empty-state';
      newEmptyState.style.display = 'block';
      newEmptyState.innerHTML = `
        <div class="project-item" onclick="openProjectModal()" style="cursor: pointer; border: 2px dashed var(--primary); background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); transition: all 0.3s ease; position: relative; overflow: hidden; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 60px 40px; position: relative; z-index: 1;">
            <div style="font-size: 64px; margin-bottom: 20px; color: var(--primary);">➕</div>
            <h4 style="color: var(--primary); margin: 0 0 15px 0; font-size: 24px;">最初のプロジェクトを作成</h4>
            <p style="color: #657786; margin: 0; font-size: 16px; line-height: 1.6;">
              プロジェクトを登録すると、AI自動投稿や<br>スケジュール管理ができるようになります
            </p>
            <p style="color: var(--primary); margin: 15px 0 0 0; font-size: 14px; font-weight: bold;">
              クリックして始める →
            </p>
          </div>
          <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(29,161,242,0.1) 0%, transparent 70%); pointer-events: none;"></div>
        </div>
      `;

      if (projectList) {
        projectList.appendChild(newEmptyState);
      }
    }
    return;
  }

  // プロジェクトがある場合は空の状態を非表示
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  let html = '';
  projects.forEach(project => {
    html += `
      <div class="project-item" onclick="viewProjectDetail('${project.id}')">
        <div class="project-header">
          <h4 class="project-title">${project.name}</h4>
          <span class="project-category">${getCategoryName(project.category)}</span>
        </div>
        <div class="project-description">${project.description || '説明なし'}</div>
      </div>
    `;
  });

  // 新規プロジェクト追加カード
  html += `
    <div class="project-item" onclick="openProjectModal()" style="cursor: pointer; border: 2px dashed var(--primary); background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); transition: all 0.3s ease; position: relative; overflow: hidden;">
      <div style="text-align: center; padding: 40px 20px; position: relative; z-index: 1;">
        <div style="font-size: 48px; margin-bottom: 15px; color: var(--primary);">➕</div>
        <h4 style="color: var(--primary); margin: 0 0 10px 0; font-size: 18px;">新しいプロジェクトを作成</h4>
        <p style="color: #657786; margin: 0; font-size: 14px;">
          クリックしてプロジェクトを登録
        </p>
      </div>
      <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(29,161,242,0.1) 0%, transparent 70%); pointer-events: none;"></div>
    </div>
  `;

  projectList.innerHTML = html;
}

// ==================================================
// プロジェクト作成/編集/削除
// ==================================================

// モーダル開閉関数
function openProjectModal() {
  document.getElementById('projectModalOverlay').style.display = 'block';
  document.getElementById('projectModal').style.display = 'block';
  // フォームをリセット
  resetProjectForm();
}

function closeProjectModal() {
  document.getElementById('projectModalOverlay').style.display = 'none';
  document.getElementById('projectModal').style.display = 'none';
}

// プロジェクトを登録
async function registerProject() {
  // 認証状態確認
  if (!currentUser) {
    alert('❌ プロジェクト登録にはログインが必要です。');
    return;
  }

  const projectData = {
    name: document.getElementById('newProjectName').value.trim(),
    description: document.getElementById('newProjectDescription').value.trim(),
    category: document.getElementById('newProjectCategory').value
  };

  if (!projectData.name) {
    alert('❌ プロジェクト名は必須です。');
    return;
  }

  try {
    // Firestoreにプロジェクトを登録
    const result = await window.electronAPI.invoke('create-firestore-project', projectData);
    if (result.success) {
      alert('✅ プロジェクトをFirestoreに登録しました！');
      closeProjectModal();
      resetProjectForm();
      refreshProjectList();
    } else {
      alert(`❌ プロジェクト登録エラー: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ プロジェクト登録エラー:', error);
    alert(`❌ プロジェクト登録エラー: ${error.message}`);
  }
}

// プロジェクトフォームをリセット
function resetProjectForm() {
  document.getElementById('newProjectName').value = '';
  document.getElementById('newProjectDescription').value = '';
  document.getElementById('newProjectCategory').value = 'web';
}

// プロジェクト編集
function editProjectDetail() {
  const projectId = currentProjectId;
  if (!projectId) {
    alert('❌ プロジェクトIDが見つかりません');
    return;
  }
  editProject(projectId);
}

async function editProject(projectId) {
  try {
    const result = await window.electronAPI.invoke('get-firestore-project', projectId);

    if (result.success) {
      const project = result.project;

      // 編集モーダルを開く
      const modal = document.getElementById('editProjectModal');
      modal.style.display = 'block';
      document.getElementById('editProjectModalOverlay').style.display = 'block';

      // フォームに値を設定
      document.getElementById('editProjectId').value = projectId;
      document.getElementById('editProjectName').value = project.name;
      document.getElementById('editProjectDescription').value = project.description || '';
      document.getElementById('editProjectCategory').value = project.category || 'web';
    } else {
      alert('❌ プロジェクト情報の取得に失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ プロジェクト編集エラー:', error);
    alert('❌ プロジェクト編集エラーが発生しました');
  }
}

function closeEditProjectModal() {
  document.getElementById('editProjectModal').style.display = 'none';
  document.getElementById('editProjectModalOverlay').style.display = 'none';
}

async function saveProjectChanges() {
  const projectId = document.getElementById('editProjectId').value;
  const projectData = {
    name: document.getElementById('editProjectName').value.trim(),
    description: document.getElementById('editProjectDescription').value.trim(),
    category: document.getElementById('editProjectCategory').value
  };

  if (!projectData.name) {
    alert('❌ プロジェクト名は必須です。');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('update-firestore-project', projectId, projectData);
    if (result.success) {
      alert('✅ プロジェクトを更新しました！');
      closeEditProjectModal();

      // プロジェクト詳細表示を更新
      if (currentProjectId === projectId) {
        viewProjectDetail(projectId);
      } else {
        refreshProjectList();
      }
    } else {
      alert(`❌ プロジェクト更新エラー: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ プロジェクト更新エラー:', error);
    alert('❌ プロジェクト更新エラーが発生しました');
  }
}

// プロジェクト削除
async function deleteProjectFromDetail() {
  const projectId = currentProjectId;
  const projectName = currentProjectData?.name || 'このプロジェクト';

  await deleteProject(projectId, projectName);
}

async function deleteProject(projectId, projectName) {
  const confirmed = confirm(`本当に「${projectName}」を削除しますか？\n\n⚠️ この操作は取り消せません。`);
  if (!confirmed) return;

  try {
    const result = await window.electronAPI.invoke('delete-firestore-project', projectId);
    if (result.success) {
      alert('✅ プロジェクトを削除しました');
      backToProjectList();
    } else {
      alert(`❌ プロジェクト削除エラー: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ プロジェクト削除エラー:', error);
    alert('❌ プロジェクト削除エラーが発生しました');
  }
}

// ==================================================
// プロジェクト詳細表示
// ==================================================

// プロジェクト詳細画面を表示
async function viewProjectDetail(projectId) {
  try {
    currentProjectId = projectId;

    // プロジェクト詳細データを取得
    const result = await window.electronAPI.invoke('get-firestore-project', projectId);

    if (result.success) {
      currentProjectData = result.project;

      // 詳細画面を表示
      showProjectDetailScreen();

      // DOM要素が利用可能になってからプロジェクト詳細情報を表示
      setTimeout(() => {
        displayProjectDetailInfo(currentProjectData);
      }, 100);

    } else {
      alert('❌ プロジェクト詳細の取得に失敗しました: ' + result.error);
    }
  } catch (error) {
    console.error('❌ プロジェクト詳細表示エラー:', error);
    alert('❌ プロジェクト詳細の表示中にエラーが発生しました');
  }
}

// プロジェクト詳細画面に遷移
function showProjectDetailScreen() {
  // プロジェクト一覧画面を非表示
  document.getElementById('projects-section').style.display = 'none';
  document.getElementById('projects-section').classList.remove('active');

  // 詳細画面を表示
  document.getElementById('project-detail-section').style.display = 'block';
  document.getElementById('project-detail-section').classList.add('active');
}

// プロジェクト一覧画面に戻る
function backToProjectList() {
  // プロジェクト一覧メイン画面を表示
  showProjectsMainScreen();

  // データをクリア
  currentProjectId = null;
  currentProjectData = null;
}

// プロジェクト詳細情報を表示
function displayProjectDetailInfo(project) {
  console.log('📖 プロジェクト詳細情報表示開始:', project.name);

  // DOM要素の存在確認
  const titleElement = document.getElementById('project-detail-title');
  const basicInfoElement = document.getElementById('project-basic-info');

  if (!titleElement || !basicInfoElement) {
    console.error('❌ プロジェクト詳細画面のDOM要素が見つかりません');
    return;
  }

  // タイトルを更新
  titleElement.textContent = `📖 ${project.name} - 投稿管理`;

  // 基本情報を表示
  const basicInfoHtml = `
    <div style="display: grid; gap: 15px;">
      <div class="info-row" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e1e8ed;">
        <span style="font-weight: bold; color: #657786;">プロジェクト名:</span>
        <span>${project.name}</span>
      </div>
      <div class="info-row" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e1e8ed;">
        <span style="font-weight: bold; color: #657786;">カテゴリ:</span>
        <span>${getCategoryName(project.category)}</span>
      </div>
      <div class="info-row" style="padding: 10px 0;">
        <div style="font-weight: bold; color: #657786; margin-bottom: 8px;">説明:</div>
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; line-height: 1.5; font-size: 14px;">
          ${project.description || '説明が設定されていません'}
        </div>
      </div>
      <div class="info-row" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e1e8ed;">
        <span style="font-weight: bold; color: #657786;">登録日:</span>
        <span>${new Date(project.createdAt).toLocaleDateString('ja-JP')}</span>
      </div>
    </div>
  `;

  basicInfoElement.innerHTML = basicInfoHtml;

  // 統計情報を更新（仮のデータ）
  const totalTweetsEl = document.getElementById('total-tweets');
  const aiGeneratedEl = document.getElementById('ai-generated');
  const scheduledCountEl = document.getElementById('scheduled-count');
  const lastPostedEl = document.getElementById('last-posted');

  if (totalTweetsEl) totalTweetsEl.textContent = '0';
  if (aiGeneratedEl) aiGeneratedEl.textContent = '0';
  if (scheduledCountEl) scheduledCountEl.textContent = '0';
  if (lastPostedEl) lastPostedEl.textContent = 'なし';

  // プラットフォーム状況を更新
  updatePlatformStatus();

  // 投稿予約状況を更新
  updateSchedulingStatus();

  // Twitter連携状態を表示
  displayTwitterAuthStatus(project.id || currentProjectId);

  // Bluesky連携状態を表示
  displayBlueskyAuthStatus();

  // プランと投稿データを読み込み
  const projectId = project.id || currentProjectId;
  console.log('📊 プロジェクトIDでデータ読み込み開始:', projectId);
  if (projectId) {
    // ES Modules importで読み込んだ関数を直接呼び出し
    loadProjectPlans(projectId);
    loadProjectPosts(projectId);
  } else {
    console.warn('⚠️ プロジェクトIDが未設定です');
  }
}

// プラットフォーム連携状況を更新
async function updatePlatformStatus() {
  try {
    // Twitter API状況を確認
    const twitterResult = await window.electronAPI.invoke('twitter-test-connection');
    updateTwitterStatus(twitterResult.success);
  } catch (error) {
    console.log('Twitter API状況確認エラー:', error);
    updateTwitterStatus(false);
  }
}

// Twitter連携状態を更新
function updateTwitterStatus(isConnected) {
  const badge = document.getElementById('x-connection-badge');
  if (!badge) return;

  if (isConnected) {
    badge.textContent = '✓ 連携済み';
    badge.style.background = '#d4edda';
    badge.style.color = '#155724';
  } else {
    badge.textContent = '未連携';
    badge.style.background = '#f8d7da';
    badge.style.color = '#721c24';
  }
}

// Twitter認証状態を表示
async function displayTwitterAuthStatus(projectId) {
  try {
    if (!projectId) {
      updateTwitterStatus(false);
      return;
    }

    const result = await window.electronAPI.invoke('twitter-get-project-config', { projectId });
    updateTwitterStatus(result.isConnected);
  } catch (error) {
    console.log('Twitter認証状態確認エラー:', error);
    updateTwitterStatus(false);
  }
}

// 投稿予約状況を更新
function updateSchedulingStatus() {
  // 自動投稿状況（仮の実装）
  const autoPostStatus = document.getElementById('auto-post-status');
  const autoPostInfo = document.getElementById('auto-post-info');
  const nextPostTime = document.getElementById('next-post-time');

  // 要素が存在する場合のみ更新
  if (autoPostStatus) {
    autoPostStatus.textContent = '自動投稿: 未設定';
  }
  if (autoPostInfo) {
    autoPostInfo.textContent = '設定すると定期的にAI投稿が生成・投稿されます';
  }
  if (nextPostTime) {
    nextPostTime.textContent = '予約されていません';
  }

  // 予約投稿リストも空で表示
  const scheduledList = document.getElementById('scheduled-posts-list');
  if (scheduledList) {
    scheduledList.innerHTML = '<div style="color: #657786; text-align: center; padding: 20px;">予約されている投稿はありません</div>';
  }
}

// ==================================================
// ヘルパー関数
// ==================================================

// カテゴリ名取得
function getCategoryName(category) {
  const categories = {
    web: 'Webアプリ',
    mobile: 'モバイルアプリ',
    game: 'ゲーム',
    tool: 'ツール',
    library: 'ライブラリ',
    other: 'その他'
  };
  return categories[category] || 'その他';
}

// ==================================================
// Twitter連携設定
// ==================================================

// Twitter設定モーダルを開く
async function openTwitterConfigModal() {
  try {
    if (!currentProjectId) {
      alert('プロジェクトを選択してください');
      return;
    }

    // 既存の設定を読み込み
    const result = await window.electronAPI.invoke('twitter-get-project-config', { projectId: currentProjectId });

    if (result.success && result.config) {
      document.getElementById('twitter-api-key').value = result.config.apiKey || '';
      document.getElementById('twitter-api-secret').value = result.config.apiSecret || '';
      document.getElementById('twitter-access-token').value = result.config.accessToken || '';
      document.getElementById('twitter-access-token-secret').value = result.config.accessTokenSecret || '';
    } else {
      // 新規設定の場合は空欄
      document.getElementById('twitter-api-key').value = '';
      document.getElementById('twitter-api-secret').value = '';
      document.getElementById('twitter-access-token').value = '';
      document.getElementById('twitter-access-token-secret').value = '';
    }

    document.getElementById('twitter-config-modal').style.display = 'block';
  } catch (error) {
    console.error('❌ Twitter設定読み込みエラー:', error);
    document.getElementById('twitter-config-modal').style.display = 'block';
  }
}

// Twitter設定モーダルを閉じる
function closeTwitterConfigModal() {
  document.getElementById('twitter-config-modal').style.display = 'none';
}

// Twitter設定を保存
async function saveTwitterConfig() {
  try {
    if (!currentProjectId) {
      alert('❌ プロジェクトを選択してください');
      return;
    }

    const config = {
      apiKey: document.getElementById('twitter-api-key').value.trim(),
      apiSecret: document.getElementById('twitter-api-secret').value.trim(),
      accessToken: document.getElementById('twitter-access-token').value.trim(),
      accessTokenSecret: document.getElementById('twitter-access-token-secret').value.trim()
    };

    // バリデーション
    if (!config.apiKey || !config.apiSecret || !config.accessToken || !config.accessTokenSecret) {
      alert('❌ すべてのフィールドを入力してください');
      return;
    }

    // 設定を保存
    const result = await window.electronAPI.invoke('twitter-save-project-config', {
      projectId: currentProjectId,
      config
    });

    if (result.success) {
      alert('✅ Twitter設定を保存しました');
      closeTwitterConfigModal();

      // 接続状態を更新
      await displayTwitterAuthStatus(currentProjectId);
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Twitter設定保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// Twitter接続テスト
async function testTwitterConnection() {
  try {
    const config = {
      apiKey: document.getElementById('twitter-api-key').value.trim(),
      apiSecret: document.getElementById('twitter-api-secret').value.trim(),
      accessToken: document.getElementById('twitter-access-token').value.trim(),
      accessTokenSecret: document.getElementById('twitter-access-token-secret').value.trim()
    };

    // バリデーション
    if (!config.apiKey || !config.apiSecret || !config.accessToken || !config.accessTokenSecret) {
      alert('❌ すべてのフィールドを入力してください');
      return;
    }

    // 接続テスト
    const result = await window.electronAPI.invoke('twitter-test-config', config);

    if (result.success) {
      alert('✅ 接続成功！Twitter APIに正常に接続できました。');
    } else {
      alert('❌ 接続失敗: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Twitter接続テストエラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// ==================================================
// Bluesky連携設定
// ==================================================

// Bluesky接続状態バッジを更新
function updateBlueskyConnectionBadge(isConnected) {
  const badge = document.getElementById('bluesky-connection-badge');
  if (!badge) return;

  if (isConnected) {
    badge.textContent = '✓ 連携済み';
    badge.style.background = '#d4edda';
    badge.style.color = '#155724';
  } else {
    badge.textContent = '未連携';
    badge.style.background = '#f8d7da';
    badge.style.color = '#721c24';
  }
}

// Bluesky接続状態を確認して表示
async function displayBlueskyAuthStatus() {
  try {
    if (!currentProjectId) {
      updateBlueskyConnectionBadge(false);
      return;
    }

    const result = await window.electronAPI.invoke('bluesky-get-project-config', { projectId: currentProjectId });
    updateBlueskyConnectionBadge(result.isConnected);
  } catch (error) {
    console.log('Bluesky認証状態確認エラー:', error);
    updateBlueskyConnectionBadge(false);
  }
}

// Bluesky設定モーダルを開く
async function openBlueskyConfigModal() {
  try {
    if (!currentProjectId) {
      alert('プロジェクトを選択してください');
      return;
    }

    // 既存の設定を読み込み
    const result = await window.electronAPI.invoke('bluesky-get-project-config', { projectId: currentProjectId });

    if (result.success && result.config) {
      document.getElementById('bluesky-identifier').value = result.config.identifier || '';
      document.getElementById('bluesky-app-password').value = result.config.appPassword || '';
    } else {
      // 新規設定の場合は空欄
      document.getElementById('bluesky-identifier').value = '';
      document.getElementById('bluesky-app-password').value = '';
    }

    document.getElementById('bluesky-config-modal').style.display = 'block';
  } catch (error) {
    console.error('❌ Bluesky設定読み込みエラー:', error);
    document.getElementById('bluesky-config-modal').style.display = 'block';
  }
}

// Bluesky設定モーダルを閉じる
function closeBlueskyConfigModal() {
  document.getElementById('bluesky-config-modal').style.display = 'none';
}

// Bluesky設定を保存
async function saveBlueskyConfig() {
  try {
    if (!currentProjectId) {
      alert('❌ プロジェクトを選択してください');
      return;
    }

    const config = {
      identifier: document.getElementById('bluesky-identifier').value.trim(),
      appPassword: document.getElementById('bluesky-app-password').value.trim()
    };

    // バリデーション
    if (!config.identifier || !config.appPassword) {
      alert('❌ すべてのフィールドを入力してください');
      return;
    }

    // 設定を保存
    const result = await window.electronAPI.invoke('bluesky-save-project-config', {
      projectId: currentProjectId,
      config
    });

    if (result.success) {
      alert('✅ Bluesky設定を保存しました');
      closeBlueskyConfigModal();

      // 接続状態を更新
      updateBlueskyConnectionBadge(true);
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Bluesky設定保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// Bluesky接続テスト
async function testBlueskyConnection() {
  try {
    const config = {
      identifier: document.getElementById('bluesky-identifier').value.trim(),
      appPassword: document.getElementById('bluesky-app-password').value.trim()
    };

    // バリデーション
    if (!config.identifier || !config.appPassword) {
      alert('❌ すべてのフィールドを入力してください');
      return;
    }

    // 接続テスト
    const result = await window.electronAPI.invoke('bluesky-test-config', config);

    if (result.success) {
      alert(`✅ 接続成功！Blueskyに正常に接続できました。\n\nHandle: ${result.handle}\nDID: ${result.did}`);
    } else {
      alert('❌ 接続失敗: ' + result.error);
    }
  } catch (error) {
    console.error('❌ Bluesky接続テストエラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// ========================================
// ES Modules: HTML onclick用にwindowに公開
// ========================================

// HTML onclick属性から呼び出される関数をwindowに公開
if (typeof window !== 'undefined') {
  // 画面遷移関数
  window.showProjectsMainScreen = showProjectsMainScreen;
  window.backToProjectList = backToProjectList;
  window.viewProjectDetail = viewProjectDetail;

  // モーダル操作関数
  window.openProjectModal = openProjectModal;
  window.closeProjectModal = closeProjectModal;
  window.closeEditProjectModal = closeEditProjectModal;

  // CRUD操作関数
  window.registerProject = registerProject;
  window.editProjectDetail = editProjectDetail;
  window.editProject = editProject;
  window.saveProjectChanges = saveProjectChanges;
  window.deleteProjectFromDetail = deleteProjectFromDetail;
  window.deleteProject = deleteProject;

  // Twitter連携設定関数
  window.openTwitterConfigModal = openTwitterConfigModal;
  window.closeTwitterConfigModal = closeTwitterConfigModal;
  window.saveTwitterConfig = saveTwitterConfig;
  window.testTwitterConnection = testTwitterConnection;

  // Bluesky連携設定関数
  window.openBlueskyConfigModal = openBlueskyConfigModal;
  window.closeBlueskyConfigModal = closeBlueskyConfigModal;
  window.saveBlueskyConfig = saveBlueskyConfig;
  window.testBlueskyConnection = testBlueskyConnection;

  console.log('✅ projects.js (ES Module) loaded and functions exposed to window');
}
