const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {TwitterApi} = require("twitter-api-v2");
const {decryptTwitterConfig} = require("./utils/encryption");

/**
 * 失敗したツイートを再試行する Function
 * 手動実行またはスケジュール実行
 */
exports.retryFailedTweets = functions.https.onCall(async (data, context) => {
  // 認証チェック（実際のスケジューリングでは不要だが、手動実行時のため）
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }
      const db = admin.firestore();

      try {
        console.log("🔄 失敗ツイート再試行開始...");

        // 失敗したツイートを取得（24時間以内のもの）
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const failedTweetsSnapshot = await db.collection("scheduledTweets")
            .where("status", "==", "failed")
            .where("scheduledFor", ">=", admin.firestore.Timestamp.fromDate(oneDayAgo))
            .where("retryCount", "<", 3) // 最大3回まで再試行
            .limit(10) // 一度に最大10件
            .get();

        console.log(`📋 ${failedTweetsSnapshot.docs.length}件の失敗ツイートを再試行`);

        if (failedTweetsSnapshot.empty) {
          console.log("📭 再試行対象のツイートがありません");
          return {success: true, message: "再試行対象なし"};
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const doc of failedTweetsSnapshot.docs) {
          const tweet = doc.data();

          try {
            console.log(`🔄 再試行処理: ${tweet.projectId}`);

            // プロジェクト情報を取得
            const projectDoc = await db.collection("projects").doc(tweet.projectId).get();

            if (!projectDoc.exists) {
              console.log(`⚠️ プロジェクトが存在しません: ${tweet.projectId}`);
              continue;
            }

            const project = projectDoc.data();

            // プロジェクトが非アクティブの場合はスキップ
            if (project.status !== "active") {
              console.log(`⏭️ 非アクティブプロジェクト: ${project.name}`);
              await doc.ref.update({
                status: "cancelled",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              continue;
            }

            // Twitter設定をチェック
            if (!project.twitterConfig || !project.twitterConfig.enabled) {
              console.log(`⚠️ Twitter設定が無効: ${project.name}`);
              continue;
            }

            // Twitter API設定を復号化
            const twitterConfig = decryptTwitterConfig(project.twitterConfig);

            // Twitter APIクライアント作成
            const client = new TwitterApi({
              appKey: twitterConfig.apiKey,
              appSecret: twitterConfig.apiSecret,
              accessToken: twitterConfig.accessToken,
              accessSecret: twitterConfig.accessTokenSecret,
            });

            // ツイート再投稿
            console.log(`📤 再投稿中: "${tweet.content.substring(0, 30)}..."`);
            const response = await client.v2.tweet(tweet.content);

            // 再投稿成功: データベース更新
            const batch = db.batch();

            // ツイートステータス更新
            batch.update(doc.ref, {
              status: "posted",
              postedAt: admin.firestore.FieldValue.serverTimestamp(),
              retryCount: admin.firestore.FieldValue.increment(1),
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
              projectName: project.name,
              success: true,
              twitterId: response.data.id,
              attempt: (tweet.retryCount || 0) + 1,
            });

            successCount++;
            console.log(`✅ 再投稿成功: ${project.name} (ID: ${response.data.id})`);

            // API制限を考慮して少し待機
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (error) {
            console.error(`❌ 再投稿失敗 (${doc.id}):`, error);
            errorCount++;

            // 再試行回数を増やして失敗を記録
            const retryCount = (tweet.retryCount || 0) + 1;
            const updateData = {
              retryCount: retryCount,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              error: {
                message: error.message,
                code: error.code || "UNKNOWN",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                attempt: retryCount,
              },
            };

            // 最大再試行回数に達した場合は諦める
            if (retryCount >= 3) {
              updateData.status = "abandoned";
              console.log(`💀 再試行諦め: ${doc.id} (${retryCount}回失敗)`);
            }

            await doc.ref.update(updateData);

            results.push({
              tweetId: doc.id,
              success: false,
              error: error.message,
              attempt: retryCount,
            });
          }
        }

        // 結果サマリー
        const summary = {
          totalTweets: failedTweetsSnapshot.docs.length,
          successCount,
          errorCount,
          processingTime: new Date().toISOString(),
          results,
        };

        console.log("🎉 再試行処理完了:", summary);

        // 結果をFirestoreに保存
        await db.collection("functionLogs").add({
          functionName: "retryFailedTweets",
          executedAt: admin.firestore.FieldValue.serverTimestamp(),
          summary,
        });

        return {success: true, summary};
      } catch (error) {
        console.error("💥 再試行処理で重大エラー:", error);

        // エラーログを保存
        await db.collection("functionLogs").add({
          functionName: "retryFailedTweets",
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
 * 特定のツイートを手動で再試行
 */
exports.retrySpecificTweet = functions.https.onCall(async (data, context) => {
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

    // 失敗または放棄状態のツイートのみ再試行可能
    if (!["failed", "abandoned"].includes(tweet.status)) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "このツイートは再試行できません",
      );
    }

    // ステータスを failed に変更（再試行キューに追加）
    await tweetDoc.ref.update({
      status: "failed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "再試行キューに追加しました",
      tweetId,
    };
  } catch (error) {
    console.error("手動再試行エラー:", error);
    throw error;
  }
});
