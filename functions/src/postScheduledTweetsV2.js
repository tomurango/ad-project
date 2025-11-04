/**
 * 予約投稿実行 Cloud Function v2
 *
 * 新しいデータ構造（users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}）に対応
 * 毎時0分に実行され、scheduledAt <= now の投稿を各プラットフォームに投稿する
 * 対応プラットフォーム: Twitter, Bluesky
 */

const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {TwitterApi} = require('twitter-api-v2');
const axios = require('axios');

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

    // collectionGroupで全ての投稿を横断検索（全プラットフォーム対応）
    const postsQuery = db.collectionGroup('posts')
      .where('status', '==', 'scheduled')
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

      console.log(`🔄 投稿処理開始: ${postId} (Platform: ${postData.platform}, Project: ${projectId})`);

      try {
        // プロジェクト情報を取得
        const projectDoc = await db.doc(`users/${userId}/projects/${projectId}`).get();

        if (!projectDoc.exists) {
          throw new Error('プロジェクトが見つかりません');
        }

        const projectData = projectDoc.data();

        // プラットフォーム別投稿処理
        const postResult = await postToPlatform(postData.platform, projectData, postData);

        // 投稿成功: ステータス更新（プラットフォーム別のデータを保存）
        const updateData = {
          status: 'posted',
          postedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastModified: admin.firestore.FieldValue.serverTimestamp()
        };

        // プラットフォーム別のレスポンスデータを追加
        if (postData.platform === 'twitter') {
          updateData.twitterData = {
            tweetId: postResult.tweetId,
            url: postResult.url
          };
        } else if (postData.platform === 'bluesky') {
          updateData.blueskyData = {
            uri: postResult.uri,
            cid: postResult.cid
          };
        }

        await postDoc.ref.update(updateData);

        successCount++;
        console.log(`✅ 投稿成功: ${postId} (Platform: ${postData.platform})`);

        results.push({
          postId,
          projectId,
          platform: postData.platform,
          success: true,
          ...postResult
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

// ========================================
// プラットフォーム別投稿処理関数
// ========================================

/**
 * Twitter投稿処理
 * @param {Object} projectData - プロジェクトデータ
 * @param {Object} postData - 投稿データ
 * @returns {Promise<Object>} 投稿結果 {success, tweetId, url, error}
 */
async function postToTwitter(projectData, postData) {
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
  console.log(`📤 Twitter投稿中: "${postData.content.substring(0, 30)}..."`);
  const tweet = await client.v2.tweet(postData.content);

  return {
    success: true,
    tweetId: tweet.data.id,
    url: `https://twitter.com/user/status/${tweet.data.id}`
  };
}

/**
 * Bluesky投稿処理
 * @param {Object} projectData - プロジェクトデータ
 * @param {Object} postData - 投稿データ
 * @returns {Promise<Object>} 投稿結果 {success, uri, cid, error}
 */
async function postToBluesky(projectData, postData) {
  const blueskyAuth = projectData.blueskyAuth;

  if (!blueskyAuth || !blueskyAuth.enabled) {
    throw new Error('Bluesky連携が設定されていません');
  }

  // Blueskyセッション作成
  console.log(`🔐 Blueskyセッション作成: ${blueskyAuth.identifier}`);
  const sessionResponse = await axios.post(
    'https://bsky.social/xrpc/com.atproto.server.createSession',
    {
      identifier: blueskyAuth.identifier,
      password: blueskyAuth.password
    }
  );

  const session = sessionResponse.data;

  // 投稿レコード構築
  const record = {
    $type: 'app.bsky.feed.post',
    text: postData.content,
    createdAt: new Date().toISOString()
  };

  // Bluesky投稿
  console.log(`📤 Bluesky投稿中: "${postData.content.substring(0, 30)}..."`);
  const postResponse = await axios.post(
    'https://bsky.social/xrpc/com.atproto.repo.createRecord',
    {
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: record
    },
    {
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    success: true,
    uri: postResponse.data.uri,
    cid: postResponse.data.cid
  };
}

/**
 * プラットフォーム別投稿処理のディスパッチャー
 * @param {string} platform - プラットフォーム名 (twitter, bluesky, instagram等)
 * @param {Object} projectData - プロジェクトデータ
 * @param {Object} postData - 投稿データ
 * @returns {Promise<Object>} 投稿結果
 */
async function postToPlatform(platform, projectData, postData) {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return await postToTwitter(projectData, postData);

    case 'bluesky':
      return await postToBluesky(projectData, postData);

    // 将来の拡張用
    // case 'instagram':
    //   return await postToInstagram(projectData, postData);
    // case 'facebook':
    //   return await postToFacebook(projectData, postData);

    default:
      throw new Error(`未対応のプラットフォーム: ${platform}`);
  }
}
