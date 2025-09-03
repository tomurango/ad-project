# Firestore 階層構造設計

## 📊 新しい階層構造

```
users/{userId}                          // ユーザー基本情報
├── projects/{projectId}                // プロジェクト
│   ├── plans/{planId}                  // プラン（サブコレクション）
│   │   └── posts/{postId}              // 投稿（サブコレクション）
│   └── settings/{settingId}            // プロジェクト設定（サブコレクション）
└── credentials/{platformId}            // 認証情報（暗号化）
```

## 🔄 データ構造定義

### 1. **ユーザー基本情報**
```javascript
users/{userId} {
  email: "user@example.com",
  displayName: "ユーザー名",
  photoURL: "https://...",
  createdAt: timestamp,
  lastLogin: timestamp,
  preferences: {
    timezone: "Asia/Tokyo",
    language: "ja",
    theme: "light"
  },
  stats: {
    totalProjects: 0,
    totalPlans: 0,
    totalPosts: 0
  }
}
```

### 2. **プロジェクト**
```javascript
users/{userId}/projects/{projectId} {
  name: "shuumy",
  displayName: "Shuumy - AI投稿アプリ", 
  description: "AI generated description...",
  localPath: "/Users/tomuraeishi/develop/shuumy_data/shuumy/",
  category: "web", // web, mobile, desktop, tool
  tech: "JavaScript, Node.js, React",
  
  settings: {
    aiModel: "qwen2.5:0.5b",
    defaultTimezone: "Asia/Tokyo",
    autoSync: true
  },
  
  stats: {
    totalPlans: 0,
    totalPosts: 0,
    lastActivity: timestamp
  },
  
  createdAt: timestamp,
  lastModified: timestamp
}
```

### 3. **プラン（プロジェクトのサブコレクション）**
```javascript
users/{userId}/projects/{projectId}/plans/{planId} {
  name: "新機能リリースプラン",
  description: "新機能のプロモーション投稿プラン",
  platform: "twitter", // twitter, instagram, linkedin, facebook
  type: "campaign", // regular, campaign, announcement, seasonal
  
  schedule: {
    frequency: "daily", // daily, weekly, monthly, custom
    time: "09:00",
    weekdays: [1, 2, 3, 4, 5], // 月-金
    timezone: "Asia/Tokyo",
    startDate: "2025-08-19",
    endDate: "2025-09-19" // null for ongoing
  },
  
  aiSettings: {
    tone: "casual", // casual, professional, friendly, technical
    style: "trending", // trending, tech, minimal, educational
    topics: ["#WebDev", "#JavaScript", "開発日記"],
    model: "qwen2.5:0.5b"
  },
  
  status: "active", // draft, active, paused, completed
  
  stats: {
    totalPosts: 0,
    postedCount: 0,
    scheduledCount: 0,
    failedCount: 0
  },
  
  createdAt: timestamp,
  lastModified: timestamp
}
```

### 4. **投稿（プランのサブコレクション）**
```javascript
users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId} {
  content: "🚀 新機能リリースのお知らせ！...",
  scheduledAt: timestamp, // 投稿予定時刻
  actualPostedAt: timestamp, // 実際の投稿時刻
  
  status: "scheduled", // draft, scheduled, posting, posted, failed, cancelled
  platform: "twitter",
  
  generation: {
    method: "ai", // ai, manual, template
    model: "qwen2.5:0.5b",
    prompt: "プロジェクトの新機能について...",
    generatedAt: timestamp
  },
  
  metadata: {
    characterCount: 245,
    hashtags: ["#新機能", "#アップデート"],
    mentions: [],
    mediaUrls: []
  },
  
  engagement: { // 投稿後に更新
    likes: 0,
    retweets: 0,
    replies: 0,
    impressions: 0,
    lastUpdated: timestamp
  },
  
  platformData: {
    tweetId: "1234567890", // 投稿後に設定
    url: "https://twitter.com/...",
    error: null // エラー情報
  },
  
  createdAt: timestamp,
  lastModified: timestamp
}
```

### 5. **認証情報（暗号化）**
```javascript
users/{userId}/credentials/{platformId} {
  platform: "twitter", // twitter, google, facebook, instagram
  
  tokens: {
    accessToken: "encrypted_token",      // AES-256-CBC暗号化
    refreshToken: "encrypted_token",     // AES-256-CBC暗号化
    tokenExpiry: timestamp,
    scope: ["read", "write"]
  },
  
  accountInfo: {
    username: "@example",
    accountId: "1234567890",
    displayName: "Example User",
    profileUrl: "https://twitter.com/example"
  },
  
  status: {
    isConnected: true,
    lastVerified: timestamp,
    errorCount: 0,
    lastError: null
  },
  
  createdAt: timestamp,
  lastUpdated: timestamp
}
```

## 🔒 階層構造用セキュリティルール

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ユーザー基本情報 - 本人のみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // プロジェクト - ユーザーの下のサブコレクション
      match /projects/{projectId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // プラン - プロジェクトの下のサブコレクション
        match /plans/{planId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
          
          // 投稿 - プランの下のサブコレクション
          match /posts/{postId} {
            allow read, write: if request.auth != null && request.auth.uid == userId;
          }
        }
        
        // プロジェクト設定
        match /settings/{settingId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
      
      // 認証情報（暗号化）
      match /credentials/{platformId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // 他のドキュメントは拒否
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🚀 階層構造の利点

### **1. 論理的な関係性**
- 親子関係が明確：Project → Plan → Post
- データの整合性が保たれる
- 関連データの削除が簡単（カスケード削除）

### **2. セキュリティの簡素化**
- ユーザーIDを1回チェックするだけ
- 階層的な権限管理
- 認証情報の分離

### **3. パフォーマンス最適化**
- 関連データの効率的な取得
- 必要な範囲のみのクエリ
- インデックス最適化

### **4. 保守性の向上**
- データ構造が直感的
- 機能追加が容易
- デバッグが簡単

## 📋 移行計画

### **Phase 1: 新構造実装**
1. 新しいFirestoreルールのデプロイ
2. firebase-service.jsのAPI変更
3. フロントエンドの呼び出し更新

### **Phase 2: データ移行**
1. 既存データの新構造への移行
2. 旧データの削除
3. 動作確認

### **Phase 3: 最適化**
1. クエリパフォーマンス調整
2. インデックス最適化
3. エラーハンドリング強化

## 🎯 次のアクション

1. **セキュリティルールを更新**してデプロイ
2. **firebase-service.js**のメソッドを階層構造に対応
3. **フロントエンド**のAPI呼び出しを更新
4. **テスト**でデータ作成・取得を確認

これにより、よりスケーラブルで保守性の高いアーキテクチャになります。