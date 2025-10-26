/**
 * posts.js - 投稿管理モジュール
 *
 * このファイルには投稿の作成、編集、削除、表示などの機能が含まれます。
 *
 * 主な機能:
 * - 投稿の読み込み・表示
 * - 投稿の作成・編集・削除
 * - 投稿ステータス管理
 * - 投稿アシスタント（AIチャット）
 * - 投稿内容の改善・最適化
 *
 * グローバル変数:
 * - currentProjectId: 現在選択中のプロジェクトID (config.jsで定義)
 * - currentUser: 現在ログイン中のユーザー (auth.jsで定義)
 *
 * @requires window.electronAPI - Electron IPCブリッジ
 * @requires aiServiceManager - AI生成サービス (ai-service-manager.jsで定義)
 */

// ========================================
// ES Modules インポート
// ========================================

import {
  IPC_CHANNELS,
  POST_STATUS,
  POST_STATUS_LABELS,
  getPostStatusLabel,
  getPostStatusColor
} from './modules/constants.js';

import {
  formatDateTime,
  getRelativeTime,
  getTomorrow,
  toDateString,
  toTimeString
} from './modules/date-utils.js';

import {
  getElementById,
  showModal,
  hideModal,
  getInputValue,
  setInputValue,
  clearForm,
  setHTML
} from './modules/dom-utils.js';

// ========================================
// 投稿データ読み込み・表示
// ========================================

/**
 * プロジェクトの投稿一覧を読み込み・表示
 * @export
 */
