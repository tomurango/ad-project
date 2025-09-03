# Firebase Functions 実装計画

## 必要な Functions

### 1. `preGenerateTweets` - 事前生成（毎晩23:00）
### 2. `postScheduledTweets` - 投稿実行（毎朝10:00）
### 3. `updateProjectSchedule` - スケジュール更新
### 4. `retryFailedTweets` - 失敗時リトライ
### 5. `syncFromElectron` - Electronアプリとの同期

## package.json 設定

```json
{
  "name": "functions",
  "description": "Cloud Functions for ad-project",
  "scripts": {
    "lint": "eslint .",
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1",
    "twitter-api-v2": "^1.15.1",
    "crypto": "^1.0.1",
    "node-fetch": "^3.3.1"
  },
  "devDependencies": {
    "eslint": "^8.15.0",
    "eslint-config-google": "^0.14.0",
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
```

## 主要な実装ファイル

### functions/index.js
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// 各機能をインポート
const { preGenerateTweets } = require('./src/preGenerate');
const { postScheduledTweets } = require('./src/postTweets');
const { syncFromElectron } = require('./src/sync');
const { updateProjectSchedule } = require('./src/schedule');

// エクスポート
exports.preGenerateTweets = preGenerateTweets;
exports.postScheduledTweets = postScheduledTweets;
exports.syncFromElectron = syncFromElectron;
exports.updateProjectSchedule = updateProjectSchedule;
```

### functions/src/preGenerate.js
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateTweetContent } = require('./aiGenerator');
const { getActiveProjects } = require('./utils/projects');

exports.preGenerateTweets = functions
  .runWith({
    timeoutSeconds: 540, // 9分
    memory: '1GB'
  })
  .pubsub.schedule('0 23 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const db = admin.firestore();
    const batch = db.batch();
    
    try {
      console.log('事前ツイート生成開始...');
      
      // 明日の日付
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      // アクティブなプロジェクトを取得
      const projects = await getActiveProjects(db);
      console.log(`${projects.length}個のプロジェクトを処理`);
      
      const results = [];
      
      for (const project of projects) {
        try {
          console.log(`プロジェクト ${project.name} の処理開始`);
          
          // 投稿が必要かチェック
          if (shouldGenerateTweet(project, tomorrow)) {
            
            // AIでツイート生成
            const tweetContent = await generateTweetContent(project);
            
            // scheduledTweets コレクションに保存
            const tweetRef = db.collection('scheduledTweets').doc();
            batch.set(tweetRef, {
              projectId: project.id,
              userId: project.userId,
              content: tweetContent,
              metadata: {
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                aiModel: 'qwen2.5:0.5b',
                projectSnapshot: {
                  name: project.name,
                  description: project.description,
                  tech: project.tech,
                  category: project.category
                }
              },
              scheduledFor: tomorrow,
              status: 'ready'
            });
            
            // プロジェクトの nextScheduledPost を更新
            const projectRef = db.collection('projects').doc(project.id);
            batch.update(projectRef, {
              nextScheduledPost: tomorrow
            });
            
            results.push({
              projectId: project.id,
              projectName: project.name,
              success: true,
              contentLength: tweetContent.length
            });
            
            console.log(`✅ ${project.name}: ツイート生成完了 (${tweetContent.length}文字)`);
            
          } else {
            console.log(`⏭️ ${project.name}: スキップ（投稿不要）`);
          }
          
        } catch (error) {
          console.error(`❌ ${project.name} でエラー:`, error);
          results.push({
            projectId: project.id,
            projectName: project.name,
            success: false,
            error: error.message
          });
        }
      }
      
      // バッチ実行
      await batch.commit();
      
      console.log('事前生成完了:', results);
      return { success: true, results };
      
    } catch (error) {
      console.error('事前生成でエラー:', error);
      throw error;
    }
  });

function shouldGenerateTweet(project, targetDate) {
  const lastPost = project.lastPost ? new Date(project.lastPost) : new Date(0);
  const now = targetDate;
  
  switch (project.frequency) {
    case 'daily':
      return now.getDate() !== lastPost.getDate() || 
             now.getMonth() !== lastPost.getMonth() ||
             now.getFullYear() !== lastPost.getFullYear();
    
    case 'weekly':
      const daysDiff = Math.floor((now - lastPost) / (1000 * 60 * 60 * 24));
      return daysDiff >= 7;
    
    case 'monthly':
      return now.getMonth() !== lastPost.getMonth() || 
             now.getFullYear() !== lastPost.getFullYear();
    
    default:
      return false;
  }
}
```

### functions/src/postTweets.js
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { TwitterApi } = require('twitter-api-v2');
const { decryptTwitterConfig } = require('./utils/encryption');

exports.postScheduledTweets = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .pubsub.schedule('0 10 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      console.log('スケジュール投稿開始...');
      
      const now = new Date();
      
      // 投稿対象のツイートを取得
      const tweetsSnapshot = await db.collection('scheduledTweets')
        .where('status', '==', 'ready')
        .where('scheduledFor', '<=', now)
        .get();
      
      console.log(`${tweetsSnapshot.docs.length}件のツイートを投稿予定`);
      
      const results = [];
      
      for (const doc of tweetsSnapshot.docs) {
        const tweet = doc.data();
        
        try {
          // プロジェクト情報を取得
          const projectDoc = await db.collection('projects').doc(tweet.projectId).get();
          const project = projectDoc.data();
          
          if (!project || !project.twitterConfig || !project.twitterConfig.enabled) {
            throw new Error('Twitter設定が無効');
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
          
          // ツイート投稿
          const response = await client.v2.tweet(tweet.content);
          
          // 投稿成功: データベース更新
          const batch = db.batch();
          
          // ツイートステータス更新
          batch.update(doc.ref, {
            status: 'posted',
            postedAt: admin.firestore.FieldValue.serverTimestamp(),
            twitterData: {
              tweetId: response.data.id,
              url: `https://twitter.com/user/status/${response.data.id}`
            }
          });
          
          // プロジェクト統計更新
          batch.update(projectDoc.ref, {
            lastPost: admin.firestore.FieldValue.serverTimestamp(),
            totalPosts: admin.firestore.FieldValue.increment(1)
          });
          
          await batch.commit();
          
          results.push({
            tweetId: doc.id,
            projectName: project.name,
            success: true,
            twitterId: response.data.id
          });
          
          console.log(`✅ 投稿成功: ${project.name} (ID: ${response.data.id})`);
          
        } catch (error) {
          console.error(`❌ 投稿失敗 (${doc.id}):`, error);
          
          // 失敗をデータベースに記録
          await doc.ref.update({
            status: 'failed',
            error: {
              message: error.message,
              code: error.code || 'UNKNOWN',
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            }
          });
          
          results.push({
            tweetId: doc.id,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log('投稿処理完了:', results);
      return { success: true, results };
      
    } catch (error) {
      console.error('スケジュール投稿でエラー:', error);
      throw error;
    }
  });
```