const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// シンプルなテスト用Function (v2)
exports.getUserProjectsSimple = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("ユーザー認証が必要です");
  }

  console.log("ユーザープロジェクト取得:", request.auth.uid);

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