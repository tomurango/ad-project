const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {TwitterApi} = require("twitter-api-v2");
const {decryptTwitterConfig} = require("./utils/encryption");

/**
 * スケジュールされたツイートを投稿する Function
 * 毎朝10:00に実行され、準備済みのツイートを投稿する
 */
exports.postScheduledTweets = functions.https.onCall(async (data, context) => {
  // 認証チェック（実際のスケジューリングでは不要だが、手動実行時のため）
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }
      const db = admin.firestore();

      try {
        console.log("📢 スケジュール投稿開始...");

        const now = new Date();

        // 投稿対象のツイートを取得
        const tweetsSnapshot = await db.collection("scheduledTweets")
            .where("status", "==", "ready")
            .where("scheduledFor", "<=", 
                admin.firestore.Timestamp.fromDate(now))
            .orderBy("scheduledFor", "asc")
            .limit(50) // 一度に最大50件まで処理
            .get();

        console.log(`📋 ${tweetsSnapshot.docs.length}件のツイートを投稿予定`);

        if (tweetsSnapshot.empty) {
          console.log("📭 投稿対象のツイートがありません");
          return {success: true, message: "投稿対象なし"};
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // 各ツイートを順次投稿
        for (const doc of tweetsSnapshot.docs) {
          const tweet = doc.data();

          try {
            console.log(`🔄 投稿処理開始: ${tweet.projectId}`);

            // プロジェクト情報を取得
            const projectDoc = await db.collection("projects").doc(tweet.projectId).get();

            if (!projectDoc.exists) {
              throw new Error("プロジェクトが存在しません");
            }

            const project = projectDoc.data();

            // Twitter設定をチェック
            if (!project.twitterConfig || !project.twitterConfig.enabled) {
              throw new Error("Twitter設定が無効です");
            }

            // Twitter API設定を復号化
            const twitterConfig = decryptTwitterConfig(project.twitterConfig);

            if (!twitterConfig.apiKey || !twitterConfig.apiSecret ||
                !twitterConfig.accessToken || !twitterConfig.accessTokenSecret) {
              throw new Error("Twitter認証情報が不完全です");
            }

            // Twitter APIクライアント作成
            const client = new TwitterApi({
              appKey: twitterConfig.apiKey,
              appSecret: twitterConfig.apiSecret,
              accessToken: twitterConfig.accessToken,
              accessSecret: twitterConfig.accessTokenSecret,
            });

            // ツイート投稿
            console.log(`📤 投稿中: "${tweet.content.substring(0, 30)}..."`);
            const response = await client.v2.tweet(tweet.content);

            // 投稿成功: データベース更新
            const batch = db.batch();

            // ツイートステータス更新
            batch.update(doc.ref, {
              status: "posted",
              postedAt: admin.firestore.FieldValue.serverTimestamp(),
              twitterData: {
                tweetId: response.data.id,
                url: `https://twitter.com/user/status/${response.data.id}`,
                engagement: {
                  likes: 0,
                  retweets: 0,
                  replies: 0,
                },
              },
            });

            // プロジェクト統計更新
            batch.update(projectDoc.ref, {
              lastPost: admin.firestore.FieldValue.serverTimestamp(),
              totalPosts: admin.firestore.FieldValue.increment(1),
            });

            await batch.commit();

            results.push({
              tweetId: doc.id,
              projectId: tweet.projectId,
              projectName: project.name,
              success: true,
              twitterId: response.data.id,
              url: `https://twitter.com/user/status/${response.data.id}`,
              content: tweet.content.substring(0, 50) + "...",
            });

            successCount++;
            console.log(`✅ 投稿成功: ${project.name} (ID: ${response.data.id})`);

            // API制限を考慮して少し待機
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`❌ 投稿失敗 (${doc.id}):`, error);
            errorCount++;

            // 失敗をデータベースに記録
            await doc.ref.update({
              status: "failed",
              error: {
                message: error.message,
                code: error.code || "UNKNOWN",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
              },
            });

            results.push({
              tweetId: doc.id,
              projectId: tweet.projectId,
              success: false,
              error: error.message,
            });
          }
        }

        // 結果サマリー
        const summary = {
          totalTweets: tweetsSnapshot.docs.length,
          successCount,
          errorCount,
          processingTime: new Date().toISOString(),
          results,
        };

        console.log("🎉 投稿処理完了:", summary);

        // 結果をFirestoreに保存
        await db.collection("functionLogs").add({
          functionName: "postScheduledTweets",
          executedAt: admin.firestore.FieldValue.serverTimestamp(),
          summary,
        });

        return {success: true, summary};
      } catch (error) {
        console.error("💥 スケジュール投稿で重大エラー:", error);

        // エラーログを保存
        await db.collection("functionLogs").add({
          functionName: "postScheduledTweets",
          executedAt: admin.firestore.FieldValue.serverTimestamp(),
          error: {
            message: error.message,
            stack: error.stack,
          },
          success: false,
        });

        throw error;
      }
    });

/**
 * 失敗したツイートを手動で再投稿するHTTPS Function
 */
exports.retryTweet = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です",
    );
  }

  const {tweetId} = data;
  if (!tweetId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "tweetIdが必要です",
    );
  }

  const db = admin.firestore();

  try {
    // ツイートを取得
    const tweetDoc = await db.collection("scheduledTweets").doc(tweetId).get();

    if (!tweetDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "ツイートが見つかりません",
      );
    }

    const tweet = tweetDoc.data();

    // 権限チェック
    if (tweet.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "このツイートを操作する権限がありません",
      );
    }

    // 失敗状態のツイートのみ再試行可能
    if (tweet.status !== "failed") {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "このツイートは再試行できません",
      );
    }

    // ステータスを pending に変更
    await tweetDoc.ref.update({
      status: "pending",
      retryCount: admin.firestore.FieldValue.increment(1),
    });

    return {success: true, message: "再試行キューに追加しました"};
  } catch (error) {
    console.error("ツイート再試行エラー:", error);
    throw error;
  }
});
