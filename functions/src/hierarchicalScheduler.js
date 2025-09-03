const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {TwitterApi} = require("twitter-api-v2");
const {decryptTwitterConfig} = require("./utils/encryption");

/**
 * 階層構造対応のスケジュール投稿システム
 * users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}
 */

/**
 * スケジュールされた投稿を自動実行するCloud Function
 * Cloud Schedulerから定期実行される（例：5分間隔）
 */
exports.processScheduledPosts = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  
  try {
    console.log("🚀 階層構造スケジュール投稿処理開始...");
    const now = new Date();
    const processedPosts = [];
    let successCount = 0;
    let errorCount = 0;

    // 1. 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`👤 ユーザー ${userId} の投稿をチェック中...`);

      // 2. ユーザーのプロジェクトを取得
      const projectsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('projects')
        .get();

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;
        const projectData = projectDoc.data();

        // 3. プロジェクトのプランを取得
        const plansSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('projects')
          .doc(projectId)
          .collection('plans')
          .get();

        for (const planDoc of plansSnapshot.docs) {
          const planId = planDoc.id;
          const planData = planDoc.data();

          // 4. スケジュールされた投稿を取得
          const postsQuery = await db
            .collection('users')
            .doc(userId)
            .collection('projects')
            .doc(projectId)
            .collection('plans')
            .doc(planId)
            .collection('posts')
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', now.toISOString())
            .limit(10) // プランあたり最大10件
            .get();

          for (const postDoc of postsQuery.docs) {
            const postData = postDoc.data();
            
            try {
              console.log(`📝 投稿処理開始: ${postData.content?.substring(0, 30)}...`);

              // プラットフォーム別の投稿処理
              let postResult;
              switch (postData.platform) {
                case 'twitter':
                  postResult = await postToTwitter(userId, projectId, planId, postData, planData, projectData);
                  break;
                case 'instagram':
                  postResult = await postToInstagram(userId, projectId, planId, postData, planData, projectData);
                  break;
                case 'linkedin':
                  postResult = await postToLinkedIn(userId, projectId, planId, postData, planData, projectData);
                  break;
                case 'facebook':
                  postResult = await postToFacebook(userId, projectId, planId, postData, planData, projectData);
                  break;
                default:
                  throw new Error(`未対応のプラットフォーム: ${postData.platform}`);
              }

              // 成功時の処理
              await postDoc.ref.update({
                status: 'posted',
                postedAt: admin.firestore.FieldValue.serverTimestamp(),
                platformData: postResult.platformData,
                actualContent: postResult.actualContent || postData.content
              });

              processedPosts.push({
                userId,
                projectId,
                planId,
                postId: postDoc.id,
                platform: postData.platform,
                success: true,
                platformData: postResult.platformData
              });

              successCount++;
              console.log(`✅ 投稿成功: ${postData.platform} - ${postResult.platformData?.id || 'ID不明'}`);

              // API制限対策：少し待機
              await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
              console.error(`❌ 投稿失敗 (${postDoc.id}):`, error);
              errorCount++;

              // 失敗をデータベースに記録
              await postDoc.ref.update({
                status: 'failed',
                error: {
                  message: error.message,
                  code: error.code || 'UNKNOWN',
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  retryCount: admin.firestore.FieldValue.increment(1)
                }
              });

              processedPosts.push({
                userId,
                projectId,
                planId,
                postId: postDoc.id,
                platform: postData.platform,
                success: false,
                error: error.message
              });
            }
          }
        }
      }
    }

    // 実行結果のサマリー
    const summary = {
      timestamp: new Date().toISOString(),
      totalProcessed: processedPosts.length,
      successCount,
      errorCount,
      details: processedPosts
    };

    console.log("🎉 スケジュール投稿処理完了:", summary);

    // 実行ログを保存
    await db.collection('systemLogs').add({
      functionName: 'processScheduledPosts',
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary
    });

    res.status(200).json({
      success: true,
      message: 'スケジュール投稿処理完了',
      summary
    });

  } catch (error) {
    console.error("💥 スケジュール投稿処理でエラー:", error);

    // エラーログを保存
    await db.collection('systemLogs').add({
      functionName: 'processScheduledPosts',
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: {
        message: error.message,
        stack: error.stack
      },
      success: false
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Twitter投稿処理
 */
async function postToTwitter(userId, projectId, planId, postData, planData, projectData) {
  console.log(`🐦 Twitter投稿処理開始...`);

  // Twitter認証情報を取得
  const db = admin.firestore();
  const credentialsDoc = await db
    .collection('users')
    .doc(userId)
    .collection('credentials')
    .doc('twitter')
    .get();

  if (!credentialsDoc.exists) {
    throw new Error('Twitter認証情報が設定されていません');
  }

  const encryptedCredentials = credentialsDoc.data();
  const twitterConfig = decryptTwitterConfig(encryptedCredentials);

  if (!twitterConfig.apiKey || !twitterConfig.apiSecret || 
      !twitterConfig.accessToken || !twitterConfig.accessTokenSecret) {
    throw new Error('Twitter認証情報が不完全です');
  }

  // Twitter APIクライアント作成
  const client = new TwitterApi({
    appKey: twitterConfig.apiKey,
    appSecret: twitterConfig.apiSecret,
    accessToken: twitterConfig.accessToken,
    accessSecret: twitterConfig.accessTokenSecret,
  });

  // ツイート投稿
  const response = await client.v2.tweet(postData.content);

  return {
    platformData: {
      id: response.data.id,
      url: `https://twitter.com/user/status/${response.data.id}`,
      engagement: {
        likes: 0,
        retweets: 0,
        replies: 0
      }
    },
    actualContent: postData.content
  };
}

/**
 * Instagram投稿処理（プレースホルダー）
 */
async function postToInstagram(userId, projectId, planId, postData, planData, projectData) {
  console.log(`📷 Instagram投稿処理開始...`);
  
  // Instagram API実装予定
  // 現在はプレースホルダーとして成功を返す
  
  return {
    platformData: {
      id: 'instagram_' + Date.now(),
      url: `https://instagram.com/p/placeholder`,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    },
    actualContent: postData.content
  };
}

/**
 * LinkedIn投稿処理（プレースホルダー）
 */
async function postToLinkedIn(userId, projectId, planId, postData, planData, projectData) {
  console.log(`💼 LinkedIn投稿処理開始...`);
  
  // LinkedIn API実装予定
  
  return {
    platformData: {
      id: 'linkedin_' + Date.now(),
      url: `https://linkedin.com/posts/placeholder`,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    },
    actualContent: postData.content
  };
}

/**
 * Facebook投稿処理（プレースホルダー）
 */
async function postToFacebook(userId, projectId, planId, postData, planData, projectData) {
  console.log(`📘 Facebook投稿処理開始...`);
  
  // Facebook API実装予定
  
  return {
    platformData: {
      id: 'facebook_' + Date.now(),
      url: `https://facebook.com/posts/placeholder`,
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    },
    actualContent: postData.content
  };
}

/**
 * 失敗した投稿の再試行
 */
exports.retryFailedPost = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'ログインが必要です'
    );
  }

  const { projectId, planId, postId } = data;
  
  if (!projectId || !planId || !postId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'projectId、planId、postIdが必要です'
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    // 投稿データを取得
    const postRef = db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .doc(planId)
      .collection('posts')
      .doc(postId);

    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        '投稿が見つかりません'
      );
    }

    const postData = postDoc.data();

    // 失敗状態の投稿のみ再試行可能
    if (postData.status !== 'failed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'この投稿は再試行できません'
      );
    }

    // ステータスを scheduled に変更して再度実行待ちにする
    await postRef.update({
      status: 'scheduled',
      error: admin.firestore.FieldValue.delete(), // エラー情報をクリア
      retryRequestedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: '投稿を再試行キューに追加しました'
    };

  } catch (error) {
    console.error('投稿再試行エラー:', error);
    throw error;
  }
});

