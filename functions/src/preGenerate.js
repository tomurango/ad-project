const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {generateTweetContent} = require("./aiGenerator");
const {getActiveProjects, shouldGenerateTweet, calculateNextPostDate} = require("./utils/projects");

/**
 * 事前ツイート生成 Function
 * 毎晩23:00に実行され、翌日投稿予定のツイートを生成
 */
exports.preGenerateTweets = functions.https.onCall(async (data, context) => {
  // 認証チェック（実際のスケジューリングでは不要だが、手動実行時のため）
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }
      const db = admin.firestore();
      const batch = db.batch();

      try {
        console.log("🚀 事前ツイート生成開始...");

        // 明日の日付を設定
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0); // デフォルト投稿時刻

        // アクティブなプロジェクトを取得
        const projects = await getActiveProjects(db);
        console.log(`📋 ${projects.length}個のプロジェクトを処理`);

        const results = [];
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // 各プロジェクトを順次処理
        for (const project of projects) {
          try {
            console.log(`🔄 プロジェクト処理開始: ${project.name}`);

            // プロジェクト固有の投稿時刻を設定
            const projectPostTime = new Date(tomorrow);
            if (project.postTime) {
              const [hours, minutes] = project.postTime.split(":");
              projectPostTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }

            // 投稿が必要かチェック
            if (shouldGenerateTweet(project, projectPostTime)) {
              console.log(`✅ ${project.name}: 投稿が必要`);

              // 既存の未投稿ツイートをチェック
              const existingTweets = await db.collection("scheduledTweets")
                  .where("projectId", "==", project.id)
                  .where("status", "in", ["pending", "ready"])
                  .where("scheduledFor", ">=", tomorrow)
                  .where("scheduledFor", "<", new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000))
                  .get();

              if (existingTweets.size > 0) {
                console.log(`⏭️ ${project.name}: 既に生成済み - スキップ`);
                skipCount++;
                continue;
              }

              // AIでツイート生成
              console.time(`AI生成-${project.name}`);
              const tweetContent = await generateTweetContent(project);
              console.timeEnd(`AI生成-${project.name}`);

              // scheduledTweets コレクションに保存
              const tweetRef = db.collection("scheduledTweets").doc();
              batch.set(tweetRef, {
                projectId: project.id,
                userId: project.userId,
                content: tweetContent,
                metadata: {
                  generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  aiModel: "qwen2.5:0.5b",
                  projectSnapshot: {
                    name: project.name,
                    description: project.description,
                    tech: project.tech,
                    category: project.category,
                  },
                },
                scheduledFor: admin.firestore.Timestamp.fromDate(projectPostTime),
                status: "ready",
              });

              // プロジェクトの nextScheduledPost を更新
              const nextPostDate = calculateNextPostDate(project, projectPostTime);
              const projectRef = db.collection("projects").doc(project.id);
              batch.update(projectRef, {
                nextScheduledPost: admin.firestore.Timestamp.fromDate(nextPostDate),
              });

              results.push({
                projectId: project.id,
                projectName: project.name,
                success: true,
                contentLength: tweetContent.length,
                scheduledFor: projectPostTime.toISOString(),
                content: tweetContent.substring(0, 50) + "...",
              });

              successCount++;
              console.log(`✅ ${project.name}: ツイート生成完了 (${tweetContent.length}文字)`);

              // プロジェクト間で少し待機（API負荷軽減）
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              console.log(`⏭️ ${project.name}: 投稿不要 - スキップ`);
              skipCount++;
            }
          } catch (error) {
            console.error(`❌ ${project.name} でエラー:`, error);
            errorCount++;

            results.push({
              projectId: project.id,
              projectName: project.name,
              success: false,
              error: error.message,
            });

            // エラーが発生してもバッチ処理は継続
          }
        }

        // バッチコミット（まとめて実行）
        if (batch._writes && batch._writes.length > 0) {
          await batch.commit();
          console.log(`💾 バッチコミット完了: ${batch._writes.length}件の操作`);
        }

        // 結果をログ出力
        const summary = {
          totalProjects: projects.length,
          successCount,
          skipCount,
          errorCount,
          processingTime: context.timestamp,
          results,
        };

        console.log("🎉 事前生成完了:", summary);

        // 結果をFirestoreに保存（オプション）
        await db.collection("functionLogs").add({
          functionName: "preGenerateTweets",
          executedAt: admin.firestore.FieldValue.serverTimestamp(),
          summary,
        });

        return {success: true, summary};
      } catch (error) {
        console.error("💥 事前生成で重大エラー:", error);

        // エラーログを保存
        await db.collection("functionLogs").add({
          functionName: "preGenerateTweets",
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
