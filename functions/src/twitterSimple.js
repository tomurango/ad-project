// Simple Twitter API Functions for Firebase Functions v2
const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * 手動ツイート投稿（シンプル版）
 */
exports.postTweetSimple = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("ユーザー認証が必要です");
  }

  const {tweetText} = request.data;

  if (!tweetText) {
    throw new Error("ツイート内容が必要です");
  }

  try {
    // Firestoreに投稿記録を保存（Twitter API実装前のテスト版）
    const db = admin.firestore();
    const postData = {
      userId: request.auth.uid,
      tweetText: tweetText,
      platform: "twitter",
      status: "simulated", // 実際の投稿ではなくシミュレーション
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const postRef = await db.collection("posts").add(postData);

    console.log("✅ Twitter投稿シミュレーション成功:", postRef.id);

    return {
      success: true,
      postId: postRef.id,
      tweetId: "simulated_" + postRef.id, // シミュレーション用ID
      tweetText: tweetText,
      message: "投稿をシミュレートしました（テスト版）",
    };
  } catch (error) {
    console.error("❌ Twitter投稿シミュレーションエラー:", error);
    throw new Error(error.message);
  }
});

/**
 * ユーザーの投稿履歴を取得（シンプル版）
 */
exports.getUserTweetHistorySimple = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("ユーザー認証が必要です");
  }

  try {
    const db = admin.firestore();
    const limit = request.data.limit || 20;

    const postsSnapshot = await db.collection("posts")
        .where("userId", "==", request.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    const posts = [];
    postsSnapshot.forEach((doc) => {
      const postData = doc.data();
      posts.push({
        id: doc.id,
        tweetText: postData.tweetText,
        tweetId: postData.tweetId,
        platform: postData.platform,
        status: postData.status,
        createdAt: postData.createdAt && postData.createdAt.toDate ?
          postData.createdAt.toDate().toISOString() :
          null,
        postedAt: postData.postedAt && postData.postedAt.toDate ?
          postData.postedAt.toDate().toISOString() :
          null,
      });
    });

    console.log("✅ 投稿履歴取得成功:", posts.length + "件");

    return {
      success: true,
      posts: posts,
      count: posts.length,
    };
  } catch (error) {
    console.error("❌ 投稿履歴取得エラー:", error);
    throw new Error(error.message);
  }
});

/**
 * Twitter API接続テスト（シンプル版）
 */
exports.testTwitterConnectionSimple = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("ユーザー認証が必要です");
  }

  try {
    // 実際のTwitter API接続は後で実装
    // 今はシミュレーション
    console.log("✅ Twitter API接続テスト（シミュレーション）");

    return {
      success: true,
      username: "test_user",
      name: "テストユーザー",
      message: "Twitter API接続テスト成功（シミュレーション版）",
    };
  } catch (error) {
    console.error("❌ Twitter API接続テストエラー:", error);
    throw new Error(error.message);
  }
});