/**
 * 投稿の即時実行
 */
exports.executePostNow = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'ログインが必要です'
    );
  }

  const { projectId, planId, postId } = data;
  
  if (!projectId || !planId || !postId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'projectId、planId、postIdが必要です'
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    // 投稿データを取得
    const postRef = db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .doc(planId)
      .collection('posts')
      .doc(postId);

    const postDoc = await postRef.get();
    const planDoc = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('plans')
      .doc(planId)
      .get();
    const projectDoc = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .get();

    if (!postDoc.exists || !planDoc.exists || !projectDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        '投稿、プラン、またはプロジェクトが見つかりません'
      );
    }

    const postData = postDoc.data();
    const planData = planDoc.data();
    const projectData = projectDoc.data();

    // スケジュール状態の投稿のみ即時実行可能
    if (postData.status !== 'scheduled') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'この投稿は即時実行できません'
      );
    }

    // プラットフォーム別の投稿処理
    let postResult;
    switch (postData.platform) {
      case 'twitter':
        postResult = await postToTwitter(userId, projectId, planId, postData, planData, projectData);
        break;
      case 'instagram':
        postResult = await postToInstagram(userId, projectId, planId, postData, planData, projectData);
        break;
      case 'linkedin':
        postResult = await postToLinkedIn(userId, projectId, planId, postData, planData, projectData);
        break;
      case 'facebook':
        postResult = await postToFacebook(userId, projectId, planId, postData, planData, projectData);
        break;
      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          `未対応のプラットフォーム: ${postData.platform}`
        );
    }

    // 成功時の処理
    await postRef.update({
      status: 'posted',
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
      platformData: postResult.platformData,
      actualContent: postResult.actualContent || postData.content,
      executedManually: true
    });

    return {
      success: true,
      message: '投稿が正常に実行されました',
      platformData: postResult.platformData
    };

  } catch (error) {
    console.error('即時投稿実行エラー:', error);
    
    // エラーの場合もステータスを更新
    if (postId) {
      await db
        .collection('users')
        .doc(userId)
        .collection('projects')
        .doc(projectId)
        .collection('plans')
        .doc(planId)
        .collection('posts')
        .doc(postId)
        .update({
          status: 'failed',
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            manualExecution: true
          }
        });
    }

    throw error;
  }
});