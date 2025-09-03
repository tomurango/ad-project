const functions = require("firebase-functions");
const admin = require("firebase-admin");

// シンプルなテスト用Function
exports.getUserProjectsSimple = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated", 
        "ユーザー認証が必要です"
    );
  }

  console.log("ユーザープロジェクト取得:", context.auth.uid);

  // テスト用データを返す
  return {
    success: true,
    projects: [
      {
        id: "test-project-1",
        name: "テストプロジェクト1",
        description: "Firebase連携テスト用プロジェクト",
        status: "active",
        createdAt: new Date().toISOString()
      }
    ]
  };
});