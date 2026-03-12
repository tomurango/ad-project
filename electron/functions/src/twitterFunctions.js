// Twitter API統合Firebase Functions
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  postTweetToProject,
  getProjectPosts,
  retryFailedTweet,
} = require("./twitterAPI");

/**
 * 手動ツイートを投稿
 */
exports.postManualTweet = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ユーザー認証が必要です");
  }

  const {projectId, tweetText} = data;

  if (!projectId || !tweetText) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "プロジェクトIDとツイート内容が必要です",
    );
  }

  if (tweetText.length > 280) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "ツイートは280文字以内で入力してください",
    );
  }

  try {
    const result = await postTweetToProject(
        context.auth.uid,
        projectId,
        tweetText,
        "manual",
    );

    console.log("✅ 手動ツイート投稿成功:", result.postId);

    return {
      success: true,
      postId: result.postId,
      tweetId: result.tweetId,
      tweetText: result.tweetText,
      message: "ツイートを投稿しました",
    };
  } catch (error) {
    console.error("❌ 手動ツイート投稿エラー:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * AI生成ツイートを投稿
 */
exports.postAITweet = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ユーザー認証が必要です");
  }

  const {projectId, tweetText} = data;

  if (!projectId || !tweetText) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "プロジェクトIDとツイート内容が必要です",
    );
  }

  try {
    const result = await postTweetToProject(
        context.auth.uid,
        projectId,
        tweetText,
        "ai",
    );

    console.log("✅ AI生成ツイート投稿成功:", result.postId);

    return {
      success: true,
      postId: result.postId,
      tweetId: result.tweetId,
      tweetText: result.tweetText,
      message: "AI生成ツイートを投稿しました",
    };
  } catch (error) {
    console.error("❌ AI生成ツイート投稿エラー:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * プロジェクトの投稿履歴を取得
 */
exports.getProjectTweetHistory = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ユーザー認証が必要です");
  }

  const {projectId, limit = 50} = data;

  if (!projectId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "プロジェクトIDが必要です",
    );
  }

  try {
    const result = await getProjectPosts(context.auth.uid, projectId, limit);

    console.log("✅ 投稿履歴取得成功:", result.posts.length + "件");

    return {
      success: true,
      posts: result.posts,
      count: result.posts.length,
    };
  } catch (error) {
    console.error("❌ 投稿履歴取得エラー:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 失敗したツイートを再試行
 */
exports.retryTweet = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "ユーザー認証が必要です");
  }

  const {postId} = data;

  if (!postId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "投稿IDが必要です",
    );
  }

  try {
    const result = await retryFailedTweet(context.auth.uid, postId);

    console.log("✅ ツイート再試行成功:", result.postId);

    return {
      success: true,
      postId: result.postId,
      tweetId: result.tweetId,
      tweetText: result.tweetText,
      message: "ツイート再試行が成功しました",
    };
  } catch (error) {
    console.error("❌ ツイート再試行エラー:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 定期投稿生成（毎晩23時に実行）
 */
exports.generateScheduledTweets = functions.pubsub
    .schedule("0 23 * * *")
    .timeZone("Asia/Tokyo")
    .onRun(async (context) => {
      console.log("🕚 定期投稿生成開始（23:00）");

      try {
        const db = admin.firestore();

        // アクティブなプロジェクトを取得
        const projectsSnapshot = await db.collection("projects")
            .where("status", "==", "active")
            .where("autoPost", "==", true)
            .get();

        if (projectsSnapshot.empty) {
          console.log("ℹ️ 自動投稿対象のプロジェクトがありません");
          return;
        }

        const projects = [];
        projectsSnapshot.forEach((doc) => {
          projects.push({id: doc.id, ...doc.data()});
        });

        console.log(`📋 自動投稿対象プロジェクト: ${projects.length}件`);

        // 各プロジェクトでツイート生成
        const results = [];
        for (const project of projects) {
          try {
            // AI生成ロジック（Ollama連携など）をここに実装
            // 現在はダミーテキスト
            const generatedTweet = `${project.displayName}の進捗報告 📈\n\n開発継続中です！詳細は後日お知らせします。 #${project.name}`;

            // 生成したツイートをFirestoreに一時保存
            const draftRef = await db.collection("tweet_drafts").add({
              projectId: project.id,
              userId: project.userId,
              tweetText: generatedTweet,
              generatedBy: "scheduled",
              scheduledFor: "next_morning",
              generatedAt: admin.firestore.FieldValue.serverTimestamp(),
              status: "draft",
            });

            results.push({
              projectId: project.id,
              draftId: draftRef.id,
              success: true,
            });

            console.log(`✅ ${project.displayName}: ツイート生成完了`);
          } catch (error) {
            console.error(`❌ ${project.displayName}: ツイート生成エラー:`, error);
            results.push({
              projectId: project.id,
              success: false,
              error: error.message,
            });
          }
        }

        console.log("🎉 定期投稿生成完了:", results);
        return results;
      } catch (error) {
        console.error("❌ 定期投稿生成エラー:", error);
        throw error;
      }
    });

/**
 * 定期投稿実行（毎朝10時に実行）
 */
exports.executeScheduledTweets = functions.pubsub
    .schedule("0 10 * * *")
    .timeZone("Asia/Tokyo")
    .onRun(async (context) => {
      console.log("🕙 定期投稿実行開始（10:00）");

      try {
        const db = admin.firestore();

        // 前夜生成されたドラフトツイートを取得
        const draftsSnapshot = await db.collection("tweet_drafts")
            .where("status", "==", "draft")
            .where("scheduledFor", "==", "next_morning")
            .get();

        if (draftsSnapshot.empty) {
          console.log("ℹ️ 投稿対象のドラフトツイートがありません");
          return;
        }

        const drafts = [];
        draftsSnapshot.forEach((doc) => {
          drafts.push({id: doc.id, ...doc.data()});
        });

        console.log(`📋 投稿対象ドラフト: ${drafts.length}件`);

        // 各ドラフトを投稿
        const results = [];
        for (const draft of drafts) {
          try {
            // ツイートを投稿
            const result = await postTweetToProject(
                draft.userId,
                draft.projectId,
                draft.tweetText,
                "scheduled",
            );

            // ドラフトのステータスを更新
            await db.collection("tweet_drafts").doc(draft.id).update({
              status: "posted",
              postId: result.postId,
              tweetId: result.tweetId,
              postedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            results.push({
              draftId: draft.id,
              postId: result.postId,
              tweetId: result.tweetId,
              success: true,
            });

            console.log(`✅ ドラフト投稿成功: ${draft.id} → ${result.tweetId}`);
          } catch (error) {
            console.error(`❌ ドラフト投稿エラー (${draft.id}):`, error);

            // エラー情報をドラフトに記録
            await db.collection("tweet_drafts").doc(draft.id).update({
              status: "failed",
              error: error.message,
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            results.push({
              draftId: draft.id,
              success: false,
              error: error.message,
            });
          }
        }

        console.log("🎉 定期投稿実行完了:", results);
        return results;
      } catch (error) {
        console.error("❌ 定期投稿実行エラー:", error);
        throw error;
      }
    });