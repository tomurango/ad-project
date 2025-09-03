# Firebase セットアップ手順

## 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名: `ad-project-scheduler`
4. Google Analytics: 有効（推奨）
5. プロジェクト作成完了

## 2. Firebase CLI インストール

```bash
# Firebase CLI インストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト初期化（ad-projectディレクトリで実行）
firebase init
```

## 3. 初期化設定

```
? Which Firebase features do you want to set up for this directory?
 ◉ Firestore: Configure security rules and indexes files for Firestore
 ◉ Functions: Configure a Cloud Functions directory and files
 ◉ Hosting: Configure files for Firebase Hosting and (optionally) GitHub Action deploys

? Please select an option: Use an existing project
? Select a default Firebase project for this directory: ad-project-scheduler

? What file should be used for Firestore Rules? firestore.rules
? What file should be used for Firestore indexes? firestore.indexes.json
? What language would you like to use to write Cloud Functions? JavaScript
? Do you want to use ESLint to catch probable bugs and enforce style? Yes
? Do you want to install dependencies with npm now? Yes

? What do you want to use as your public directory? public
? Configure as a single-page app? No  
? Set up automatic builds and deploys with GitHub? No
```

## 4. 生成される構造

```
ad-project/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── functions/
│   ├── package.json
│   ├── index.js
│   └── node_modules/
└── public/
    └── index.html
```