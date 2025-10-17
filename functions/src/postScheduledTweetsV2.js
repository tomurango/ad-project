/**
 * 予約投稿実行 Cloud Function v2
 *
 * 新しいデータ構造（users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}）に対応
 * 毎時0分に実行され、scheduledAt <= now の投稿をTwitterに投稿する
 */

const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {TwitterApi} = require('twitter-api-v2');

const db = admin.firestore();

/**
 * スケジュール実行（毎時0分）
 */
exports.postScheduledTweetsScheduled = onSchedule({
  schedule: '0 * * * *', // 毎時0分
  timeZone: 'Asia/Tokyo',
  memory: '512MiB',
  timeoutSeconds: 540,
  minInstances: 0
}, async (event) => {
  console.log('⏰ 予約投稿実行開始 - スケジュール実行');

  try {
    const result = await processScheduledPosts();

    console.log(`✅ 予約投稿実行完了 - 処理: ${result.processedCount}件, 成功: ${result.successCount}件, 失敗: ${result.failedCount}件`);

    return {
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 予約投稿実行エラー:', error);
    throw error;
  }
});

/**
 * 手動実行（HTTPリクエスト）
 */
exports.postScheduledTweetsManual = onRequest({
  memory: '512MiB',
  timeoutSeconds: 540,
  minInstances: 0,
  cors: true
}, async (req, res) => {
  console.log('🎯 予約投稿実行開始 - 手動実行');

  try {
    const result = await processScheduledPosts();

    console.log(`✅ 予約投稿実行完了 - 処理: ${result.processedCount}件, 成功: ${result.successCount}件, 失敗: ${result.failedCount}件`);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 予約投稿実行エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 予約投稿を処理するメイン関数
 */
async function processScheduledPosts() {
  const now = new Date();
  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  const results = [];

  try {
    console.log(`🔍 予約投稿を検索中... (${now.toISOString()})`);

    // collectionGroupで全ての投稿を横断検索
    const postsQuery = db.collectionGroup('posts')
      .where('status', '==', 'scheduled')
      .where('platform', '==', 'twitter')
      .where('scheduledAt', '<=', now.toISOString());

    const postsSnapshot = await postsQuery.get();

    console.log(`📋 対象投稿数: ${postsSnapshot.docs.length}件`);

    if (postsSnapshot.empty) {
      return {
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        results: []
      };
    }

    // 各投稿を処理
    for (const postDoc of postsSnapshot.docs) {
      processedCount++;
      const postData = postDoc.data();
      const postPath = postDoc.ref.path;

      // パスから各IDを抽出: users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}
      const pathParts = postPath.split('/');
      const userId = pathParts[1];
      const projectId = pathParts[3];
      const planId = pathParts[5];
      const postId = pathParts[7];

      console.log(`🔄 投稿処理開始: ${postId} (User: ${userId}, Project: ${projectId})`);

      try {
        // プロジェクトのTwitter認証情報を取得
        const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();

        if (!projectDoc.exists) {
          throw new Error('プロジェクトが見つかりません');
        }

        const projectData = projectDoc.data();
        const twitterAuth = projectData.twitterAuth;

        if (!twitterAuth || !twitterAuth.enabled) {
          throw new Error('Twitter連携が設定されていません');
        }

        // Twitter APIクライアント作成
        const client = new TwitterApi({
          appKey: twitterAuth.apiKey,
          appSecret: twitterAuth.apiSecret,
          accessToken: twitterAuth.accessToken,
          accessSecret: twitterAuth.accessTokenSecret
        });

        // ツイート投稿
        console.log(`📤 投稿中: "${postData.content.substring(0, 30)}..."`);
        const tweet = await client.v2.tweet(postData.content);

        // 投稿成功: ステータス更新
        await postDoc.ref.update({
          status: 'posted',
          postedAt: admin.firestore.FieldValue.serverTimestamp(),
          twitterData: {
            tweetId: tweet.data.id,
            url: `https://twitter.com/user/status/${tweet.data.id}`
          },
          lastModified: admin.firestore.FieldValue.serverTimestamp()
        });

        successCount++;
        console.log(`✅ 投稿成功: ${postId} (Tweet ID: ${tweet.data.id})`);

        results.push({
          postId,
          projectId,
          success: true,
          tweetId: tweet.data.id,
          url: `https://twitter.com/user/status/${tweet.data.id}`
        });

        // API制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ 投稿失敗 (${postId}):`, error);
        failedCount++;

        // 失敗をFirestoreに記録
        await postDoc.ref.update({
          status: 'failed',
          error: {
            message: error.message,
            code: error.code || 'UNKNOWN',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          },
          lastModified: admin.firestore.FieldValue.serverTimestamp()
        });

        results.push({
          postId,
          projectId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      processedCount,
      successCount,
      failedCount,
      results
    };

  } catch (error) {
    console.error('❌ 予約投稿処理エラー:', error);
    throw error;
  }
}
