/**
 * 自動投稿処理 Cloud Function
 * 定期的にプランベースの自動投稿を生成・実行
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest} = require('firebase-functions/v2/https');

// Firestoreインスタンス
const db = admin.firestore();

/**
 * 自動投稿プロセッサー
 * cron: 毎日9時に実行 ('0 9 * * *')
 * 3日後が投稿予定日のプランの投稿を生成
 */
exports.processAutoPostsScheduled = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'Asia/Tokyo',
  memory: '1GiB',
  timeoutSeconds: 540,
  minInstances: 0
}, async (event) => {
    console.log('🤖 自動投稿処理開始 - スケジュール実行');
    
    try {
      const result = await processAllUsersAutoPosts();
      
      console.log(`✅ 自動投稿処理完了 - 処理ユーザー: ${result.processedUsers}人, 生成投稿: ${result.totalGenerated}件`);
      
      return {
        success: true,
        processedUsers: result.processedUsers,
        totalGenerated: result.totalGenerated,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 自動投稿処理エラー:', error);
      throw error;
    }
  });

/**
 * 手動自動投稿処理トリガー
 * HTTPリクエストで手動実行可能
 */
exports.processAutoPostsManual = onRequest({
  memory: '1GiB',
  timeoutSeconds: 540,
  minInstances: 0,
  cors: true
}, async (req, res) => {
    console.log('🎯 自動投稿処理開始 - 手動実行');
    
    try {
      const result = await processAllUsersAutoPosts();
      
      console.log(`✅ 自動投稿処理完了 - 処理ユーザー: ${result.processedUsers}人, 生成投稿: ${result.totalGenerated}件`);
      
      res.json({
        success: true,
        processedUsers: result.processedUsers,
        totalGenerated: result.totalGenerated,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ 自動投稿処理エラー:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

/**
 * 全ユーザーの自動投稿を処理
 */
async function processAllUsersAutoPosts() {
  const startTime = Date.now();
  let processedProjects = 0;
  let totalGenerated = 0;
  
  try {
    // collectionGroupでプロジェクトを直接検索
    console.log('🔍 全プロジェクトを直接検索中...');
    const projectsSnapshot = await db.collectionGroup('projects').get();
    
    console.log(`📋 対象プロジェクト数: ${projectsSnapshot.docs.length}件`);
    
    if (projectsSnapshot.docs.length === 0) {
      console.log('⚠️ プロジェクトが見つかりません');
      return {
        processedUsers: 0,
        totalGenerated: 0
      };
    }
    
    // ユーザー別にグループ化
    const projectsByUser = new Map();
    projectsSnapshot.docs.forEach(projectDoc => {
      const projectData = projectDoc.data();
      const projectPath = projectDoc.ref.path; // users/{userId}/projects/{projectId}
      const userId = projectPath.split('/')[1]; // パスからuserIdを抽出
      
      if (!projectsByUser.has(userId)) {
        projectsByUser.set(userId, []);
      }
      projectsByUser.get(userId).push({
        id: projectDoc.id,
        data: projectData,
        ref: projectDoc.ref
      });
    });
    
    console.log(`👥 対象ユーザー数: ${projectsByUser.size}人`);
    
    // 各ユーザーのプロジェクトを処理
    for (const [userId, userProjects] of projectsByUser) {
      try {
        console.log(`🔄 ユーザー処理開始: ${userId} (プロジェクト: ${userProjects.length}件)`);
        let userGeneratedCount = 0;
        
        for (const project of userProjects) {
          try {
            const result = await processProjectAutoPosts(userId, project.id, project.data);
            if (result.generatedPosts > 0) {
              userGeneratedCount += result.generatedPosts;
              console.log(`📝 プロジェクト処理: ${project.data.name} - ${result.generatedPosts}件生成`);
            }
          } catch (projectError) {
            console.error(`❌ プロジェクト処理エラー (${project.id}):`, projectError);
            // エラーが発生したプロジェクトはスキップして続行
          }
        }
        
        if (userGeneratedCount > 0) {
          processedProjects += userProjects.length;
          totalGenerated += userGeneratedCount;
          console.log(`✅ ユーザー処理完了: ${userId} - 生成: ${userGeneratedCount}件`);
        }
        
      } catch (userError) {
        console.error(`❌ ユーザー処理エラー (${userId}):`, userError);
        // エラーが発生したユーザーはスキップして続行
      }
    }
    
    const duration = Date.now() - startTime;
    const processedUsers = projectsByUser.size;
    console.log(`🎉 全体処理完了 - 時間: ${duration}ms, ユーザー: ${processedUsers}人, 投稿: ${totalGenerated}件`);
    
    return {
      processedUsers,
      totalGenerated,
      duration
    };
    
  } catch (error) {
    console.error('❌ 全ユーザー処理エラー:', error);
    throw error;
  }
}

/**
 * 特定ユーザーの自動投稿を処理
 */
async function processUserAutoPosts(userId) {
  let processedProjects = 0;
  let totalGenerated = 0;
  
  try {
    // ユーザーの全プロジェクトを取得
    const projectsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .get();
    
    if (projectsSnapshot.empty) {
      console.log(`ℹ️ プロジェクトなし: ${userId}`);
      return { processedProjects: 0, totalGenerated: 0 };
    }
    
    // 各プロジェクトの自動投稿を処理
    for (const projectDoc of projectsSnapshot.docs) {
      try {
        const projectId = projectDoc.id;
        const projectData = projectDoc.data();
        
        const result = await processProjectAutoPosts(userId, projectId, projectData);
        
        if (result.generatedPosts > 0) {
          processedProjects++;
          totalGenerated += result.generatedPosts;
          
          console.log(`📝 プロジェクト処理: ${projectData.name} - ${result.generatedPosts}件生成`);
        }
        
      } catch (projectError) {
        console.error(`❌ プロジェクト処理エラー (${projectDoc.id}):`, projectError);
        // エラーが発生したプロジェクトはスキップして続行
      }
    }
    
    return {
      processedProjects,
      totalGenerated
    };
    
  } catch (error) {
    console.error(`❌ ユーザー処理エラー (${userId}):`, error);
    throw error;
  }
}

/**
 * 特定プロジェクトの自動投稿を処理
 */
async function processProjectAutoPosts(userId, projectId, projectData) {
  let generatedPosts = 0;
  
  try {
    // プロジェクトの全プランを取得
    const plansSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .where('isActive', '==', true)
      .get();
    
    if (plansSnapshot.empty) {
      return { generatedPosts: 0 };
    }
    
    const currentTime = new Date();
    
    // 各プランをチェック
    for (const planDoc of plansSnapshot.docs) {
      try {
        const planId = planDoc.id;
        const planData = planDoc.data();

        console.log(`🔍 プラン検査開始: ${planData.name} (ID: ${planId})`);
        console.log(`  - frequency: ${planData.frequency}`);
        console.log(`  - schedule.frequency: ${planData.schedule?.frequency}`);
        console.log(`  - isActive: ${planData.isActive}`);
        console.log(`  - platform: ${planData.platform}`);

        // スケジュールチェック
        const shouldGenerate = shouldGeneratePost(planData, currentTime);
        console.log(`  → 投稿生成判定: ${shouldGenerate}`);

        if (shouldGenerate) {
          const result = await generateAutoPost(userId, projectId, projectData, planId, planData);

          if (result.success) {
            generatedPosts++;
            console.log(`✅ 自動投稿生成成功: ${planData.name} (${planData.platform})`);
          } else {
            console.log(`❌ 自動投稿生成失敗: ${planData.name} - ${result.error}`);
          }
        }

      } catch (planError) {
        console.error(`❌ プラン処理エラー (${planDoc.id}):`, planError);
        // エラーが発生したプランはスキップして続行
      }
    }
    
    return { generatedPosts };
    
  } catch (error) {
    console.error(`❌ プロジェクト処理エラー (${projectId}):`, error);
    throw error;
  }
}

/**
 * プランが投稿生成対象かどうかをチェック
 */
function shouldGeneratePost(planData, currentTime, isManualExecution = false) {
  console.log(`📅 shouldGeneratePost チェック開始`);

  if (!planData.schedule) {
    console.log(`  ❌ schedule が存在しません`);
    return false;
  }

  const schedule = planData.schedule;
  const frequency = planData.frequency;
  const scheduleTime = schedule.time || '10:00';

  if (!frequency) {
    console.log(`  ❌ frequency が存在しません (planData.frequency: ${frequency})`);
    return false;
  }

  // 手動実行でない場合は、3日後が投稿対象日かをチェック
  console.log(`  - プラン時刻: ${scheduleTime}`);
  console.log(`  - frequency: ${frequency}`);
  console.log(`  - 3日後投稿予定をチェック中`);

  // 頻度別チェック（3日後の投稿を想定）
  const targetDate = new Date(currentTime);
  targetDate.setDate(targetDate.getDate() + 3); // 3日後

  switch (frequency) {
    case 'daily':
      console.log(`  ✅ daily: 常に生成対象`);
      return true; // 毎日投稿
      
    case 'weekly':
      if (!schedule.weekdays) return false;
      const targetDay = targetDate.getDay(); // 3日後の曜日
      const weekdayMapping = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      const targetDays = schedule.weekdays.map(day => weekdayMapping[day]).filter(d => d !== undefined);
      const shouldPostWeekly = targetDays.includes(targetDay);
      console.log(`📅 週次投稿チェック: 3日後(${targetDay})が対象曜日(${targetDays})に含まれるか → ${shouldPostWeekly}`);
      return shouldPostWeekly;
      
    case 'monthly':
      const targetDateOfMonth = targetDate.getDate(); // 3日後の日付
      const scheduledDateOfMonth = schedule.dayOfMonth || 1;
      const shouldPostMonthly = targetDateOfMonth === scheduledDateOfMonth;
      console.log(`📅 月次投稿チェック: 3日後の日付(${targetDateOfMonth})が設定日(${scheduledDateOfMonth})と一致するか → ${shouldPostMonthly}`);
      return shouldPostMonthly;
      
    default:
      return false;
  }
}

/**
 * 自動投稿を生成
 */
async function generateAutoPost(userId, projectId, projectData, planId, planData) {
  try {
    // AI投稿内容を生成（改良版）
    const aiResult = await generateAIContent(projectData, planData, userId, projectId, planId);
    
    // 投稿日時を計算（3日後のプラン設定時刻）- JST対応修正版
    const scheduleTime = planData.schedule?.time || '10:00';
    const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

    // 現在のUTC時刻から3日後の日付を計算
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 3);

    // UTC時刻で指定時刻を設定（JST時刻をUTCに変換）
    // JST時刻からUTC時刻に変換: JST時刻 - 9時間 = UTC時刻
    const utcHour = scheduleHour - 9;
    let finalHour = utcHour;
    let dayOffset = 0;

    // 時刻が負の値の場合は前日に調整
    if (utcHour < 0) {
      finalHour = utcHour + 24;
      dayOffset = -1;
    }
    // 時刻が24以上の場合は翌日に調整
    else if (utcHour >= 24) {
      finalHour = utcHour - 24;
      dayOffset = 1;
    }

    // 最終的な投稿予定時刻を設定（UTC）
    const scheduledAt = new Date(targetDate);
    scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
    scheduledAt.setHours(finalHour, scheduleMinute, 0, 0);

    // デバッグ用ログ出力
    console.log(`🕐 プラン設定時刻(JST): ${scheduleTime}`);
    console.log(`🌏 現在のUTC時刻: ${now.toISOString()}`);
    console.log(`📅 3日後の基準日: ${targetDate.toDateString()}`);
    console.log(`🔄 JST→UTC変換: ${scheduleHour}:${scheduleMinute} JST → ${finalHour}:${scheduleMinute} UTC (日付オフセット: ${dayOffset}日)`);
    console.log(`📅 最終的な投稿予定時刻(UTC): ${scheduledAt.toISOString()}`);
    console.log(`📅 投稿予定時刻(JST確認): ${new Date(scheduledAt.getTime() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')}`);

    // AI生成結果に応じて投稿データを作成
    let postData;

    if (aiResult.success) {
      // AI生成成功時
      postData = {
        content: aiResult.content,
        scheduledAt: scheduledAt.toISOString(),
        status: 'scheduled',
        type: 'auto_generated',
        platform: planData.platform,
        planId: planId,
        planName: planData.name,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    } else {
      // AI生成失敗時 - 手動入力必要な状態で投稿作成
      postData = {
        content: `【AI生成失敗 - 手動入力が必要です】\n\nエラー: ${aiResult.error}\n\nプラン: ${planData.name}\nプラットフォーム: ${planData.platform}\n\n※ この投稿を編集して内容を入力してください`,
        scheduledAt: scheduledAt.toISOString(),
        status: 'draft', // draftステータスに変更
        type: 'ai_failed_manual_required',
        platform: planData.platform,
        planId: planId,
        planName: planData.name,
        aiGenerationFailed: true,
        aiError: aiResult.error,
        requiresManualInput: true,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      console.error(`❌ AI生成失敗により手動入力用ドラフト作成: ${planData.name}`);
    }
    
    // Firestoreに投稿を保存
    const postsRef = db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .doc(planId)
      .collection('posts');
    
    const docRef = await postsRef.add(postData);
    
    console.log(`📝 自動投稿保存成功: ${docRef.id}`);

    return {
      success: true,
      postId: docRef.id,
      content: aiResult.success ? aiResult.content : postData.content,
      aiGenerationStatus: aiResult.success ? 'success' : 'failed',
      requiresManualInput: !aiResult.success
    };
    
  } catch (error) {
    console.error('❌ 自動投稿生成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 過去の投稿履歴を取得
 */
async function getRecentPosts(userId, projectId, planId, limit = 5) {
  try {
    const postsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .doc(planId)
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit * 2) // 失敗投稿除外のため多めに取得
      .get();

    if (postsSnapshot.empty) {
      return [];
    }

    // AI生成失敗の投稿を除外し、成功した投稿のみ取得
    const posts = postsSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        // AI生成失敗の投稿を除外
        return data.type !== 'ai_failed_manual_required' &&
               !data.aiGenerationFailed &&
               !data.content.startsWith('【AI生成失敗');
      })
      .slice(0, limit) // 指定件数に制限
      .map(doc => ({
        id: doc.id,
        content: doc.data().content,
        createdAt: doc.data().createdAt,
        platform: doc.data().platform
      }));

    console.log(`📋 過去の投稿履歴: ${posts.length}件を取得（失敗投稿除外済み）`);
    return posts;

  } catch (error) {
    console.error('❌ 過去投稿取得エラー:', error);
    return [];
  }
}

/**
 * 改良版AI投稿内容を生成（重複回避・バリエーション・学習履歴対応）
 */
async function generateAIContent(projectData, planData, userId, projectId, planId) {
  try {
    const aiServiceManager = require('./ai-service-manager');

    // 過去の投稿履歴を取得
    const recentPosts = await getRecentPosts(userId, projectId, planId, 5);

    // Plan全体の会話記録から学習データを取得
    const conversationLearning = await getPlanConversationLearning(planId);

    // プロンプトを構築（学習データを含む）
    let prompt = buildEnhancedPrompt(projectData, planData, recentPosts, conversationLearning);

    console.log('🎯 学習履歴を含む強化されたプロンプトを使用');
    console.log('📜 過去投稿数:', recentPosts.length);
    console.log('🧠 学習データ:', conversationLearning ? '有り' : '無し');

    const result = await aiServiceManager.generateTextWithUserConfig(prompt, {
      maxTokens: 400,
      temperature: 0.8 // 少し高めでバリエーション促進
    }, userId);

    if (result.success) {
      console.log(`✅ AI投稿生成成功 (${result.provider}): ${result.content.substring(0, 50)}...`);
      return {
        success: true,
        content: result.content.trim()
      };
    } else {
      console.error(`❌ AI投稿生成失敗: ${result.error}`);
      return {
        success: false,
        error: result.error,
        requiresManualInput: true
      };
    }
  } catch (error) {
    console.error('❌ AI投稿生成エラー:', error);
    return {
      success: false,
      error: error.message,
      requiresManualInput: true
    };
  }
}

/**
 * Plan全体の会話記録から学習データを取得
 */
async function getPlanConversationLearning(planId) {
  try {
    // collectionGroupを使用してプラン内の全会話記録を取得
    const conversationsSnapshot = await db.collectionGroup('conversations')
      .where('planId', '==', planId)
      .orderBy('createdAt', 'desc')
      .limit(10) // 最新10件の会話を分析
      .get();

    if (conversationsSnapshot.empty) {
      console.log('📭 会話記録なし:', planId);
      return null;
    }

    const conversations = [];
    conversationsSnapshot.forEach(doc => {
      conversations.push(doc.data());
    });

    console.log(`🧠 Plan学習データ取得: ${conversations.length}件の会話を分析`);

    // 学習パターンを抽出
    const learningData = extractLearningPatterns(conversations);
    return learningData;

  } catch (error) {
    console.error('❌ Plan学習データ取得エラー:', error);
    return null;
  }
}

/**
 * 会話記録から学習パターンを抽出
 */
function extractLearningPatterns(conversations) {
  const patterns = {
    tonePreferences: new Set(),
    styleElements: new Set(),
    improvements: new Set(),
    frequency: {}
  };

  conversations.forEach(conversation => {
    // summaryからパターンを抽出
    if (conversation.summary) {
      if (conversation.summary.userPreferences) {
        conversation.summary.userPreferences.forEach(pref => {
          patterns.tonePreferences.add(pref);
        });
      }
      if (conversation.summary.improvements) {
        conversation.summary.improvements.forEach(imp => {
          patterns.improvements.add(imp);
        });
      }
    }

    // メッセージからパターンを直接抽出
    if (conversation.messages) {
      conversation.messages.forEach(message => {
        if (message.role === 'user') {
          const content = message.content.toLowerCase();

          // 頻度を記録
          const preferences = ['カジュアル', '親しみ', 'フォーマル', '丁寧', '絵文字', '短く', '簡潔', '具体的'];
          preferences.forEach(pref => {
            if (content.includes(pref)) {
              patterns.frequency[pref] = (patterns.frequency[pref] || 0) + 1;
            }
          });
        }
      });
    }
  });

  // 最も頻度の高い設定を選出
  const topPreferences = Object.entries(patterns.frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([pref, count]) => ({ preference: pref, count }));

  return {
    tonePreferences: Array.from(patterns.tonePreferences),
    styleElements: Array.from(patterns.styleElements),
    improvements: Array.from(patterns.improvements),
    topPreferences: topPreferences,
    totalConversations: conversations.length
  };
}

/**
 * 強化されたプロンプトを構築（重複回避・バリエーション・学習履歴対応）
 */
function buildEnhancedPrompt(projectData, planData, recentPosts, conversationLearning) {
  let prompt = '';

  // カスタムプロンプトがある場合はベースとして使用
  if (planData.customPrompt) {
    prompt += planData.customPrompt + '\n\n';
  } else {
    // デフォルトプロンプト
    prompt += `${projectData.name}プロジェクトについて、${planData.platform}向けの投稿を作成してください。
プロジェクト概要: ${planData.description || projectData.description || 'ソフトウェア開発プロジェクト'}
トーン: ${planData.tone || '親しみやすく、専門的'}
文字数: ${planData.platform === 'twitter' ? '280文字以内' : '200文字程度'}

`;
  }

  // 学習履歴を活用した指示を追加
  if (conversationLearning && conversationLearning.topPreferences.length > 0) {
    prompt += `【学習済みユーザー設定】\n`;
    prompt += `過去の対話から学習したあなたの好みを反映します：\n`;

    conversationLearning.topPreferences.forEach(pref => {
      prompt += `- ${pref.preference}を重視 (${pref.count}回指定)\n`;
    });

    if (conversationLearning.tonePreferences.length > 0) {
      const toneText = conversationLearning.tonePreferences.join('、');
      prompt += `- 希望トーン: ${toneText}\n`;
    }

    if (conversationLearning.improvements.length > 0) {
      const improvementText = conversationLearning.improvements.join('、');
      prompt += `- 重視する改善点: ${improvementText}\n`;
    }

    prompt += `\n`;
  }

  // 重複回避指示を追加
  if (recentPosts.length > 0) {
    prompt += `【重要: 過去投稿との重複回避】
以下は過去の投稿履歴です。これらとは異なる角度や表現で、新鮮で魅力的な投稿を作成してください：

`;
    
    recentPosts.forEach((post, index) => {
      // 投稿内容の最初の100文字を表示
      const preview = post.content.length > 100 
        ? post.content.substring(0, 100) + '...'
        : post.content;
      prompt += `${index + 1}. ${preview}\n`;
    });

    prompt += `
【バリエーション指示】
- 上記の投稿とは異なる切り口でアプローチしてください
- 同じキーワードや表現の繰り返しを避けてください  
- 新しい視点や価値を提供してください
- ユーザーにとって価値のある異なる情報を含めてください

`;
  }

  // 投稿スタイルのバリエーション指示
  const styleVariations = [
    '開発進捗を報告するスタイル',
    'ユーザー価値にフォーカスしたスタイル',
    '技術的な学びを共有するスタイル',
    'プロジェクトの背景や想いを伝えるスタイル',
    '未来への展望を語るスタイル'
  ];

  const randomStyle = styleVariations[Math.floor(Math.random() * styleVariations.length)];
  prompt += `【今回のスタイル】: ${randomStyle}\n\n`;

  // プラットフォーム別の最終指示（明確に投稿本文のみを要求）
  prompt += `【重要な出力形式】\n`;
  if (planData.platform === 'twitter') {
    prompt += `- Twitter投稿の本文のみを出力してください\n`;
    prompt += `- 「承知しました」「投稿プラン」「投稿案」などの前置きや説明は不要です\n`;
    prompt += `- ハッシュタグを含めて280文字以内に収めてください\n`;
    prompt += `- 投稿本文そのものだけを1つ生成してください\n`;
  } else {
    prompt += `- ${planData.platform}投稿の本文のみを出力してください\n`;
    prompt += `- 「承知しました」「投稿プラン」「投稿案」などの前置きや説明は不要です\n`;
    prompt += `- ハッシュタグを含めて適切な長さで作成してください\n`;
    prompt += `- 投稿本文そのものだけを1つ生成してください\n`;
  }

  return prompt;
}

/**
 * フォールバック投稿内容を生成
 */
function generateFallbackContent(projectData, planData) {
  const templates = {
    twitter: [
      `${projectData.name}の開発進捗をお知らせします！ 🚀 #開発`,
      `${projectData.name}プロジェクトの最新情報をチェック！ 💡 #テック`,
      `${projectData.name}で新しいことに挑戦中です 🌟 #プログラミング`
    ],
    instagram: [
      `${projectData.name}の開発風景をシェア 📸✨ 毎日少しずつ前進中！`,
      `プロジェクト ${projectData.name} の成長記録 📈 #開発日記`,
      `${projectData.name}をより良くするために頑張っています 💪 #挑戦`
    ],
    linkedin: [
      `${projectData.name}プロジェクトの技術的成果について共有いたします。`,
      `${projectData.name}の開発を通じて得られた知見をお伝えします。`,
      `${projectData.name}における革新的なアプローチについて。`
    ],
    facebook: [
      `${projectData.name}の開発チームから近況報告です！`,
      `${projectData.name}プロジェクト、順調に進行中です 😊`,
      `${projectData.name}の最新アップデートをお知らせします！`
    ]
  };
  
  const platformTemplates = templates[planData.platform] || templates.twitter;
  const randomTemplate = platformTemplates[Math.floor(Math.random() * platformTemplates.length)];
  
  return randomTemplate;
}