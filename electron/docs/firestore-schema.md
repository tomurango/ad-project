# Firestore データベース設計

## コレクション構造

### 1. `users` コレクション
```javascript
users/{userId} {
  email: string,
  displayName: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  settings: {
    timezone: string, // "Asia/Tokyo"
    defaultPostTime: string, // "10:00"
    notifications: boolean
  }
}
```

### 2. `projects` コレクション
```javascript
projects/{projectId} {
  // 基本情報
  userId: string, // オーナーのユーザーID
  name: string,
  displayName: string,
  description: string,
  path: string, // ローカルパス（参考用）
  
  // プロジェクト詳細
  category: string, // "web", "mobile", "desktop", "tool"
  tech: string,
  
  // 自動投稿設定
  platform: string, // "twitter"
  frequency: string, // "daily", "weekly", "monthly"
  postTime: string, // "10:00"
  duration: string, // "1month", "3months", "6months", "continuous"
  
  // Twitter設定（暗号化）
  twitterConfig: {
    apiKey: string, // 暗号化済み
    apiSecret: string, // 暗号化済み
    accessToken: string, // 暗号化済み
    accessTokenSecret: string, // 暗号化済み
    enabled: boolean
  },
  
  // 統計情報
  status: string, // "active", "paused", "completed"
  totalPosts: number,
  lastPost: timestamp,
  nextScheduledPost: timestamp,
  
  // メタデータ
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. `scheduledTweets` コレクション
```javascript
scheduledTweets/{tweetId} {
  projectId: string,
  userId: string,
  
  // ツイート内容
  content: string, // 生成されたツイート本文
  metadata: {
    generatedAt: timestamp,
    aiModel: string, // "qwen2.5:0.5b"
    projectSnapshot: object // 生成時のプロジェクト情報
  },
  
  // スケジュール
  scheduledFor: timestamp, // 投稿予定日時
  status: string, // "pending", "ready", "posted", "failed", "cancelled"
  
  // 投稿結果
  postedAt: timestamp,
  twitterData: {
    tweetId: string,
    url: string,
    engagement: {
      likes: number,
      retweets: number,
      replies: number
    }
  },
  
  // エラー情報
  error: {
    message: string,
    code: string,
    timestamp: timestamp
  }
}
```

### 4. `tweetTemplates` コレクション（キャッシュ用）
```javascript
tweetTemplates/{templateId} {
  projectId: string,
  cacheKey: string, // project.id + date のハッシュ
  
  content: string,
  generatedAt: timestamp,
  expiresAt: timestamp, // 24時間後
  
  projectData: object // 生成時のプロジェクトデータ
}
```

### 5. `analytics` コレクション
```javascript
analytics/{analyticsId} {
  projectId: string,
  userId: string,
  date: string, // "2024-01-15"
  
  metrics: {
    tweetsPosted: number,
    totalEngagement: number,
    averageLikes: number,
    averageRetweets: number
  },
  
  generatedAt: timestamp
}
```

## セキュリティルール

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // プロジェクトは所有者のみアクセス可能
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // スケジュールされたツイートも所有者のみ
    match /scheduledTweets/{tweetId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Functions からのアクセスは許可
    match /{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

## インデックス設定

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "nextScheduledPost", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "scheduledTweets",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "scheduledFor", "order": "ASCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
```