// Firebase Functions Twitter API統合モジュール
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

/**
 * Twitter API v2 クライアントクラス
 */
class TwitterAPIClient {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.accessToken = credentials.accessToken;
    this.accessTokenSecret = credentials.accessTokenSecret;
  }

  /**
   * OAuth 1.0a認証ヘッダーを生成
   */
  generateOAuthHeader(method, url, params = {}) {
    const oauth = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: "1.0",
    };

    // パラメータをマージ
    const allParams = {...params, ...oauth};

    // パラメータを辞書順にソート
    const sortedParams = Object.keys(allParams)
        .sort()
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join("&");

    // ベース文字列を作成
    const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // 署名キーを作成
    const signingKey = `${encodeURIComponent(this.apiSecret)}&${encodeURIComponent(this.accessTokenSecret)}`;

    // HMAC-SHA1署名を生成
    const signature = crypto
        .createHmac("sha1", signingKey)
        .update(baseString)
        .digest("base64");

    oauth.oauth_signature = signature;

    // Authorizationヘッダーを作成
    const authHeader = "OAuth " + Object.keys(oauth)
        .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key])}"`)
        .join(", ");

    return authHeader;
  }

  /**
   * ツイートを投稿
   */
  async postTweet(tweetText) {
    try {
      const url = "https://api.twitter.com/2/tweets";
      const authHeader = this.generateOAuthHeader("POST", url, {text: tweetText});

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: tweetText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter API エラー: ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        tweetId: data.data.id,
        tweetText: data.data.text,
      };
    } catch (error) {
      console.error("❌ Twitter投稿エラー:", error);
      return {success: false, error: error.message};
    }
  }

  /**
   * アカウント情報を取得
   */
  async getUserInfo() {
    try {
      const url = "https://api.twitter.com/2/users/me";
      const authHeader = this.generateOAuthHeader("GET", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": authHeader,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Twitter API エラー: ${errorData.detail || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        username: data.data.username,
        name: data.data.name,
        id: data.data.id,
      };
    } catch (error) {
      console.error("❌ Twitter ユーザー情報取得エラー:", error);
      return {success: false, error: error.message};
    }
  }
}

/**
 * プロジェクトのTwitter認証情報を取得
 */
async function getTwitterCredentials(userId, projectId) {
  try {
    const db = admin.firestore();
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      throw new Error("プロジェクトが見つかりません");
    }

    const project = projectDoc.data();
    if (project.userId !== userId) {
      throw new Error("アクセス権限がありません");
    }

    if (!project.twitterConfig || !project.twitterConfig.enabled) {
      throw new Error("Twitter API設定が無効です");
    }

    return project.twitterConfig.credentials;
  } catch (error) {
    console.error("❌ Twitter認証情報取得エラー:", error);
    throw error;
  }
}

/**
 * ツイートを投稿してFirestoreに記録
 */
async function postTweetToProject(userId, projectId, tweetText, generatedBy = "manual") {
  try {
    const credentials = await getTwitterCredentials(userId, projectId);
    const twitterClient = new TwitterAPIClient(credentials);

    // Twitter APIに投稿
    const tweetResult = await twitterClient.postTweet(tweetText);

    if (!tweetResult.success) {
      throw new Error(tweetResult.error);
    }

    // Firestoreに投稿記録を保存
    const db = admin.firestore();
    const postData = {
      projectId: projectId,
      userId: userId,
      tweetId: tweetResult.tweetId,
      tweetText: tweetResult.tweetText,
      platform: "twitter",
      status: "posted",
      generatedBy: generatedBy, // "manual", "ai", "scheduled"
      postedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const postRef = await db.collection("posts").add(postData);

    // プロジェクトの投稿カウントを更新
    await db.collection("projects").doc(projectId).update({
      totalPosts: admin.firestore.FieldValue.increment(1),
      lastPostedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ ツイート投稿・記録完了:", postRef.id);

    return {
      success: true,
      postId: postRef.id,
      tweetId: tweetResult.tweetId,
      tweetText: tweetResult.tweetText,
    };
  } catch (error) {
    console.error("❌ ツイート投稿・記録エラー:", error);

    // 失敗記録をFirestoreに保存
    try {
      const db = admin.firestore();
      await db.collection("posts").add({
        projectId: projectId,
        userId: userId,
        tweetText: tweetText,
        platform: "twitter",
        status: "failed",
        generatedBy: generatedBy,
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error("❌ 失敗ログ記録エラー:", logError);
    }

    throw error;
  }
}

/**
 * 指定されたプロジェクトの投稿履歴を取得
 */
async function getProjectPosts(userId, projectId, limit = 50) {
  try {
    const db = admin.firestore();

    // プロジェクト所有者確認
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists || projectDoc.data().userId !== userId) {
      throw new Error("アクセス権限がありません");
    }

    // 投稿履歴を取得
    const postsSnapshot = await db.collection("posts")
        .where("projectId", "==", projectId)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    const posts = [];
    postsSnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null,
        postedAt: data.postedAt && data.postedAt.toDate ? data.postedAt.toDate().toISOString() : null,
        failedAt: data.failedAt && data.failedAt.toDate ? data.failedAt.toDate().toISOString() : null,
      });
    });

    return {success: true, posts};
  } catch (error) {
    console.error("❌ 投稿履歴取得エラー:", error);
    throw error;
  }
}

/**
 * 失敗したツイートを再試行
 */
async function retryFailedTweet(userId, postId) {
  try {
    const db = admin.firestore();
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      throw new Error("投稿が見つかりません");
    }

    const post = postDoc.data();
    if (post.userId !== userId) {
      throw new Error("アクセス権限がありません");
    }

    if (post.status !== "failed") {
      throw new Error("失敗した投稿ではありません");
    }

    // 再投稿を実行
    const result = await postTweetToProject(
        userId,
        post.projectId,
        post.tweetText,
        post.generatedBy,
    );

    // 元の失敗記録を更新
    await db.collection("posts").doc(postId).update({
      status: "retried",
      retriedAt: admin.firestore.FieldValue.serverTimestamp(),
      retriedPostId: result.postId,
    });

    return result;
  } catch (error) {
    console.error("❌ ツイート再試行エラー:", error);
    throw error;
  }
}

module.exports = {
  TwitterAPIClient,
  getTwitterCredentials,
  postTweetToProject,
  getProjectPosts,
  retryFailedTweet,
};