export async function loadProjectPosts(projectId, resetCount = true) {
  try {
    console.log('📋 投稿一覧読み込み開始:', projectId);

    // 認証状態確認
    if (!currentUser) {
      console.log('ℹ️ 未認証ユーザー - 空の投稿一覧を表示');
      displayPosts([]);
      return { success: true, posts: [] };
    }

    // 表示件数をリセット
    if (resetCount) {
      postsDisplayCount = 10;
    }

    const result = await window.electronAPI.invoke('firebase-get-project-posts', projectId);

    if (result.success) {
      allPosts = result.posts;
      displayPosts(result.posts.slice(0, postsDisplayCount));
      console.log(`✅ 投稿一覧読み込み成功: ${result.posts.length}件`);
    } else {
      console.warn('⚠️ 投稿一覧取得に問題がありました:', result.error);
      displayPosts([]);
    }

    return result;

  } catch (error) {
    console.error('❌ 投稿一覧読み込みエラー:', error);
    displayPostsError(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 投稿一覧を表示
 * @export
 */
export function displayPosts(posts) {
  const postsContainer = document.getElementById('project-posts-list');

  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = `
      <div style="text-align: center; color: #657786; padding: 40px;">
        <div style="font-size: 18px; margin-bottom: 10px;">📝</div>
        <div>投稿がまだ作成されていません</div>
        <div style="font-size: 14px; margin-top: 5px;">プランから自動生成するか、「手動投稿作成」ボタンから作成してください</div>
      </div>
    `;
    return;
  }

  let postsHTML = '';
  posts.forEach(post => {
    const statusColor = getPostStatusColor(post.status);
    const statusText = getPostStatusLabel(post.status);

    // AI生成失敗投稿の判定
    const isAIFailed = post.type === 'ai_failed_manual_required' ||
                       post.aiGenerationFailed ||
                       post.requiresManualInput;

    // AI失敗投稿用の追加スタイル
    const aiFailedStyle = isAIFailed ?
      'border: 2px solid #e0245e; background: linear-gradient(135deg, #fff5f8 0%, #ffffff 100%);' : '';

    // AI失敗警告メッセージ
    const aiFailedWarning = isAIFailed ? `
      <div style="background: #ffebee; border-left: 4px solid #e0245e; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
        <div style="color: #c62828; font-weight: 600; margin-bottom: 4px;">
          ⚠️ AI生成に失敗しました - 手動で内容を入力してください
        </div>
        <div style="color: #666; font-size: 13px;">
          投稿内容を編集して、適切な内容に変更してください
        </div>
      </div>
    ` : '';

    postsHTML += `
      <div class="post-card" style="${aiFailedStyle}">
        ${aiFailedWarning}
        <div class="post-header">
          <div class="post-meta">
            <span class="post-status" style="background-color: ${statusColor};">${statusText}</span>
            <span class="post-platform">${post.platform || 'Twitter'}</span>
            ${isAIFailed ? '<span class="post-status" style="background-color: #e0245e; color: white;">🔧 要編集</span>' : ''}
          </div>
          <div class="post-date">${formatDateTime(post.scheduledAt)}</div>
        </div>

        <div class="post-content">${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}</div>

        <div class="post-actions">
          <button onclick="editPost('${post.id}', '${post.planId}')" class="btn-primary">✏️ 編集</button>
          <button onclick="deletePost('${post.id}', '${post.planId}')" class="btn-danger">🗑️ 削除</button>
        </div>
      </div>
    `;
  });

  postsContainer.innerHTML = postsHTML;

  // もっと見るボタンの表示制御
  const loadMoreBtn = document.getElementById('load-more-posts');
  if (loadMoreBtn) {
    if (allPosts && allPosts.length > postsDisplayCount) {
      loadMoreBtn.style.display = 'block';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }
}

/**
 * さらに投稿を読み込む
 * @export
 */
export function loadMorePosts() {
  postsDisplayCount += 10;
  displayPosts(allPosts.slice(0, postsDisplayCount));
}

/**
 * 投稿エラー表示
 */
function displayPostsError(errorMessage) {
  const postsContainer = document.getElementById('project-posts-list');
  postsContainer.innerHTML = `
    <div style="text-align: center; color: #e0245e; padding: 40px;">
      <div style="font-size: 18px; margin-bottom: 10px;">❌</div>
      <div>投稿一覧の読み込みに失敗しました</div>
      <div style="font-size: 14px; margin-top: 10px; color: #657786;">${errorMessage}</div>
    </div>
  `;
}

// ステータス関連の関数は constants.js から import済み
// getPostStatusColor, getPostStatusLabel を使用

// ========================================
// 投稿CRUD操作
// ========================================

/**
 * 手動投稿を作成（モーダル表示）
 * @export
 */
export function createManualPost() {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  // フォームクリア
  document.getElementById('manual-post-content').value = '';
  document.getElementById('manual-post-platform').value = 'twitter';

  // デフォルトで明日の日付を設定
  const tomorrow = getTomorrow();
  document.getElementById('manual-post-date').value = toDateString(tomorrow);
  document.getElementById('manual-post-time').value = toTimeString(tomorrow);

  // モーダル表示
  document.getElementById('manual-post-modal').style.display = 'block';
}

/**
 * 手動投稿モーダルを閉じる
 * @export
 */
export function closeManualPostModal() {
  document.getElementById('manual-post-modal').style.display = 'none';
}

/**
 * 手動投稿フォームの送信処理
 * @export
 */
export async function submitManualPost(event) {
  event.preventDefault();

  if (!currentProjectId || !currentUser) {
    alert('プロジェクトまたはユーザーが選択されていません');
    return;
  }

  const content = document.getElementById('manual-post-content').value.trim();
  const platform = document.getElementById('manual-post-platform').value;
  const date = document.getElementById('manual-post-date').value;
  const time = document.getElementById('manual-post-time').value;

  if (!content || !platform || !date || !time) {
    alert('すべての項目を入力してください');
    return;
  }

  try {
    // 投稿予定日時を作成
    const scheduledAt = new Date(`${date}T${time}:00`);

    const postData = {
      userId: currentUser.uid,
      projectId: currentProjectId,
      planId: null, // 手動投稿の場合はplanIdなし
      content: content,
      platform: platform,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
      type: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Firestoreに保存
    const result = await window.electronAPI.invoke('firebase-create-post', postData);

    if (result.success) {
      alert('✅ 手動投稿を作成しました');
      closeManualPostModal();

      // 投稿一覧を再読み込み
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 投稿作成に失敗しました: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 手動投稿作成エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿を編集
 * @export
 */
export async function editPost(postId, planId) {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // 投稿データ取得
    const result = await window.electronAPI.invoke('firebase-get-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId
    });

    if (!result.success) {
      alert('❌ 投稿データの取得に失敗しました: ' + result.error);
      return;
    }

    const post = result.post;

    // 編集モーダルにデータ設定
    document.getElementById('edit-post-content').value = post.content;
    document.getElementById('edit-post-datetime').value =
      new Date(post.scheduledAt).toISOString().slice(0, 16);

    // 編集対象のID保存
    window.currentEditingPost = { postId, planId };

    // モーダル表示
    document.getElementById('edit-post-modal').style.display = 'block';

  } catch (error) {
    console.error('❌ 投稿編集エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿を削除
 * @export
 */
export async function deletePost(postId, planId) {
  if (!confirm('この投稿を削除しますか？\n\nこの操作は取り消せません。')) {
    return;
  }

  try {
    const result = await window.electronAPI.invoke('firebase-delete-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId
    });

    if (result.success) {
      alert('✅ 投稿を削除しました');
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 投稿削除エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿削除エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿編集モーダルを閉じる
 * @export
 */
export function closeEditPostModal() {
  document.getElementById('edit-post-modal').style.display = 'none';
  window.currentEditingPost = null;
}

/**
 * 投稿編集の変更を保存
 * @export
 */
// 投稿保存の重複実行防止フラグ
let isSavingPost = false;

export async function saveEditPostChanges() {
  // 重複実行防止
  if (isSavingPost) {
    console.log('⚠️ 投稿保存処理が既に実行中です');
    return;
  }

  if (!window.currentEditingPost) {
    alert('❌ 編集対象の投稿が見つかりません');
    return;
  }

  const { postId, planId } = window.currentEditingPost;

  isSavingPost = true;

  try {
    const content = document.getElementById('edit-post-content').value;
    const datetimeValue = document.getElementById('edit-post-datetime').value;

    if (!content || !content.trim()) {
      alert('❌ 投稿内容を入力してください');
      isSavingPost = false;
      return;
    }

    if (!datetimeValue) {
      alert('❌ 投稿予定日時を入力してください');
      isSavingPost = false;
      return;
    }

    // ISO形式に変換
    const scheduledAt = new Date(datetimeValue).toISOString();

    const result = await window.electronAPI.invoke('firebase-update-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId,
      updateData: {
        content: content.trim(),
        scheduledAt: scheduledAt,
        updatedAt: new Date().toISOString()
      }
    });

    if (result.success) {
      alert('✅ 投稿を更新しました');
      closeEditPostModal();
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 投稿更新エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  } finally {
    isSavingPost = false;
  }
}

// ========================================
// 投稿アシスタント（AIチャット機能）
// ========================================

/**
 * 投稿アシスタントを開く（新規投稿）
 * @export
 */
export async function openPostAssistant() {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // プランリスト取得
    const plans = await getProjectPlansForSelection();

    if (!plans || plans.length === 0) {
      alert('❌ プランが存在しません。\n\n先にプランを作成してください。');
      return;
    }

    // プラン選択モーダルを表示
    const planSelectHTML = plans.map(plan =>
      `<option value="${plan.id}">${plan.name} (${plan.platform})</option>`
    ).join('');

    const planSelect = document.getElementById('post-assistant-plan');
    planSelect.innerHTML = '<option value="">プランを選択</option>' + planSelectHTML;

    // チャットメッセージクリア
    document.getElementById('post-assistant-messages').innerHTML = '';
    document.getElementById('post-assistant-input').value = '';
    document.getElementById('generated-post-content').textContent = '';

    // 編集モードフラグをクリア
    window.currentEditingPostAssistant = null;

    // モーダル表示
    document.getElementById('post-assistant-modal').style.display = 'block';

  } catch (error) {
    console.error('❌ 投稿アシスタント起動エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿アシスタントを開く（投稿編集）
 * @export
 */
export async function openPostAssistantForEdit(postId, planId) {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // 投稿データ取得
    const result = await window.electronAPI.invoke('firebase-get-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId
    });

    if (!result.success) {
      alert('❌ 投稿データの取得に失敗しました: ' + result.error);
      return;
    }

    const post = result.post;

    // 編集対象を保存
    window.currentEditingPostAssistant = { postId, planId };

    // プラン選択を設定
    const planSelect = document.getElementById('post-assistant-plan');
    planSelect.value = planId;
    planSelect.disabled = true; // 編集時はプラン変更不可

    // 既存の投稿内容を表示
    document.getElementById('generated-post-content').textContent = post.content;

    // 会話履歴を読み込み
    await loadPostConversations(postId, planId);

    // モーダル表示
    document.getElementById('post-assistant-modal').style.display = 'block';

  } catch (error) {
    console.error('❌ 投稿アシスタント起動エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿アシスタントを閉じる
 * @export
 */
export async function closePostAssistant() {
  document.getElementById('post-assistant-modal').style.display = 'none';
  window.currentEditingPostAssistant = null;

  // プラン選択を有効化
  const planSelect = document.getElementById('post-assistant-plan');
  planSelect.disabled = false;
}

/**
 * 投稿の会話履歴を読み込み
 */
async function loadPostConversations(postId, planId) {
  try {
    const result = await window.electronAPI.invoke('firebase-get-post-conversations', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId
    });

    if (result.success && result.conversations && result.conversations.length > 0) {
      const messagesContainer = document.getElementById('post-assistant-messages');
      messagesContainer.innerHTML = '';

      result.conversations.forEach(conv => {
        addMessageToAssistant('user', conv.userMessage);
        addMessageToAssistant('ai', conv.aiResponse);
      });
    }

  } catch (error) {
    console.error('❌ 会話履歴読み込みエラー:', error);
  }
}

/**
 * プランの会話履歴を読み込み
 */
async function loadPlanConversations(planId, limit = 20) {
  try {
    const result = await window.electronAPI.invoke('firebase-get-plan-conversations', {
      projectId: currentProjectId,
      planId: planId,
      limit: limit
    });

    if (result.success && result.conversations && result.conversations.length > 0) {
      return result.conversations;
    }

    return [];

  } catch (error) {
    console.error('❌ プラン会話履歴読み込みエラー:', error);
    return [];
  }
}

/**
 * アシスタントにメッセージを追加
 */
function addMessageToAssistant(sender, message) {
  const messagesContainer = document.getElementById('post-assistant-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `assistant-message ${sender}`;

  const icon = sender === 'user' ? '👤' : '🤖';
  messageDiv.innerHTML = `
    <div class="message-icon">${icon}</div>
    <div class="message-text">${message.replace(/\n/g, '<br>')}</div>
  `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * 投稿内容を生成（AIチャット）
 * @export
 */
export async function generatePostContent(userMessage) {
  const planId = document.getElementById('post-assistant-plan').value;

  if (!planId) {
    alert('❌ プランを選択してください');
    return;
  }

  if (!userMessage || !userMessage.trim()) {
    alert('❌ メッセージを入力してください');
    return;
  }

  // ユーザーメッセージを表示
  addMessageToAssistant('user', userMessage);

  // 入力フィールドクリア
  document.getElementById('post-assistant-input').value = '';

  try {
    // プラン情報取得
    const planResult = await window.electronAPI.invoke('firebase-get-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    if (!planResult.success) {
      throw new Error('プラン情報の取得に失敗しました');
    }

    const plan = planResult.plan;

    // プロジェクト情報取得
    const projectResult = await window.electronAPI.invoke('firebase-get-project', currentProjectId);

    if (!projectResult.success) {
      throw new Error('プロジェクト情報の取得に失敗しました');
    }

    const project = projectResult.project;

    // 現在の投稿内容を取得
    const currentContent = document.getElementById('generated-post-content').textContent;

    // プロンプト構築
    let prompt = `あなたは${plan.platform}の投稿作成アシスタントです。\n\n`;
    prompt += `プロジェクト: ${project.name}\n`;
    prompt += `プロジェクト説明: ${project.description}\n\n`;

    if (plan.customPrompt) {
      prompt += `投稿スタイル:\n${plan.customPrompt}\n\n`;
    }

    if (currentContent) {
      prompt += `現在の投稿内容:\n${currentContent}\n\n`;
    }

    prompt += `ユーザーの要望:\n${userMessage}\n\n`;
    prompt += `上記を踏まえて、${plan.platform}用の投稿内容を生成してください。`;

    // AI生成
    addMessageToAssistant('ai', '投稿内容を生成しています...');

    const aiResult = await aiServiceManager.generateText(prompt, {
      maxTokens: 500,
      temperature: 0.7
    });

    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI生成に失敗しました');
    }

    // 生成された内容を表示
    document.getElementById('generated-post-content').textContent = aiResult.text;

    // AIレスポンスを表示
    const messagesContainer = document.getElementById('post-assistant-messages');
    messagesContainer.removeChild(messagesContainer.lastChild); // "生成中..."メッセージ削除
    addMessageToAssistant('ai', '投稿内容を生成しました！プレビューを確認してください。');

    // 会話履歴を保存
    if (window.currentEditingPostAssistant) {
      await window.electronAPI.invoke('firebase-save-post-conversation', {
        projectId: currentProjectId,
        planId: planId,
        postId: window.currentEditingPostAssistant.postId,
        conversation: {
          userMessage: userMessage,
          aiResponse: aiResult.text,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('❌ 投稿生成エラー:', error);

    // エラーメッセージ削除
    const messagesContainer = document.getElementById('post-assistant-messages');
    if (messagesContainer.lastChild && messagesContainer.lastChild.textContent.includes('生成しています')) {
      messagesContainer.removeChild(messagesContainer.lastChild);
    }

    addMessageToAssistant('ai', `❌ エラーが発生しました: ${error.message}`);
  }
}

/**
 * 生成された投稿を表示
 */
function displayGeneratedPost(postContent) {
  document.getElementById('generated-post-content').textContent = postContent;
}

/**
 * 投稿を再生成
 * @export
 */
export async function regeneratePost() {
  const planId = document.getElementById('post-assistant-plan').value;

  if (!planId) {
    alert('❌ プランを選択してください');
    return;
  }

  await generatePostContent('前回とは異なる視点で、新しい投稿内容を生成してください');
}

/**
 * 手動投稿として保存
 * @export
 */
export async function saveAsManualPost() {
  const planId = document.getElementById('post-assistant-plan').value;
  const content = document.getElementById('generated-post-content').textContent;

  if (!planId) {
    alert('❌ プランを選択してください');
    return;
  }

  if (!content || !content.trim()) {
    alert('❌ 投稿内容が生成されていません');
    return;
  }

  try {
    // 投稿データ作成
    const postData = {
      content: content,
      scheduledAt: new Date().toISOString(),
      status: 'draft',
      type: 'manual',
      platform: document.getElementById('post-assistant-plan').selectedOptions[0].text.match(/\((.+)\)/)[1]
    };

    const result = await window.electronAPI.invoke('firebase-create-post', {
      projectId: currentProjectId,
      planId: planId,
      postData: postData
    });

    if (result.success) {
      alert('✅ 手動投稿として保存しました');
      await closePostAssistant();
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 既存の投稿を更新
 */
async function updateExistingPost(newContent) {
  if (!window.currentEditingPostAssistant) {
    alert('❌ 編集対象の投稿が見つかりません');
    return;
  }

  const { postId, planId } = window.currentEditingPostAssistant;
  const content = newContent || document.getElementById('generated-post-content').textContent;

  if (!content || !content.trim()) {
    alert('❌ 投稿内容が生成されていません');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('firebase-update-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId,
      updateData: {
        content: content,
        updatedAt: new Date().toISOString()
      }
    });

    if (result.success) {
      alert('✅ 投稿を更新しました');
      await closePostAssistant();
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 更新エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿内容をプロンプトで生成
 */
async function generatePostWithPrompt(prompt) {
  await generatePostContent(prompt);
}

/**
 * 手動投稿を内容付きで作成
 */
async function createManualPostWithContent(content) {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // プランリスト取得
    const plans = await getProjectPlansForSelection();

    if (!plans || plans.length === 0) {
      alert('❌ プランが存在しません。\n\n先にプランを作成してください。');
      return;
    }

    // プラン選択モーダルを表示
    const planSelectHTML = plans.map(plan =>
      `<option value="${plan.id}">${plan.name} (${plan.platform})</option>`
    ).join('');

    const modal = document.getElementById('manual-post-modal');
    const planSelect = document.getElementById('manual-post-plan');
    planSelect.innerHTML = '<option value="">プランを選択</option>' + planSelectHTML;

    // 内容を設定
    document.getElementById('manual-post-content').value = content;
    document.getElementById('manual-post-datetime').value = '';

    modal.style.display = 'block';

  } catch (error) {
    console.error('❌ 手動投稿作成エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

// ========================================
// 投稿改善モーダル
// ========================================

/**
 * 投稿改善モーダルを開く
 * @export
 */
export async function openImproveModal(postId, planId) {
  if (!currentProjectId) {
    alert('プロジェクトが選択されていません');
    return;
  }

  try {
    // 投稿データ取得
    const result = await window.electronAPI.invoke('firebase-get-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId
    });

    if (!result.success) {
      alert('❌ 投稿データの取得に失敗しました: ' + result.error);
      return;
    }

    const post = result.post;

    // 改善対象を保存
    window.currentImprovingPost = { postId, planId, originalContent: post.content };

    // 投稿内容を表示
    document.getElementById('improve-post-original').textContent = post.content;
    document.getElementById('improve-post-preview').textContent = post.content;
    document.getElementById('improve-post-input').value = '';

    // モーダル表示
    document.getElementById('improve-post-modal').style.display = 'block';

  } catch (error) {
    console.error('❌ 投稿改善モーダル起動エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 投稿を改善（AI処理）
 * @export
 */
export async function improvePost() {
  if (!window.currentImprovingPost) {
    alert('❌ 改善対象の投稿が見つかりません');
    return;
  }

  const userInput = document.getElementById('improve-post-input').value.trim();

  if (!userInput) {
    alert('❌ 改善指示を入力してください');
    return;
  }

  const { postId, planId, originalContent } = window.currentImprovingPost;

  try {
    // プラン情報取得
    const planResult = await window.electronAPI.invoke('firebase-get-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    if (!planResult.success) {
      throw new Error('プラン情報の取得に失敗しました');
    }

    const plan = planResult.plan;

    // AI改善実行
    const result = await processChatModification(userInput, postId, planId);

    if (result.success) {
      // 改善された内容を表示
      document.getElementById('improve-post-preview').textContent = result.improvedContent;

      alert('✅ 投稿を改善しました');
    } else {
      alert('❌ 改善エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿改善エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 改善された投稿を保存
 * @export
 */
export async function saveEditedPost() {
  if (!window.currentImprovingPost) {
    alert('❌ 改善対象の投稿が見つかりません');
    return;
  }

  const { postId, planId } = window.currentImprovingPost;
  const improvedContent = document.getElementById('improve-post-preview').textContent;

  if (!improvedContent || !improvedContent.trim()) {
    alert('❌ 改善された投稿内容が見つかりません');
    return;
  }

  try {
    const result = await window.electronAPI.invoke('firebase-update-post', {
      projectId: currentProjectId,
      planId: planId,
      postId: postId,
      updateData: {
        content: improvedContent,
        updatedAt: new Date().toISOString()
      }
    });

    if (result.success) {
      alert('✅ 投稿を保存しました');
      closeImproveModal();
      await loadProjectPosts(currentProjectId);
    } else {
      alert('❌ 保存エラー: ' + result.error);
    }

  } catch (error) {
    console.error('❌ 投稿保存エラー:', error);
    alert('❌ エラーが発生しました: ' + error.message);
  }
}

/**
 * 改善モーダルを閉じる
 * @export
 */
export function closeImproveModal() {
  document.getElementById('improve-post-modal').style.display = 'none';
  window.currentImprovingPost = null;
}

// ========================================
// AI意図解析・実行処理
// ========================================

/**
 * ユーザー入力から意図を解析
 */
async function analyzeUserIntent(userInput, currentPostContent, currentPlanInfo) {
  try {
    const prompt = `あなたは投稿改善アシスタントです。ユーザーの修正指示を分析して、以下のJSON形式で返してください。

ユーザー指示: "${userInput}"

現在の投稿内容:
"""
${currentPostContent}
"""

プラン情報:
- プラットフォーム: ${currentPlanInfo.platform}
- カスタムプロンプト: ${currentPlanInfo.customPrompt || 'なし'}

以下のJSON形式で返してください:
{
  "intent_type": "style_change|tone_modification|content_edit|brand_adjustment",
  "target_scope": "this_post|plan_level",
  "specific_changes": ["変更内容1", "変更内容2"],
  "plan_update_required": true/false,
  "suggested_plan_prompt": "プランに追加すべきプロンプト（あれば）",
  "confidence": 0.0-1.0
}`;

    const result = await aiServiceManager.generateText(prompt, {
      maxTokens: 300,
      temperature: 0.3
    });

    if (!result.success) {
      throw new Error(result.error || 'AI解析に失敗しました');
    }

    // JSON抽出・パース
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式のレスポンスが得られませんでした');
    }

    const intent = JSON.parse(jsonMatch[0]);
    return { success: true, intent };

  } catch (error) {
    console.error('❌ 意図解析エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 意図に基づいてアクションを実行
 */
async function executeIntentBasedActions(intentResult, postId, planId) {
  if (!intentResult.success) {
    return { success: false, error: '意図解析に失敗しました' };
  }

  const intent = intentResult.intent;

  try {
    // 投稿内容を更新
    const postUpdateResult = await updatePostBasedOnIntent(postId, intent);

    if (!postUpdateResult.success) {
      throw new Error('投稿更新に失敗しました: ' + postUpdateResult.error);
    }

    // プラン更新が必要な場合
    if (intent.plan_update_required && intent.suggested_plan_prompt) {
      const planUpdateResult = await updatePlanBasedOnIntent(planId, intent);

      if (!planUpdateResult.success) {
        console.warn('⚠️ プラン更新に失敗しました:', planUpdateResult.error);
      }
    }

    return {
      success: true,
      improvedContent: postUpdateResult.improvedContent,
      planUpdated: intent.plan_update_required
    };

  } catch (error) {
    console.error('❌ アクション実行エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 投稿を意図に基づいて更新
 */
async function updatePostBasedOnIntent(postId, intent) {
  try {
    const currentPost = await getCurrentPostData(postId);

    if (!currentPost.success) {
      throw new Error('投稿データ取得に失敗しました');
    }

    // AI改善実行
    const improvementPrompt = `以下の投稿内容を、ユーザーの要望に応じて改善してください。

現在の投稿:
"""
${currentPost.post.content}
"""

改善内容:
${intent.specific_changes.join('\n')}

改善された投稿のみを返してください。説明は不要です。`;

    const aiResult = await aiServiceManager.generateText(improvementPrompt, {
      maxTokens: 500,
      temperature: 0.7
    });

    if (!aiResult.success) {
      throw new Error('AI改善に失敗しました');
    }

    return {
      success: true,
      improvedContent: aiResult.text
    };

  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * プランを意図に基づいて更新
 */
async function updatePlanBasedOnIntent(planId, intent, userInput) {
  try {
    const planResult = await window.electronAPI.invoke('firebase-get-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    if (!planResult.success) {
      throw new Error('プラン取得に失敗しました');
    }

    const plan = planResult.plan;
    const currentPrompt = plan.customPrompt || '';

    // 新しいプロンプトを追加
    const updatedPrompt = currentPrompt + '\n\n【追加指示】\n' + intent.suggested_plan_prompt;

    const updateResult = await window.electronAPI.invoke('firebase-update-plan', {
      projectId: currentProjectId,
      planId: planId,
      updateData: {
        customPrompt: updatedPrompt,
        updatedAt: new Date().toISOString()
      }
    });

    return updateResult;

  } catch (error) {
    console.error('❌ プラン更新エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * チャット修正を処理（統合処理）
 */
async function processChatModification(userInput, postId, planId) {
  try {
    // 現在の投稿・プラン情報を取得
    const postData = await getCurrentPostData(postId);
    const planData = await getCurrentPlanData(planId);

    if (!postData.success || !planData.success) {
      throw new Error('データ取得に失敗しました');
    }

    // 意図解析
    const intentResult = await analyzeUserIntent(
      userInput,
      postData.post.content,
      planData.plan
    );

    // 意図に基づいて実行
    const executeResult = await executeIntentBasedActions(intentResult, postId, planId);

    return executeResult;

  } catch (error) {
    console.error('❌ チャット修正処理エラー:', error);

    // フォールバック: 単純な修正処理
    return await simpleModification(userInput, postId);
  }
}

/**
 * 現在の投稿データを取得
 */
async function getCurrentPostData(postId) {
  try {
    const result = await window.electronAPI.invoke('firebase-get-post', {
      projectId: currentProjectId,
      planId: window.currentImprovingPost.planId,
      postId: postId
    });

    return result;

  } catch (error) {
    console.error('❌ 投稿データ取得エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 現在のプランデータを取得
 */
async function getCurrentPlanData(planId) {
  try {
    const result = await window.electronAPI.invoke('firebase-get-plan', {
      projectId: currentProjectId,
      planId: planId
    });

    return result;

  } catch (error) {
    console.error('❌ プランデータ取得エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 単純な修正処理（フォールバック）
 */
async function simpleModification(userInput, postId) {
  try {
    const currentPost = await getCurrentPostData(postId);

    if (!currentPost.success) {
      throw new Error('投稿データ取得に失敗しました');
    }

    const prompt = `以下の投稿を、ユーザーの要望に応じて修正してください。

現在の投稿:
"""
${currentPost.post.content}
"""

ユーザーの要望:
${userInput}

修正された投稿のみを返してください。`;

    const aiResult = await aiServiceManager.generateText(prompt, {
      maxTokens: 500,
      temperature: 0.7
    });

    if (!aiResult.success) {
      throw new Error('AI修正に失敗しました');
    }

    return {
      success: true,
      improvedContent: aiResult.text
    };

  } catch (error) {
    console.error('❌ 単純修正エラー:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * プロジェクトのプラン一覧を取得（選択用）
 */
async function getProjectPlansForSelection() {
  try {
    const result = await window.electronAPI.invoke('firebase-get-project-plans', currentProjectId);

    if (result.success) {
      return result.plans;
    }

    return [];

  } catch (error) {
    console.error('❌ プラン一覧取得エラー:', error);
    return [];
  }
}

// ========================================
// グローバル変数（ローカルスコープ）
// ========================================

let allPosts = []; // 全投稿データ
let postsDisplayCount = 10; // 表示件数

// ========================================
// ES Modules: HTML onclick用にwindowに公開
// ========================================

// HTML onclick属性から呼び出される関数をwindowに公開
if (typeof window !== 'undefined') {
  window.loadProjectPosts = loadProjectPosts;
  window.createManualPost = createManualPost;
  window.closeManualPostModal = closeManualPostModal;
  window.submitManualPost = submitManualPost;
  window.editPost = editPost;
  window.closeEditPostModal = closeEditPostModal;
  window.saveEditPostChanges = saveEditPostChanges;
  window.deletePost = deletePost;
  window.loadMorePosts = loadMorePosts;
  window.openPostAssistant = openPostAssistant;
  window.openPostAssistantForEdit = openPostAssistantForEdit;
  window.closePostAssistant = closePostAssistant;
  window.generatePostContent = generatePostContent;
  window.regeneratePost = regeneratePost;
  window.saveAsManualPost = saveAsManualPost;
  window.openImproveModal = openImproveModal;
  window.improvePost = improvePost;
  window.saveEditedPost = saveEditedPost;
  window.closeImproveModal = closeImproveModal;

  console.log('✅ posts.js (ES Module) loaded and functions exposed to window');
}
