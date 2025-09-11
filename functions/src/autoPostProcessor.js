/**
 * 自動投稿処理 Cloud Function
 * 定期的にプランベースの自動投稿を生成・実行
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Firestoreインスタンス
const db = admin.firestore();

/**
 * 自動投稿プロセッサー
 * cron: 毎日9時に実行 ('0 9 * * *')
 * 3日後が投稿予定日のプランの投稿を生成
 */
exports.processAutoPostsScheduled = functions
  .runWith({
    timeoutSeconds: 540, // 9分タイムアウト
    memory: '1GB'
  })
  .pubsub
  .schedule('0 9 * * *') // 毎日9時実行
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
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
exports.processAutoPostsManual = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https
  .onRequest(async (req, res) => {
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
        
        // スケジュールチェック
        if (shouldGeneratePost(planData, currentTime)) {
          const result = await generateAutoPost(userId, projectId, projectData, planId, planData);
          
          if (result.success) {
            generatedPosts++;
            console.log(`✅ 自動投稿生成: ${planData.name} (${planData.platform})`);
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
  if (!planData.schedule) {
    return false;
  }
  
  const schedule = planData.schedule;
  const frequency = planData.frequency;
  const scheduleTime = schedule.time || '10:00';
  
  // 手動実行でない場合は、3日後が投稿対象日かをチェック
  console.log(`📅 プラン時刻: ${scheduleTime} - 3日後投稿予定をチェック中`);
  
  // 頻度別チェック（3日後の投稿を想定）
  const targetDate = new Date(currentTime);
  targetDate.setDate(targetDate.getDate() + 3); // 3日後
  
  switch (frequency) {
    case 'daily':
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
    const content = await generateAIContent(projectData, planData, userId, projectId, planId);
    
    // 投稿日時を計算（3日後のプラン設定時刻）- JST対応
    const scheduleTime = planData.schedule?.time || '10:00';
    const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);
    
    // 日本時間（JST）で3日後の日付を計算
    const now = new Date();
    const jstOffset = 9 * 60; // JST = UTC+9時間（分換算）
    const nowJST = new Date(now.getTime() + jstOffset * 60 * 1000);
    
    // 3日後のJST日付を計算
    const targetDateJST = new Date(nowJST);
    targetDateJST.setDate(targetDateJST.getDate() + 3);
    
    // 指定時刻を設定（JST）
    targetDateJST.setHours(scheduleHour, scheduleMinute, 0, 0);
    
    // UTCに変換してISO文字列で保存
    const scheduledAt = new Date(targetDateJST.getTime() - jstOffset * 60 * 1000);
    
    // デバッグ用ログ出力
    console.log(`🕐 プラン設定時刻: ${scheduleTime}`);
    console.log(`🌏 現在のUTC時刻: ${now.toISOString()}`);
    console.log(`🇯🇵 現在のJST時刻: ${nowJST.toISOString()}`);
    console.log(`📅 3日後のJST日時: ${targetDateJST.toISOString()}`);
    console.log(`📅 最終的な投稿予定時刻(UTC): ${scheduledAt.toISOString()}`);
    console.log(`📅 投稿予定時刻(JST表示): ${new Date(scheduledAt.getTime() + jstOffset * 60 * 1000).toISOString()}`);
    
    // 投稿データを作成
    const postData = {
      content: content,
      scheduledAt: scheduledAt.toISOString(),
      status: 'scheduled',
      type: 'auto_generated',
      platform: planData.platform,
      planId: planId,
      planName: planData.name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
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
      content: content
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
      .limit(limit)
      .get();

    if (postsSnapshot.empty) {
      return [];
    }

    const posts = postsSnapshot.docs.map(doc => ({
      id: doc.id,
      content: doc.data().content,
      createdAt: doc.data().createdAt,
      platform: doc.data().platform
    }));

    console.log(`📋 過去の投稿履歴: ${posts.length}件を取得`);
    return posts;

  } catch (error) {
    console.error('❌ 過去投稿取得エラー:', error);
    return [];
  }
}

/**
 * 改良版AI投稿内容を生成（重複回避・バリエーション対応）
 */
async function generateAIContent(projectData, planData, userId, projectId, planId) {
  try {
    const aiServiceManager = require('./ai-service-manager');
    
    // 過去の投稿履歴を取得
    const recentPosts = await getRecentPosts(userId, projectId, planId, 5);
    
    // プロンプトを構築
    let prompt = buildEnhancedPrompt(projectData, planData, recentPosts);
    
    console.log('🎯 強化されたプロンプトを使用');
    console.log('📜 過去投稿数:', recentPosts.length);

    const result = await aiServiceManager.generateText(prompt, {
      maxTokens: 400,
      temperature: 0.8 // 少し高めでバリエーション促進
    });

    if (result.success) {
      console.log(`✅ AI投稿生成成功 (${result.provider}): ${result.content.substring(0, 50)}...`);
      return result.content.trim();
    } else {
      console.warn(`⚠️ AI投稿生成失敗、フォールバックを使用: ${result.error}`);
      return generateFallbackContent(projectData, planData);
    }
  } catch (error) {
    console.error('❌ AI投稿生成エラー:', error);
    return generateFallbackContent(projectData, planData);
  }
}

/**
 * 強化されたプロンプトを構築（重複回避・バリエーション対応）
 */
function buildEnhancedPrompt(projectData, planData, recentPosts) {
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

  // プラットフォーム別の最終指示
  if (planData.platform === 'twitter') {
    prompt += 'ハッシュタグも含めて280文字以内で作成してください。';
  } else {
    prompt += 'ハッシュタグも含めてください。';
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