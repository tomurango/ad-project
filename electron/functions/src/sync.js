const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {encryptTwitterConfig} = require("./utils/encryption");

/**
 * Electronアプリからのプロジェクトデータ同期 Function
 */
exports.syncFromElectron = functions.https.onCall(async (data, context) => {
  // 認証チェック
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }

  const {action, projectData} = data;

  if (!action || !projectData) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "actionとprojectDataが必要です"
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    console.log(`📡 Electron同期処理: ${action} - ${projectData.name}`);

    switch (action) {
      case "create":
        return await createProject(db, userId, projectData);

      case "update":
        return await updateProject(db, userId, projectData);

      case "delete":
        return await deleteProject(db, userId, projectData.id);

      case "sync":
        return await syncProject(db, userId, projectData);

      default:
        throw new functions.https.HttpsError(
            "invalid-argument",
            "無効なアクションです"
        );
    }

  } catch (error) {
    console.error("Electron同期エラー:", error);
    throw error;
  }
});

/**
 * プロジェクトを作成
 */
async function createProject(db, userId, projectData) {
  // Twitter設定を暗号化
  const encryptedTwitterConfig = projectData.twitterConfig ?
    encryptTwitterConfig(projectData.twitterConfig) : null;

  const projectDoc = {
    userId: userId,
    name: projectData.name,
    displayName: projectData.displayName || projectData.name,
    description: projectData.description,
    path: projectData.path,
    category: projectData.category || "other",
    tech: projectData.tech || "",
    
    // 自動投稿設定
    platform: projectData.platform || "",
    frequency: projectData.frequency || "daily",
    postTime: projectData.postTime || "10:00",
    duration: projectData.duration || "1month",
    
    // Twitter設定（暗号化済み）
    twitterConfig: encryptedTwitterConfig,
    
    // 統計情報
    status: projectData.status || "active",
    totalPosts: projectData.totalPosts || 0,
    lastPost: projectData.lastPost ? 
      admin.firestore.Timestamp.fromDate(new Date(projectData.lastPost)) : null,
    nextScheduledPost: calculateNextScheduledPost(projectData),
    
    // メタデータ
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("projects").add(projectDoc);

  console.log(`✅ プロジェクト作成: ${projectData.name} (ID: ${docRef.id})`);

  return {
    success: true,
    projectId: docRef.id,
    message: "プロジェクトが作成されました",
  };
}

/**
 * プロジェクトを更新
 */
async function updateProject(db, userId, projectData) {
  if (!projectData.id) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "プロジェクトIDが必要です"
    );
  }

  const projectRef = db.collection("projects").doc(projectData.id);
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

  // Twitter設定を暗号化
  const encryptedTwitterConfig = projectData.twitterConfig ?
    encryptTwitterConfig(projectData.twitterConfig) : null;

  const updateData = {
    name: projectData.name,
    displayName: projectData.displayName || projectData.name,
    description: projectData.description,
    path: projectData.path,
    category: projectData.category || "other",
    tech: projectData.tech || "",
    
    // 自動投稿設定
    platform: projectData.platform || "",
    frequency: projectData.frequency || "daily",
    postTime: projectData.postTime || "10:00",
    duration: projectData.duration || "1month",
    
    // Twitter設定（暗号化済み）
    twitterConfig: encryptedTwitterConfig,
    
    // ステータス
    status: projectData.status,
    
    // メタデータ
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // スケジュールが変更された場合は次回投稿日を再計算
  if (projectData.frequency || projectData.postTime) {
    updateData.nextScheduledPost = calculateNextScheduledPost(projectData);
  }

  await projectRef.update(updateData);

  console.log(`✅ プロジェクト更新: ${projectData.name} (ID: ${projectData.id})`);

  return {
    success: true,
    projectId: projectData.id,
    message: "プロジェクトが更新されました",
  };
}

/**
 * プロジェクトを削除
 */
async function deleteProject(db, userId, projectId) {
  if (!projectId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "プロジェクトIDが必要です"
    );
  }

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
        "このプロジェクトを削除する権限がありません"
    );
  }

  const batch = db.batch();

  // プロジェクトを削除
  batch.delete(projectRef);

  // 関連するスケジュールされたツイートも削除
  const scheduledTweetsSnapshot = await db.collection("scheduledTweets")
      .where("projectId", "==", projectId)
      .get();

  scheduledTweetsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`✅ プロジェクト削除: ${projectId}`);

  return {
    success: true,
    projectId: projectId,
    message: "プロジェクトが削除されました",
  };
}

/**
 * プロジェクトデータを同期（双方向）
 */
async function syncProject(db, userId, projectData) {
  // まずFirestoreから最新データを取得
  const projectsSnapshot = await db.collection("projects")
      .where("userId", "==", userId)
      .get();

  const firestoreProjects = [];
  projectsSnapshot.forEach((doc) => {
    firestoreProjects.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(`📡 同期処理: Firestore ${firestoreProjects.length}件, Electron ${projectData.length}件`);

  return {
    success: true,
    firestoreProjects: firestoreProjects,
    syncedAt: new Date().toISOString(),
    message: "同期が完了しました",
  };
}

/**
 * 次回投稿予定日時を計算
 */
function calculateNextScheduledPost(projectData) {
  const now = new Date();
  const [hours, minutes] = (projectData.postTime || "10:00").split(":");
  
  const nextPost = new Date();
  nextPost.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // 今日の投稿時刻を過ぎている場合は明日に設定
  if (nextPost <= now) {
    nextPost.setDate(nextPost.getDate() + 1);
  }
  
  return admin.firestore.Timestamp.fromDate(nextPost);
}

/**
 * ユーザーのプロジェクト一覧を取得
 */
exports.getUserProjects = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "ユーザー認証が必要です"
    );
  }

  const db = admin.firestore();
  const userId = context.auth.uid;

  try {
    const snapshot = await db.collection("projects")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

    const projects = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Twitter設定は復号化せずに enabled 状態のみ返す
      const twitterConfig = data.twitterConfig ? {
        enabled: data.twitterConfig.enabled || false,
      } : null;

      projects.push({
        id: doc.id,
        ...data,
        twitterConfig,
        createdAt: data.createdAt && data.createdAt.toDate(),
        updatedAt: data.updatedAt && data.updatedAt.toDate(),
        lastPost: data.lastPost && data.lastPost.toDate(),
        nextScheduledPost: data.nextScheduledPost && data.nextScheduledPost.toDate(),
      });
    });

    return {
      success: true,
      projects,
    };

  } catch (error) {
    console.error("プロジェクト一覧取得エラー:", error);
    throw error;
  }
});