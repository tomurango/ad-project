const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {calculateNextPostDate} = require("./utils/projects");

/**
 * プロジェクトのスケジュールを更新する Function
 */
exports.updateProjectSchedule = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }

  const {projectId, scheduleData} = data;

  if (!projectId || !scheduleData) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "projectIdとscheduleDataが必要です"
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    const projectRef = db.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "プロジェクトが見つかりません"
      );
    }

    // 権限チェック
    if (projectDoc.data().userId !== userId) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "このプロジェクトを編集する権限がありません"
      );
    }

    // スケジュール更新
    const updateData = {
      frequency: scheduleData.frequency,
      postTime: scheduleData.postTime,
      duration: scheduleData.duration,
      status: scheduleData.status || "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 次回投稿日時を再計算
    const projectData = projectDoc.data();
    const nextPostDate = calculateNextPostDate({
      ...projectData,
      ...scheduleData,
    });

    updateData.nextScheduledPost = admin.firestore.Timestamp.fromDate(nextPostDate);

    await projectRef.update(updateData);

    console.log(`✅ スケジュール更新: ${projectId}`);

    return {
      success: true,
      projectId,
      nextScheduledPost: nextPostDate.toISOString(),
      message: "スケジュールが更新されました",
    };

  } catch (error) {
    console.error("スケジュール更新エラー:", error);
    throw error;
  }
});

/**
 * プロジェクトの投稿履歴を取得
 */
exports.getProjectHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }

  const {projectId, limit = 50} = data;

  if (!projectId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "projectIdが必要です"
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    // プロジェクトの権限チェック
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists || projectDoc.data().userId !== userId) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "このプロジェクトにアクセスする権限がありません"
      );
    }

    // 投稿履歴を取得
    const historySnapshot = await db.collection("scheduledTweets")
        .where("projectId", "==", projectId)
        .orderBy("scheduledFor", "desc")
        .limit(limit)
        .get();

    const history = [];
    historySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        content: data.content,
        status: data.status,
        scheduledFor: data.scheduledFor && data.scheduledFor.toDate(),
        postedAt: data.postedAt && data.postedAt.toDate(),
        twitterData: data.twitterData,
        error: data.error,
        metadata: data.metadata,
      });
    });

    return {
      success: true,
      history,
      total: historySnapshot.size,
    };

  } catch (error) {
    console.error("投稿履歴取得エラー:", error);
    throw error;
  }
});