const admin = require("firebase-admin");

/**
 * アクティブなプロジェクトを取得
 * @param {FirebaseFirestore.Firestore} db
 * @return {Promise<Array>}
 */
async function getActiveProjects(db) {
  try {
    const snapshot = await db.collection("projects")
        .where("status", "==", "active")
        .get();

    const projects = [];
    snapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return projects;
  } catch (error) {
    console.error("プロジェクト取得エラー:", error);
    throw error;
  }
}

/**
 * 投稿が必要かどうかを判定
 * @param {Object} project
 * @param {Date} targetDate
 * @return {boolean}
 */
function shouldGenerateTweet(project, targetDate) {
  const lastPost = project.lastPost ?
    new Date(project.lastPost.toDate()) : new Date(0);
  const now = targetDate;

  switch (project.frequency) {
    case "daily":
      return now.getDate() !== lastPost.getDate() ||
             now.getMonth() !== lastPost.getMonth() ||
             now.getFullYear() !== lastPost.getFullYear();

    case "weekly":
      const daysDiff = Math.floor((now - lastPost) / (1000 * 60 * 60 * 24));
      return daysDiff >= 7;

    case "monthly":
      return now.getMonth() !== lastPost.getMonth() ||
             now.getFullYear() !== lastPost.getFullYear();

    case "continuous":
      return true; // 常に投稿

    default:
      return false;
  }
}

/**
 * 次回投稿日時を計算
 * @param {Object} project
 * @param {Date} baseDate
 * @return {Date}
 */
function calculateNextPostDate(project, baseDate = new Date()) {
  const next = new Date(baseDate);

  switch (project.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly":
      next.setDate(next.getDate() + 7);
      break;

    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;

    case "continuous":
      next.setDate(next.getDate() + 1);
      break;

    default:
      next.setDate(next.getDate() + 1);
  }

  // 時刻を設定（デフォルト10:00、プロジェクト設定があればそれを使用）
  const [hours, minutes] = (project.postTime || "10:00").split(":");
  next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return next;
}

module.exports = {
  getActiveProjects,
  shouldGenerateTweet,
  calculateNextPostDate,
};
