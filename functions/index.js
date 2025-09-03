const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Firebase Admin の初期化（すでに初期化済みの場合はスキップ）
if (!admin.apps.length) {
  admin.initializeApp();
}

// 各機能をインポート
const {preGenerateTweets} = require("./src/preGenerate");
const {postScheduledTweets} = require("./src/postTweets");
const {syncFromElectron, getUserProjects} = require("./src/sync");
const {updateProjectSchedule, getProjectHistory} = require("./src/schedule");
const {retryFailedTweets} = require("./src/retry");
const {getUserProjectsSimple} = require("./test-simple");
const {
  postTweetSimple,
  getUserTweetHistorySimple,
  testTwitterConnectionSimple,
} = require("./src/twitterSimple");
const {
  refreshGoogleAdsToken,
  createGoogleAdsCampaign,
  getGoogleAdsCampaigns,
  analyzeYouTubeChannel,
  testGoogleAdsConnection,
} = require("./src/googleAdsSimple");
const {
  processAutoPostsScheduled,
  processAutoPostsManual,
} = require("./src/autoPostProcessor");

// Existing Functions (preserve v2)
exports.preGenerateTweets = preGenerateTweets;
exports.postScheduledTweets = postScheduledTweets;
exports.syncFromElectron = syncFromElectron;
exports.getUserProjects = getUserProjects;
exports.updateProjectSchedule = updateProjectSchedule;
exports.getProjectHistory = getProjectHistory;
exports.retryFailedTweets = retryFailedTweets;

// v1 Functions
exports.getUserProjectsSimple = getUserProjectsSimple;

// New Twitter API Functions (v1)
exports.postTweetSimple = postTweetSimple;
exports.getUserTweetHistorySimple = getUserTweetHistorySimple;
exports.testTwitterConnectionSimple = testTwitterConnectionSimple;

// Google Ads API Functions (v1)
exports.refreshGoogleAdsToken = refreshGoogleAdsToken;
exports.createGoogleAdsCampaign = createGoogleAdsCampaign;
exports.getGoogleAdsCampaigns = getGoogleAdsCampaigns;
exports.analyzeYouTubeChannel = analyzeYouTubeChannel;
exports.testGoogleAdsConnection = testGoogleAdsConnection;

// 自動投稿処理 (v2)
exports.processAutoPostsScheduled = processAutoPostsScheduled;
exports.processAutoPostsManual = processAutoPostsManual;

// テスト用のヘルスチェック (preserve v2)
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    functions: [
      "preGenerateTweets",
      "postScheduledTweets",
      "syncFromElectron",
      "updateProjectSchedule",
      "retryFailedTweets",
      "getUserProjectsSimple",
      "postTweetSimple",
      "getUserTweetHistorySimple", 
      "testTwitterConnectionSimple",
      "refreshGoogleAdsToken",
      "createGoogleAdsCampaign",
      "getGoogleAdsCampaigns",
      "analyzeYouTubeChannel",
      "testGoogleAdsConnection",
      "processAutoPostsScheduled",
      "processAutoPostsManual",
    ],
  });
});
