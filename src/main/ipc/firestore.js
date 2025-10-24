/**
 * ==========================================
 * Firestore/Firebase Database IPC Handlers
 * ==========================================
 *
 * このファイルには、Firestore/Firebase データベース操作に関する
 * すべてのIPC通信ハンドラーが含まれています。
 *
 * 含まれる機能:
 * - プロジェクト管理（CRUD操作）
 * - プラン管理（CRUD操作）
 * - 投稿管理（CRUD操作）
 * - 会話記録管理
 * - AI概要生成・管理
 * - 自動投稿実行
 * - データ移行・同期
 * - ユーティリティ・テスト機能
 */

const { ipcMain } = require('electron');

// サービスのインポートは遅延初期化するため、関数内で参照
let firebaseService;
let aiServiceManager;
let migrationService;

/**
 * サービスの初期化
 * main.jsから呼び出されることを想定
 */
function initializeServices(services) {
  firebaseService = services.firebaseService;
  aiServiceManager = services.aiServiceManager;
  migrationService = services.migrationService;
}

// ==========================================
// プロジェクト管理 IPC ハンドラー
// ==========================================

// Firebase - プロジェクト同期
ipcMain.handle('firebase-sync-project', async (event, action, projectData) => {
  try {
    const result = await firebaseService.syncProject(action, projectData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ユーザーのプロジェクト一覧取得
ipcMain.handle('firebase-get-user-projects', async (event) => {
  try {
    const result = await firebaseService.getUserProjects();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ユーザーのプロジェクト一覧取得（シンプル版）
ipcMain.handle('firebase-get-user-projects-simple', async (event) => {
  try {
    const result = await firebaseService.getUserProjectsSimple();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - プロジェクトスケジュール更新
ipcMain.handle('firebase-update-project-schedule', async (event, projectId, scheduleData) => {
  try {
    const result = await firebaseService.updateProjectSchedule(projectId, scheduleData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - プロジェクト投稿履歴取得
ipcMain.handle('firebase-get-project-history', async (event, projectId, limit) => {
  try {
    const result = await firebaseService.getProjectHistory(projectId, limit);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ツイート再試行
ipcMain.handle('firebase-retry-tweet', async (event, tweetId) => {
  try {
    const result = await firebaseService.retryTweet(tweetId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - 接続確認
ipcMain.handle('firebase-check-connection', async (event) => {
  try {
    const result = await firebaseService.checkConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト一覧取得
ipcMain.handle('get-firestore-projects', async (event) => {
  try {
    const result = await firebaseService.getUserProjectsHierarchical();
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト作成（階層構造）
ipcMain.handle('create-firestore-project', async (event, projectData) => {
  try {
    const result = await firebaseService.createProjectHierarchical(projectData);

    if (result.success) {
      console.log('✅ Firestoreプロジェクト作成成功:', result.id);
    }

    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト更新
ipcMain.handle('update-firestore-project', async (event, projectId, updateData) => {
  try {
    const result = await firebaseService.updateProjectHierarchical(projectId, updateData);

    if (result.success) {
      console.log('✅ Firestoreプロジェクト更新成功:', projectId);
    }

    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト削除
ipcMain.handle('delete-firestore-project', async (event, projectId) => {
  try {
    const result = await firebaseService.deleteProjectHierarchical(projectId);

    if (result.success) {
      console.log('✅ Firestoreプロジェクト削除成功:', projectId);
    }

    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト取得（階層構造）
ipcMain.handle('get-firestore-project', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectHierarchical(projectId);

    if (result.success) {
      console.log('✅ Firestoreプロジェクト取得成功:', projectId);
    }

    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト詳細取得（編集用）
ipcMain.handle('get-project-details', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectHierarchical(projectId);

    if (result.success) {
      console.log('✅ プロジェクト詳細取得成功:', projectId);
    }

    return result;
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト更新
ipcMain.handle('update-project', async (event, projectId, updatedData) => {
  try {
    console.log('📝 プロジェクト更新開始:', projectId, updatedData);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreでプロジェクトを更新（undefinedフィールドを除外）
    const updatePayload = {
      name: updatedData.name,
      description: updatedData.description,
      category: updatedData.category,
      lastModified: new Date().toISOString()
    };

    // githubUrlが存在する場合のみ追加
    if (updatedData.githubUrl !== undefined) {
      updatePayload.githubUrl = updatedData.githubUrl;
    }

    const result = await firebaseService.updateProjectHierarchical(projectId, updatePayload);

    if (result.success) {
      console.log('✅ プロジェクト更新成功:', projectId);
    }

    return result;
  } catch (error) {
    console.error('❌ プロジェクト更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト一覧取得（ローカル互換）
ipcMain.handle('get-project-list', async (event) => {
  try {
    // Firestore経由でプロジェクト一覧を取得
    const result = await firebaseService.getUserProjectsHierarchical();

    if (result.success) {
      return {
        success: true,
        projects: result.projects || [],
        data: result.projects || []  // 後方互換性のため両方提供
      };
    } else {
      return { success: false, error: result.error, projects: [] };
    }
  } catch (error) {
    return { success: false, error: error.message, projects: [] };
  }
});

// プロジェクト詳細取得（ローカル互換）
ipcMain.handle('get-project-detail', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectHierarchical(projectId);

    if (!result.success) {
      return { success: false, error: 'プロジェクトが見つかりません' };
    }

    return { success: true, project: result.project };
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトからAI投稿生成
ipcMain.handle('generate-project-tweet', async (event, projectData) => {
  try {
    console.log('🤖 プロジェクト投稿生成開始:', projectData.name);

    // プロジェクト情報を整理
    const projectInfo = `
プロジェクト名: ${projectData.name}
説明: ${projectData.description || '説明なし'}
カテゴリ: ${projectData.category || 'その他'}
    `.trim();

    // AIサービスを使用してツイートを生成
    const prompt = `次のプロジェクト情報を基に、魅力的なTwitter投稿（280文字以内）を作成してください:\n\n${projectInfo}`;
    const result = await aiServiceManager.generateText(prompt, { maxTokens: 100 });

    if (!result.success) {
      throw new Error(result.error);
    }

    const tweet = result.content.trim();

    return { success: true, tweet: tweet };
  } catch (error) {
    console.error('❌ AI投稿生成エラー:', error);
    return {
      success: false,
      error: error.message,
      tweet: 'プロジェクトの進捗を報告 🚀 新機能開発中です！'
    };
  }
});

// プロジェクト登録（Firestore使用）
ipcMain.handle('register-project', async (event, projectData) => {
  try {
    console.log('📝 プロジェクト登録開始:', projectData);

    if (!projectData) {
      throw new Error('プロジェクトデータが指定されていません');
    }

    const { name, path, description, category } = projectData;

    if (!name || !path) {
      throw new Error('プロジェクト名とパスは必須です');
    }

    // プロジェクト情報を作成
    const projectInfo = {
      name: name.trim(),
      path: path.trim(),
      description: description ? description.trim() : '',
      category: category || 'web',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // Firestoreに保存
    const result = await firebaseService.createProjectHierarchical(projectInfo);

    if (result.success) {
      console.log('✅ プロジェクト登録完了:', result.id);

      return {
        success: true,
        message: 'プロジェクトが正常に登録されました',
        project: { ...projectInfo, id: result.id }
      };
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ プロジェクト登録エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// プロジェクト削除（Firestore使用）
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    console.log('🗑️ プロジェクト削除開始:', projectId);

    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }

    // Firestoreから削除
    const result = await firebaseService.deleteProjectHierarchical(projectId);

    if (result.success) {
      console.log('✅ プロジェクト削除完了:', projectId);

      return {
        success: true,
        message: 'プロジェクトが正常に削除されました',
        deletedId: projectId
      };
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('❌ プロジェクト削除エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ==========================================
// プラン管理 IPC ハンドラー
// ==========================================

// プロジェクトのプラン一覧を取得
ipcMain.handle('firebase-get-project-plans', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectPlans(projectId);
    return result;
  } catch (error) {
    return { success: false, error: error.message, plans: [] };
  }
});

// プラン作成
ipcMain.handle('firebase-create-plan', async (event, planData) => {
  try {
    const result = await firebaseService.createPlan(planData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラン更新
ipcMain.handle('firebase-update-plan', async (event, projectId, planId, updateData) => {
  try {
    const result = await firebaseService.updatePlan(projectId, planId, updateData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラン削除
ipcMain.handle('firebase-delete-plan', async (event, planId) => {
  try {
    const result = await firebaseService.deletePlan(planId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 個別プランを取得
ipcMain.handle('firebase-get-plan', async (event, projectId, planId) => {
  try {
    const result = await firebaseService.getPlan(projectId, planId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プロジェクトのプラン一覧取得
ipcMain.handle('get-project-plans', async (event, projectId) => {
  try {
    console.log('📋 プラン一覧取得:', projectId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreからプラン一覧を取得
    const result = await firebaseService.getProjectPlans(projectId);

    if (result.success) {
      console.log(`✅ プラン一覧取得成功: ${result.plans.length}件`);
    }

    return result;
  } catch (error) {
    console.error('❌ プラン一覧取得エラー:', error);
    return { success: false, error: error.message, plans: [] };
  }
});

// プラン作成
ipcMain.handle('create-plan', async (event, planData) => {
  try {
    console.log('➕ プラン作成:', planData.name);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const currentUser = firebaseService.getCurrentUser();
    const { projectId, ...cleanPlanData } = planData;

    const newPlan = {
      ...cleanPlanData,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // 階層構造対応：projectIdを別パラメータとして渡す
    const result = await firebaseService.createPlan(projectId, newPlan);

    if (result.success) {
      console.log('✅ プラン作成成功:', result.id);
    }

    return result;
  } catch (error) {
    console.error('❌ プラン作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン更新
ipcMain.handle('update-plan', async (event, planId, updateData) => {
  try {
    console.log('✏️ プラン更新:', planId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const updatedData = {
      ...updateData,
      lastModified: new Date().toISOString()
    };

    const result = await firebaseService.updatePlan(planId, updatedData);

    if (result.success) {
      console.log('✅ プラン更新成功:', planId);
    }

    return result;
  } catch (error) {
    console.error('❌ プラン更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン削除
ipcMain.handle('delete-plan', async (event, planId) => {
  try {
    console.log('🗑️ プラン削除:', planId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const result = await firebaseService.deletePlan(planId);

    if (result.success) {
      console.log('✅ プラン削除成功:', planId);
    }

    return result;
  } catch (error) {
    console.error('❌ プラン削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// プランの自動投稿ステータス更新
ipcMain.handle('update-plan-auto-post-status', async (event, { projectId, planId, isActive }) => {
  try {
    console.log('🔄 プラン自動投稿ステータス更新:', planId, isActive);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: 'プロジェクトIDとプランIDが必要です' };
    }

    const result = await firebaseService.updatePlanAutoPostStatus(projectId, planId, isActive);

    if (result.success) {
      console.log(`✅ プラン自動投稿ステータス更新成功: ${planId} → ${isActive ? '有効' : '無効'}`);
    }

    return result;
  } catch (error) {
    console.error('❌ プラン自動投稿ステータス更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン詳細情報を取得
ipcMain.handle('get-plan-details', async (event, projectId, planId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.getPlanDetails(projectId, planId);
    return result;
  } catch (error) {
    console.error('❌ プラン詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// 投稿管理 IPC ハンドラー
// ==========================================

// プロジェクトの投稿一覧を取得
ipcMain.handle('firebase-get-project-posts', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectPosts(projectId);
    return result;
  } catch (error) {
    return { success: false, error: error.message, posts: [] };
  }
});

// 個別投稿を取得
ipcMain.handle('firebase-get-post', async (event, projectId, planId, postId) => {
  try {
    const result = await firebaseService.getPost(projectId, planId, postId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿作成
ipcMain.handle('firebase-create-post', async (event, postData) => {
  try {
    const result = await firebaseService.createPost(postData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿更新
ipcMain.handle('firebase-update-post', async (event, projectId, planId, postId, updateData) => {
  try {
    const result = await firebaseService.updatePost(projectId, planId, postId, updateData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿削除
ipcMain.handle('firebase-delete-post', async (event, postId) => {
  try {
    const result = await firebaseService.deletePost(postId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プロジェクトの投稿一覧取得（全プランの投稿を含む）
ipcMain.handle('get-project-posts', async (event, projectId) => {
  try {
    console.log('⏰ 投稿一覧取得:', projectId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreからプロジェクトの投稿一覧を取得
    const result = await firebaseService.getProjectPosts(projectId);

    if (result.success) {
      console.log(`✅ 投稿一覧取得成功: ${result.posts.length}件`);
    }

    return result;
  } catch (error) {
    console.error('❌ 投稿一覧取得エラー:', error);
    return { success: false, error: error.message, posts: [] };
  }
});

// 投稿作成
ipcMain.handle('create-post', async (event, postData) => {
  try {
    console.log('📝 投稿作成:', postData.content?.substring(0, 50) + '...');

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const currentUser = firebaseService.getCurrentUser();
    const newPost = {
      ...postData,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const result = await firebaseService.createPost(postData.projectId, postData.planId, newPost);

    if (result.success) {
      console.log('✅ 投稿作成成功:', result.id);
    }

    return result;
  } catch (error) {
    console.error('❌ 投稿作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿更新（階層構造対応）
ipcMain.handle('update-post', async (event, { projectId, planId, postId, updateData }) => {
  try {
    console.log('✏️ 投稿更新:', postId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 必須パラメータチェック
    if (!projectId || !planId || !postId) {
      return { success: false, error: 'プロジェクトID、プランID、投稿IDが必要です' };
    }

    const result = await firebaseService.updatePost(projectId, planId, postId, updateData);

    if (result.success) {
      console.log('✅ 投稿更新成功:', postId);
    }

    return result;
  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿削除（階層構造対応）
ipcMain.handle('delete-post', async (event, { projectId, planId, postId }) => {
  try {
    console.log('🗑️ 投稿削除:', postId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // 必須パラメータチェック
    if (!projectId || !planId || !postId) {
      return { success: false, error: 'プロジェクトID、プランID、投稿IDが必要です' };
    }

    const result = await firebaseService.deletePost(projectId, planId, postId);

    if (result.success) {
      console.log('✅ 投稿削除成功:', postId);
    }

    return result;
  } catch (error) {
    console.error('❌ 投稿削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// ツイート履歴取得
ipcMain.handle('get-tweet-history', async (event) => {
  try {
    // ダミーデータを返す（実際の実装は後で追加）
    return {
      success: true,
      data: [
        {
          id: '1',
          text: 'AI生成投稿のサンプルです。#広告配信プラットフォーム',
          timestamp: new Date().toISOString(),
          platform: 'Twitter',
          isAI: true
        }
      ]
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// 会話記録管理 IPC ハンドラー
// ==========================================

// 会話記録を保存
ipcMain.handle('save-conversation', async (event, conversationData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const { projectId, planId, postId, messages, summary } = conversationData;

    if (!projectId || !planId || !postId || !messages) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.saveConversation(projectId, planId, postId, {
      planId,
      postId,
      messages,
      summary: summary || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ 会話記録保存エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿の会話記録を取得
ipcMain.handle('get-post-conversations', async (event, projectId, planId, postId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId || !postId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.getPostConversations(projectId, planId, postId);
    return result;
  } catch (error) {
    console.error('❌ 投稿会話記録取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン全体の会話記録を取得（collectionGroup使用）
ipcMain.handle('get-plan-conversations', async (event, planId, limit = 20) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!planId) {
      return { success: false, error: 'プランIDが必要です' };
    }

    const result = await firebaseService.getPlanConversations(planId, limit);
    return result;
  } catch (error) {
    console.error('❌ プラン会話記録取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// 会話記録を更新
ipcMain.handle('update-conversation', async (event, projectId, planId, postId, conversationId, updateData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId || !postId || !conversationId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.updateConversation(projectId, planId, postId, conversationId, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ 会話記録更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// 会話用の総合的な文脈情報を取得
ipcMain.handle('get-conversation-context', async (event, projectId, planId, postId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    // プロジェクト情報を取得
    const projectResult = await firebaseService.getProjectDetailsWithAISummary(projectId);
    if (!projectResult.success) {
      return { success: false, error: projectResult.error };
    }

    const context = {
      project: projectResult.project
    };

    // プラン情報を取得（プラン編集時）
    if (planId) {
      const planResult = await firebaseService.getPlanDetails(projectId, planId);
      if (planResult.success) {
        context.plan = planResult.plan;
      }

      // プラン全体の会話履歴を取得
      const conversationsResult = await firebaseService.getPlanConversations(planId, 10);
      if (conversationsResult.success) {
        context.conversationHistory = conversationsResult.conversations;
      }
    }

    // 投稿情報を取得（投稿編集時）
    if (postId && planId) {
      const postResult = await firebaseService.getPost(projectId, planId, postId);
      if (postResult.success) {
        context.post = postResult.post;
      }

      // 投稿の会話履歴を取得
      const postConversationsResult = await firebaseService.getPostConversations(projectId, planId, postId);
      if (postConversationsResult.success) {
        context.postConversations = postConversationsResult.conversations;
      }
    }

    console.log('✅ 会話文脈情報取得成功:', {
      projectId,
      planId: planId || 'なし',
      postId: postId || 'なし',
      hasAISummary: !!context.project?.aiSummary
    });

    return {
      success: true,
      context: context
    };

  } catch (error) {
    console.error('❌ 会話文脈情報取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// AI概要生成管理 IPC ハンドラー
// ==========================================

// プロジェクトのAI概要を生成
ipcMain.handle('generate-project-ai-summary', async (event, projectId, projectData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !projectData) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    // AI概要生成プロンプトを構築
    const prompt = `以下のプロジェクト情報を元に、SNS投稿生成に最適化された簡潔で魅力的な概要を作成してください。

プロジェクト名: ${projectData.name}
ユーザー説明: ${projectData.description || '説明なし'}
技術スタック: ${projectData.technologies ? projectData.technologies.join(', ') : '未指定'}
GitHub URL: ${projectData.githubUrl || '未設定'}

要件:
- 100-150文字程度で簡潔に
- SNS投稿での使用を想定
- プロジェクトの価値や特徴を強調
- 技術的すぎず、一般ユーザーにも理解しやすく
- ハッシュタグは含めない

概要:`;

    const result = await aiServiceManager.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.7
    });

    if (result.success) {
      const aiSummary = result.content.trim();

      // プロジェクトにAI概要を保存
      const updateResult = await firebaseService.updateProjectAISummary(projectId, {
        aiSummary: aiSummary,
        summaryHistory: projectData.summaryHistory || [],
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        provider: result.provider
      });

      if (updateResult.success) {
        console.log('✅ AI概要生成・保存成功:', aiSummary.substring(0, 50) + '...');
        return {
          success: true,
          aiSummary: aiSummary,
          provider: result.provider
        };
      } else {
        return { success: false, error: updateResult.error };
      }
    } else {
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('❌ AI概要生成エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのAI概要を更新
ipcMain.handle('update-project-ai-summary', async (event, projectId, aiSummary) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !aiSummary) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.updateProjectAISummary(projectId, {
      aiSummary: aiSummary.trim(),
      manuallyEdited: true,
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ AI概要更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト詳細情報を取得（AI概要含む）
ipcMain.handle('get-project-details-with-ai-summary', async (event, projectId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.getProjectDetailsWithAISummary(projectId);
    return result;
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// 自動投稿実行 IPC ハンドラー
// ==========================================

// プロジェクトの自動投稿実行
ipcMain.handle('execute-auto-posts-project', async (event, projectId) => {
  try {
    console.log('🤖 プロジェクト自動投稿実行:', projectId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.executeAutoPostsForProject(projectId);

    if (result.success) {
      console.log(`✅ プロジェクト自動投稿実行成功: ${result.generated}件生成`);
    }

    return result;
  } catch (error) {
    console.error('❌ プロジェクト自動投稿実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// 全プロジェクトの自動投稿実行
ipcMain.handle('execute-auto-posts-all', async (event) => {
  try {
    console.log('🌐 全プロジェクト自動投稿実行');

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const result = await firebaseService.executeAutoPostsForAllProjects();

    if (result.success) {
      console.log(`✅ 全プロジェクト自動投稿実行成功: ${result.totalGenerated}件生成`);
    }

    return result;
  } catch (error) {
    console.error('❌ 全プロジェクト自動投稿実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// 次回投稿予定取得
ipcMain.handle('get-upcoming-auto-posts', async (event, projectId) => {
  try {
    console.log('📅 次回投稿予定取得:', projectId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.getUpcomingAutoPosts(projectId);

    if (result.success) {
      console.log(`✅ 次回投稿予定取得成功: ${result.upcomingPosts.length}件`);
    }

    return result;
  } catch (error) {
    console.error('❌ 次回投稿予定取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// 手動自動投稿生成
ipcMain.handle('generate-manual-auto-post', async (event, { projectId, planId }) => {
  try {
    console.log('🎯 手動自動投稿生成:', projectId, planId);

    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: 'プロジェクトIDとプランIDが必要です' };
    }

    const result = await firebaseService.generateManualAutoPost(projectId, planId);

    if (result.success) {
      console.log('✅ 手動自動投稿生成成功:', result.postId);
    }

    return result;
  } catch (error) {
    console.error('❌ 手動自動投稿生成エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// データ移行・同期 IPC ハンドラー
// ==========================================

// 移行状態チェック
ipcMain.handle('check-migration-status', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }

    const status = await migrationService.checkMigrationStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error('❌ 移行状態チェックエラー:', error);
    return { success: false, error: error.message };
  }
});

// ローカル→Firestore移行実行
ipcMain.handle('migrate-local-to-firestore', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }

    console.log('🔄 ローカル→Firestore移行開始');
    const result = await migrationService.migrateLocalProjectsToFirestore();

    if (result.success) {
      console.log(`✅ 移行完了: ${result.migrated}件`);
    } else {
      console.error('❌ 移行失敗:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ 移行実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestore→ローカル同期実行
ipcMain.handle('sync-firestore-to-local', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }

    console.log('⬇️ Firestore→ローカル同期開始');
    const result = await migrationService.syncFirestoreToLocal();

    if (result.success) {
      console.log(`✅ 同期完了: ${result.synced}件`);
    } else {
      console.error('❌ 同期失敗:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ 同期実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// ユーティリティ・テスト IPC ハンドラー
// ==========================================

// Cloud Function手動実行（デバッグ用）
ipcMain.handle('test-cloud-function', async (event, functionName) => {
  try {
    const https = require('https');
    const http = require('http');

    // Firebase Functions URLの設定
    const projectId = 'ad-project-4fb54'; // 実際のプロジェクトID
    const region = 'us-central1'; // リージョン
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

    console.log(`🚀 Cloud Function実行: ${functionUrl}`);

    return new Promise((resolve, reject) => {
      const url = new URL(functionUrl);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({ success: true, data: result });
          } catch (parseError) {
            resolve({ success: false, error: 'レスポンスの解析に失敗', data });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      req.end();
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
});

module.exports = {
  initializeServices
};
