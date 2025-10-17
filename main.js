const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables from .env file
require('dotenv').config();
const OllamaService = require('./src/services/ollama-service');
const aiServiceManager = require('./src/services/ai-service-manager');
const firebaseService = require('./src/services/firebase-service');
const twitterService = require('./src/services/twitter-service');
const twitterOAuthService = require('./src/services/twitter-oauth-service');
const googleAdsService = require('./src/services/google-ads-service');
const youtubeDataService = require('./src/services/youtube-data-service');
const multiPlatformAuthManager = require('./src/services/multi-platform-auth-manager');
const MigrationService = require('./src/services/migration-service');
const http = require('http');
const { shell } = require('electron');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be'
    }
  });

  mainWindow.loadFile('index.html');
  
  // 開発時はデベロッパーツールを開く
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // デバッグ用：ページ読み込み完了を監視
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('メインプロセス: ページ読み込み完了');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`レンダラーコンソール [${level}]: ${message}`);
  });
}

// Ollama Service初期化
const ollamaService = new OllamaService();

// Migration Service初期化
let migrationService;

// Firebase設定を環境変数から構築
function getFirebaseConfigFromEnv() {
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "ad-project-64e9b.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "ad-project-64e9b",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ad-project-64e9b.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "774397013456",
    appId: process.env.FIREBASE_APP_ID || "1:774397013456:web:a123456789abcdef"
  };
}

// Firebase Service初期化
async function initializeFirebase() {
  try {
    // 環境変数からFirebase設定を取得
    const firebaseConfig = getFirebaseConfigFromEnv();
    
    if (!firebaseConfig.apiKey) {
      throw new Error('FIREBASE_API_KEY が .env ファイルに設定されていません');
    }
    
    // firebase-config.jsに設定を送信
    const configModule = require('./config/firebase-config');
    configModule.setFirebaseConfig(firebaseConfig);
    
    const result = await firebaseService.initialize();
    if (result.success) {
      console.log('✅ Firebase サービス初期化完了');
      
      // Firebase初期化後にMigrationServiceを初期化
      migrationService = new MigrationService(firebaseService);
      console.log('✅ Migration サービス初期化完了');
    } else {
      console.error('❌ Firebase サービス初期化失敗:', result.error);
    }
  } catch (error) {
    console.error('❌ Firebase 初期化エラー:', error);
  }
}

// Twitter Service初期化
async function initializeTwitter() {
  try {
    const result = await twitterService.initialize();
    if (result.success) {
      console.log('✅ Twitter サービス初期化完了');
    } else {
      console.log('ℹ️ Twitter サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ Twitter 初期化エラー:', error);
  }
}

// Google Ads Service初期化
async function initializeGoogleAds() {
  try {
    const result = await googleAdsService.initialize();
    if (result.success) {
      console.log('✅ Google Ads サービス初期化完了');
    } else {
      console.log('ℹ️ Google Ads サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ Google Ads 初期化エラー:', error);
  }
}

// YouTube Data Service初期化
async function initializeYouTubeData() {
  try {
    const result = await youtubeDataService.initialize();
    if (result.success) {
      console.log('✅ YouTube Data サービス初期化完了');
    } else {
      console.log('ℹ️ YouTube Data サービス初期化:', result.error || 'API認証情報が未設定');
    }
  } catch (error) {
    console.error('❌ YouTube Data 初期化エラー:', error);
  }
}

// マルチプラットフォーム認証管理初期化
async function initializeMultiPlatformAuth() {
  try {
    const result = await multiPlatformAuthManager.initialize();
    if (result.success) {
      console.log('✅ マルチプラットフォーム認証管理初期化完了');
    } else {
      console.log('ℹ️ マルチプラットフォーム認証管理初期化:', result.error);
    }
  } catch (error) {
    console.error('❌ マルチプラットフォーム認証管理初期化エラー:', error);
  }
}

/**
 * Twitter OAuth コールバックサーバーを起動
 */
let callbackServer = null;
function startTwitterOAuthCallbackServer() {
  if (callbackServer) {
    console.log('⚠️ Twitter OAuthコールバックサーバーは既に起動しています');
    return;
  }

  callbackServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8888');

    if (url.pathname === '/twitter-callback') {
      const oauthToken = url.searchParams.get('oauth_token');
      const oauthVerifier = url.searchParams.get('oauth_verifier');
      const sessionId = url.searchParams.get('session_id');

      if (!oauthToken || !oauthVerifier || !sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>認証エラー</h1><p>必要なパラメータが不足しています</p>');
        return;
      }

      try {
        // Access Token取得
        const result = await twitterOAuthService.handleCallback(sessionId, oauthToken, oauthVerifier);

        // Firestoreに保存
        const saveResult = await firebaseService.saveProjectTwitterAuth(
          result.projectId,
          result.credentials
        );

        if (saveResult.success) {
          // 成功画面を表示
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head>
                <title>Twitter認証成功</title>
                <style>
                  body { font-family: sans-serif; text-align: center; padding: 50px; }
                  h1 { color: #1DA1F2; }
                  .success { color: #17BF63; font-size: 48px; }
                  .info { margin-top: 20px; color: #666; }
                </style>
              </head>
              <body>
                <div class="success">✓</div>
                <h1>Twitter連携成功！</h1>
                <p class="info">@${result.credentials.username} として連携しました</p>
                <p class="info">このウィンドウを閉じて、アプリに戻ってください</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `);

          console.log('✅ Twitter認証完了 & Firestore保存成功');
        } else {
          throw new Error(saveResult.error);
        }
      } catch (error) {
        console.error('❌ Twitter認証処理エラー:', error);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head>
              <title>Twitter認証エラー</title>
              <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                h1 { color: #E0245E; }
                .error { color: #E0245E; font-size: 48px; }
              </style>
            </head>
            <body>
              <div class="error">✗</div>
              <h1>Twitter認証エラー</h1>
              <p>${error.message}</p>
              <p>このウィンドウを閉じて、再度お試しください</p>
            </body>
          </html>
        `);
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  callbackServer.listen(8888, '127.0.0.1', () => {
    console.log('✅ Twitter OAuthコールバックサーバー起動: http://127.0.0.1:8888');
  });

  callbackServer.on('error', (error) => {
    console.error('❌ コールバックサーバーエラー:', error);
  });
}

// アプリ起動時に各サービスを初期化
app.whenReady().then(() => {
  createWindow();
  initializeFirebase();
  initializeTwitter();
  initializeGoogleAds();
  initializeYouTubeData();
  initializeMultiPlatformAuth();
  startTwitterOAuthCallbackServer(); // コールバックサーバー起動
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for AI integration (統一API)
ipcMain.handle('ai-generate-text', async (event, prompt, options = {}) => {
  try {
    // AI Service Managerの設定をフロントエンドと同期
    const provider = options.provider || aiServiceManager.getCurrentProvider();
    
    // フロントエンドから設定情報を受け取る場合
    if (options.config) {
      const savedConfig = JSON.parse(options.config);
      aiServiceManager.currentProvider = savedConfig.currentProvider || 'ollama';
      Object.keys(savedConfig.config || {}).forEach(key => {
        if (aiServiceManager.config[key]) {
          aiServiceManager.config[key] = { ...aiServiceManager.config[key], ...savedConfig.config[key] };
        }
      });
    }
    
    const result = await aiServiceManager.generateText(prompt, { ...options, provider });
    return result;
  } catch (error) {
    console.error(`AI生成エラー (${provider}):`, error);

    // より詳細なエラー情報を返す
    let errorMessage = error.message;
    if (provider === 'ollama' && error.message && error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Ollamaサーバーに接続できません。Ollamaが起動していることを確認してください。';
    } else if (error.message && error.message.includes('API key')) {
      errorMessage = `${provider}のAPIキーが設定されていないか、無効です。`;
    }

    return {
      success: false,
      error: errorMessage,
      provider: provider,
      originalError: error.message
    };
  }
});

// AI設定同期用のIPCハンドラー
ipcMain.handle('ai-sync-config', async (event, configData) => {
  try {
    if (configData && configData.currentProvider && configData.config) {
      console.log(`🔧 AI設定同期: ${configData.currentProvider}`);
      aiServiceManager.currentProvider = configData.currentProvider;
      
      // 各プロバイダーの設定を更新
      Object.keys(configData.config).forEach(key => {
        if (aiServiceManager.config[key]) {
          aiServiceManager.config[key] = { ...aiServiceManager.config[key], ...configData.config[key] };
        }
      });
      
      console.log(`✅ AI設定同期完了: ${aiServiceManager.getCurrentProvider()}`);
      return { success: true, provider: aiServiceManager.getCurrentProvider() };
    }
    return { success: false, error: 'Invalid config data' };
  } catch (error) {
    console.error('❌ AI設定同期エラー:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai-get-current-provider', async (event) => {
  try {
    const currentProvider = aiServiceManager.getCurrentProvider();
    const providerName = aiServiceManager.getProviderDisplayName(currentProvider);
    return { success: true, provider: currentProvider, name: providerName };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Legacy Ollama handlers (後方互換性のため保持)
ipcMain.handle('ollama-generate-tweet', async (event, projectInfo) => {
  try {
    const tweet = await ollamaService.generateTweet(projectInfo);
    return { success: true, data: tweet };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-chat', async (event, message, context = '') => {
  try {
    // 統一APIを使用
    const result = await aiServiceManager.generateText(message);
    if (result.success) {
      return { success: true, data: result.content };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-analyze-project', async (event, projectName) => {
  try {
    const analysis = await ollamaService.analyzeProject(projectName);
    return { success: true, data: analysis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-health-check', async (event) => {
  try {
    const isHealthy = await ollamaService.checkHealth();
    return { success: true, data: isHealthy };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-get-models', async (event) => {
  try {
    const models = await ollamaService.getAvailableModels();
    return { success: true, data: models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama-set-model', async (event, modelName) => {
  try {
    ollamaService.setModel(modelName);
    return { success: true, data: `Model changed to ${modelName}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ディレクトリ選択ダイアログを開く
ipcMain.handle('select-directory', async (event, title = 'ディレクトリを選択', defaultPath = null) => {
  try {
    const dialogOptions = {
      title: title,
      properties: ['openDirectory'],
      buttonLabel: '選択'
    };
    
    // 初期パスが指定されている場合は設定
    if (defaultPath) {
      dialogOptions.defaultPath = defaultPath;
    }
    
    // BrowserWindowを親として指定
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), dialogOptions);
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Finderでディレクトリを開く
ipcMain.handle('open-finder', async (event, directoryPath) => {
  try {
    const { shell } = require('electron');
    
    // ディレクトリの存在確認
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error('指定されたパスはディレクトリではありません');
    }
    
    // Finderでディレクトリを開く
    await shell.openPath(directoryPath);
    console.log('Finderでディレクトリを開きました:', directoryPath);
    
    return { success: true, message: 'Finderでディレクトリを開きました' };
  } catch (error) {
    console.error('Finder起動エラー:', error);
    return { success: false, error: error.message };
  }
});

// 指定ディレクトリからプロジェクト候補を取得（1階層のみ）
ipcMain.handle('discover-projects', async (event, directoryPath) => {
  try {
    console.log('プロジェクト検索開始:', directoryPath);
    
    // ディレクトリ存在確認
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error('指定されたパスはディレクトリではありません');
    }
    
    const items = await fs.readdir(directoryPath, { withFileTypes: true });
    const projects = [];
    
    console.log(`${items.length}個のアイテムを発見`);
    
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        try {
          const projectPath = path.join(directoryPath, item.name);
          console.log('プロジェクト分析中:', projectPath);
          
          const projectInfo = await analyzeProjectDirectory(projectPath, item.name);
          projects.push(projectInfo);
          
          console.log('プロジェクト分析完了:', item.name);
        } catch (itemError) {
          console.error(`プロジェクト分析エラー (${item.name}):`, itemError);
          // 個別プロジェクトのエラーは無視して続行
        }
      }
    }
    
    console.log(`${projects.length}個のプロジェクトを検出`);
    return { success: true, projects: projects };
  } catch (error) {
    console.error('プロジェクト検索エラー:', error);
    return { success: false, error: `プロジェクト検索エラー: ${error.message}` };
  }
});


// ディレクトリ存在確認
ipcMain.handle('validate-directory', async (event, directoryPath) => {
  try {
    const stats = await fs.stat(directoryPath);
    return { 
      success: true, 
      data: { 
        exists: stats.isDirectory(),
        isDirectory: stats.isDirectory()
      }
    };
  } catch (error) {
    return { success: false, error: 'ディレクトリが存在しません' };
  }
});

// プロジェクトディレクトリを分析
async function analyzeProjectDirectory(projectPath, projectName) {
  const projectInfo = {
    name: projectName,
    path: projectPath,
    displayName: projectName,
    description: '',
    category: 'other',
    tech: '',
    hasPackageJson: false,
    hasPubspecYaml: false,
    hasReadme: false,
    hasClaude: false,
    fileStructure: {},
    codeFiles: [],
    features: [],
    dependencies: []
  };
  
  try {
    const files = await fs.readdir(projectPath);
    
    // ファイル存在チェック
    projectInfo.hasPackageJson = files.includes('package.json');
    projectInfo.hasPubspecYaml = files.includes('pubspec.yaml');
    projectInfo.hasReadme = files.some(file => file.toLowerCase().startsWith('readme'));
    projectInfo.hasClaude = files.includes('CLAUDE.md');
    
    // package.jsonから情報を抽出
    if (projectInfo.hasPackageJson) {
      try {
        const packagePath = path.join(projectPath, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        if (packageJson.description) {
          projectInfo.description = packageJson.description;
        }
        if (packageJson.name) {
          projectInfo.displayName = packageJson.name;
        }
        
        // 技術スタックを推測
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const techStack = [];
        
        if (deps.react) techStack.push('React');
        if (deps.vue) techStack.push('Vue');
        if (deps.angular) techStack.push('Angular');
        if (deps.express) techStack.push('Express');
        if (deps.electron) techStack.push('Electron');
        if (deps.typescript) techStack.push('TypeScript');
        
        projectInfo.tech = techStack.join(', ') || 'Node.js';
        projectInfo.category = deps.electron ? 'desktop' : deps.react || deps.vue || deps.angular ? 'web' : 'tool';
        
      } catch (e) {
        // package.json読み取りエラーは無視
      }
    }
    
    // pubspec.yamlから情報を抽出 (Flutter)
    if (projectInfo.hasPubspecYaml) {
      try {
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        const pubspecContent = await fs.readFile(pubspecPath, 'utf8');
        
        const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
        const descMatch = pubspecContent.match(/^description:\s*(.+)$/m);
        
        if (nameMatch) {
          projectInfo.displayName = nameMatch[1].trim();
        }
        if (descMatch) {
          projectInfo.description = descMatch[1].trim();
        }
        
        projectInfo.tech = 'Flutter/Dart';
        projectInfo.category = 'mobile';
        
      } catch (e) {
        // pubspec.yaml読み取りエラーは無視
      }
    }
    
    // README.mdから説明を抽出
    if (projectInfo.hasReadme && !projectInfo.description) {
      try {
        const readmeFiles = files.filter(file => file.toLowerCase().startsWith('readme'));
        if (readmeFiles.length > 0) {
          const readmePath = path.join(projectPath, readmeFiles[0]);
          const readmeContent = await fs.readFile(readmePath, 'utf8');
          
          // 最初の段落を抽出
          const lines = readmeContent.split('\n');
          for (let line of lines) {
            line = line.trim();
            if (line && !line.startsWith('#') && !line.startsWith('!') && line.length > 10) {
              projectInfo.description = line.substring(0, 100);
              break;
            }
          }
        }
      } catch (e) {
        // README読み取りエラーは無視
      }
    }
    
    // ディレクトリ構造とコードファイルを詳細分析
    await analyzeDirectoryStructure(projectPath, projectInfo);
    
    // プロジェクトの特徴を推測
    analyzeProjectFeatures(projectInfo);
    
    // 説明文を自動生成
    generateProjectDescription(projectInfo);
    
  } catch (error) {
    // ディレクトリ読み取りエラーは無視
  }
  
  return projectInfo;
}

// ディレクトリ構造を詳細分析
async function analyzeDirectoryStructure(projectPath, projectInfo) {
  try {
    console.log('ディレクトリ構造分析開始:', projectPath);
    const structure = await scanDirectory(projectPath, 0, 2); // 最大2階層まで
    projectInfo.fileStructure = structure;
    
    // コードファイルを収集
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.dart', '.java', '.cpp', '.c', '.go', '.rs', '.php'];
    collectCodeFiles(structure, projectInfo.codeFiles, codeExtensions);
    
    console.log(`ファイル構造分析完了: ${projectInfo.codeFiles.length}個のコードファイル`);
  } catch (error) {
    console.error('ディレクトリ構造分析エラー:', error);
    // エラーが発生してもデフォルト値を設定
    projectInfo.fileStructure = {};
    projectInfo.codeFiles = [];
  }
}

// ディレクトリをスキャン
async function scanDirectory(dirPath, currentDepth, maxDepth) {
  if (currentDepth >= maxDepth) return {};
  
  const structure = {};
  
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      try {
        if (item.name.startsWith('.')) continue;
        
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // よく知られたディレクトリのみ詳細スキャン
          const importantDirs = ['src', 'lib', 'components', 'pages', 'views', 'models', 'services', 'utils'];
          if (importantDirs.includes(item.name.toLowerCase()) || currentDepth === 0) {
            structure[item.name] = await scanDirectory(itemPath, currentDepth + 1, maxDepth);
          } else {
            structure[item.name] = { type: 'directory' };
          }
        } else {
          try {
            const stats = await fs.stat(itemPath);
            structure[item.name] = { 
              type: 'file',
              size: stats.size 
            };
          } catch (statError) {
            // ファイル状態取得に失敗した場合はサイズなしで登録
            structure[item.name] = { 
              type: 'file',
              size: 0 
            };
          }
        }
      } catch (itemError) {
        console.error(`アイテム処理エラー (${item.name}):`, itemError);
        // 個別アイテムのエラーは無視して続行
      }
    }
  } catch (error) {
    console.error(`ディレクトリスキャンエラー (${dirPath}):`, error);
  }
  
  return structure;
}

// コードファイルを収集
function collectCodeFiles(structure, codeFiles, extensions, currentPath = '') {
  for (const [name, info] of Object.entries(structure)) {
    const fullPath = currentPath ? `${currentPath}/${name}` : name;
    
    if (info.type === 'file') {
      const ext = path.extname(name).toLowerCase();
      if (extensions.includes(ext)) {
        codeFiles.push({
          name: name,
          path: fullPath,
          extension: ext,
          size: info.size
        });
      }
    } else if (typeof info === 'object' && info.type !== 'directory') {
      collectCodeFiles(info, codeFiles, extensions, fullPath);
    }
  }
}

// プロジェクトの特徴を分析
function analyzeProjectFeatures(projectInfo) {
  const features = [];
  const structure = projectInfo.fileStructure;
  const codeFiles = projectInfo.codeFiles;
  
  // フロントエンド系の特徴
  if (structure['public'] || structure['static']) {
    features.push('静的ファイル配信');
  }
  
  if (structure['components'] || structure['src/components']) {
    features.push('コンポーネントベース設計');
  }
  
  if (structure['pages'] || structure['src/pages']) {
    features.push('ページルーティング');
  }
  
  if (structure['api'] || structure['src/api']) {
    features.push('API機能');
  }
  
  // バックエンド系の特徴
  if (structure['models'] || structure['src/models']) {
    features.push('データモデル');
  }
  
  if (structure['routes'] || structure['src/routes']) {
    features.push('ルーティング機能');
  }
  
  if (structure['middleware'] || structure['src/middleware']) {
    features.push('ミドルウェア');
  }
  
  // モバイル系の特徴
  if (structure['android'] && structure['ios']) {
    features.push('クロスプラットフォーム対応');
  }
  
  if (structure['lib']) {
    features.push('ライブラリ構造');
  }
  
  // テスト関連
  if (structure['test'] || structure['tests'] || structure['__tests__']) {
    features.push('テスト機能');
  }
  
  // ドキュメント
  if (structure['docs'] || structure['documentation']) {
    features.push('ドキュメント付き');
  }
  
  // 設定ファイル系
  if (structure['docker-compose.yml'] || structure['Dockerfile']) {
    features.push('Docker対応');
  }
  
  if (structure['.github']) {
    features.push('GitHub Actions');
  }
  
  // ファイル数による特徴
  const jsFiles = codeFiles.filter(f => ['.js', '.ts', '.jsx', '.tsx'].includes(f.extension)).length;
  const dartFiles = codeFiles.filter(f => f.extension === '.dart').length;
  const pyFiles = codeFiles.filter(f => f.extension === '.py').length;
  
  if (jsFiles > 20) features.push('大規模JavaScript');
  if (dartFiles > 10) features.push('Flutter開発');
  if (pyFiles > 5) features.push('Python開発');
  
  projectInfo.features = features;
}

// プロジェクト説明を自動生成
function generateProjectDescription(projectInfo) {
  if (projectInfo.description && projectInfo.description.length > 10) {
    return; // 既に説明がある場合はスキップ
  }
  
  const { category, tech, features, codeFiles } = projectInfo;
  const fileCount = codeFiles.length;
  
  let description = '';
  
  // カテゴリベースの基本説明
  switch (category) {
    case 'web':
      description = 'Webアプリケーション';
      break;
    case 'mobile':
      description = 'モバイルアプリケーション';
      break;
    case 'desktop':
      description = 'デスクトップアプリケーション';
      break;
    case 'tool':
      description = '開発ツール';
      break;
    case 'game':
      description = 'ゲームアプリケーション';
      break;
    default:
      description = 'ソフトウェアプロジェクト';
  }
  
  // 技術スタック情報を追加
  if (tech) {
    description += `（${tech}）`;
  }
  
  // 特徴的な機能を追加
  if (features.length > 0) {
    const mainFeatures = features.slice(0, 3); // 最大3つの特徴
    description += `で、${mainFeatures.join('、')}などの機能を持つ`;
  }
  
  // 規模感を追加
  if (fileCount > 50) {
    description += '大規模な';
  } else if (fileCount > 20) {
    description += '中規模な';
  } else if (fileCount > 5) {
    description += '小規模な';
  }
  
  description += 'プロジェクトです。';
  
  // Flutter特有の説明
  if (tech.includes('Flutter')) {
    if (features.includes('クロスプラットフォーム対応')) {
      description += 'iOS・Android両対応のクロスプラットフォームアプリです。';
    }
  }
  
  // React系の説明
  if (tech.includes('React')) {
    if (features.includes('コンポーネントベース設計')) {
      description += 'コンポーネントベースの現代的なフロントエンド設計を採用しています。';
    }
  }
  
  // 開発環境の特徴
  if (features.includes('テスト機能')) {
    description += 'テストコードも含む品質重視の開発プロジェクトです。';
  }
  
  if (features.includes('Docker対応')) {
    description += 'Docker環境での開発・デプロイに対応しています。';
  }
  
  projectInfo.description = description;
}

// AIを使った高品質な説明生成
ipcMain.handle('generate-ai-description', async (event, projectInfo) => {
  try {
    // プロジェクト情報をまとめる
    const projectSummary = `
【プロジェクト基本情報】
プロジェクト名: ${projectInfo.displayName}
プロジェクト種類: ${projectInfo.category === 'web' ? 'Webアプリケーション' : 
                     projectInfo.category === 'mobile' ? 'モバイルアプリ' : 
                     projectInfo.category === 'desktop' ? 'デスクトップアプリ' : 
                     projectInfo.category === 'tool' ? '開発ツール' : 'ソフトウェア'}
使用技術: ${projectInfo.tech || '不明'}

【プロジェクト詳細】
コードファイル数: ${projectInfo.codeFiles ? projectInfo.codeFiles.length : 0}個
主な機能・特徴: ${projectInfo.features && projectInfo.features.length > 0 ? projectInfo.features.join('、') : '分析中'}
既存の説明: ${projectInfo.description || '未設定'}

【フォルダ構成】
${Object.keys(projectInfo.fileStructure || {}).slice(0, 8).join('、')}
`;

    // シンプルで明確な情報抽出
    const appName = projectInfo.displayName;
    const appType = projectInfo.category === 'web' ? 'Webアプリ' : 
                   projectInfo.category === 'mobile' ? 'モバイルアプリ' : 
                   projectInfo.category === 'desktop' ? 'デスクトップアプリ' : 'アプリ';
    const tech = projectInfo.tech || '';
    const features = projectInfo.features && projectInfo.features.length > 0 ? 
                    projectInfo.features.slice(0, 2).join('、') : '';
    
    // プロジェクトの用途を推測
    const purposeMap = {
      'shuumy': '趣味を記録・管理する',
      'chokushii': 'データを整理する', 
      'genshin': 'ゲーム情報を管理する'
    };
    const defaultPurpose = appName.toLowerCase().includes('管理') ? 'データ管理の' : 
                          appName.toLowerCase().includes('記録') ? '記録・整理の' : '';
    const purpose = purposeMap[appName.toLowerCase()] || defaultPurpose || '便利な';
    
    const prompt = `次の情報で完全な文章を作ってください：

アプリ名: ${appName}
用途: ${purpose}
種類: ${appType}
技術: ${tech}

例: 「PhotoManagerは写真を整理するWebアプリです。画像の分類や検索ができます。」

${appName}について、上記の例と同じ形式で自然な説明文を作ってください。
[] や「主要タスク」のような曖昧な表現は使わず、具体的な説明にしてください。`;

    const result = await aiServiceManager.generateText(prompt);
    if (!result.success) {
      throw new Error(result.error);
    }
    const description = result.content;
    
    if (description && description.length > 10) {
      // 生成結果のクリーンアップ
      let cleanedResult = description.trim();
      
      // 不要な前置きや条件説明を削除
      cleanedResult = cleanedResult.replace(/^.*?以下.*?：\s*/s, '');
      cleanedResult = cleanedResult.replace(/^.*?条件.*?：\s*/s, '');
      cleanedResult = cleanedResult.replace(/^.*?形式.*?：\s*/s, '');
      cleanedResult = cleanedResult.replace(/^「/, '').replace(/」$/, '');
      
      // テンプレート表現を削除・置換
      cleanedResult = cleanedResult.replace(/\[.*?\]/g, ''); // [xxx]を削除
      cleanedResult = cleanedResult.replace(/\[主要タスク\]/g, '基本機能');
      cleanedResult = cleanedResult.replace(/\[簡単操作\]/g, '直感的な操作');
      cleanedResult = cleanedResult.replace(/\[主な機能\]/g, '各種機能');
      cleanedResult = cleanedResult.replace(/両端で/g, '両方で');
      
      // 改行や余分な空白を整理
      cleanedResult = cleanedResult.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      
      // 空白が連続する部分を修正
      cleanedResult = cleanedResult.replace(/\s+/g, ' ');
      
      // 基本的な文章構造チェック
      if (cleanedResult.includes(appName) && cleanedResult.length < 150 && !cleanedResult.includes('[')) {
        return { success: true, data: cleanedResult };
      } else {
        // フォールバック: 確実にテンプレート表現を使わない説明生成
        const fallback = `${appName}は${purpose}${appType}です。${tech ? tech + 'で開発されており、' : ''}${features ? features.replace(/、/g, 'や') + 'などの機能を提供します。' : '様々な機能を提供します。'}`;
        return { success: true, data: fallback };
      }
    } else {
      throw new Error('AI説明生成に失敗しました');
    }
    
  } catch (error) {
    console.error('AI説明生成エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// Firebase IPCハンドラー
// ==========================================

// Firebase認証 - メール・パスワードでログイン
ipcMain.handle('firebase-signin-email', async (event, email, password) => {
  try {
    const result = await firebaseService.signInWithEmail(email, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - アカウント作成
ipcMain.handle('firebase-create-user', async (event, email, password) => {
  try {
    const result = await firebaseService.createUserWithEmail(email, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - Googleでログイン
ipcMain.handle('firebase-signin-google', async (event) => {
  try {
    const result = await firebaseService.signInWithGoogle();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - ログアウト
ipcMain.handle('firebase-signout', async (event) => {
  try {
    const result = await firebaseService.signOut();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - 現在のユーザー取得
ipcMain.handle('firebase-get-current-user', async (event) => {
  try {
    const user = firebaseService.getCurrentUser();
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase認証 - ログイン状態チェック
ipcMain.handle('firebase-is-logged-in', async (event) => {
  try {
    const isLoggedIn = firebaseService.isLoggedIn();
    return { success: true, isLoggedIn };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Firebase Authentication 専用IPCハンドラー
// ==========================================

// 認証状態を確認
ipcMain.handle('check-auth-state', async (event) => {
  try {
    const user = firebaseService.getCurrentUser();
    const isLoggedIn = firebaseService.isLoggedIn();
    
    if (isLoggedIn && user) {
      return {
        success: true,
        authenticated: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      return {
        success: true,
        authenticated: false,
        user: null
      };
    }
  } catch (error) {
    console.error('認証状態確認エラー:', error);
    return {
      success: false,
      error: error.message,
      authenticated: false,
      user: null
    };
  }
});

// メール・パスワードでログイン
ipcMain.handle('login-with-email', async (event, email, password) => {
  try {
    console.log('メールログイン試行:', email);
    
    const result = await firebaseService.signInWithEmail(email, password);
    
    if (result.success) {
      const user = result.user;
      console.log('ログイン成功:', user.email);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'ログインに失敗しました');
    }
  } catch (error) {
    console.error('メールログインエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// メール・パスワードでサインアップ
ipcMain.handle('signup-with-email', async (event, email, password) => {
  try {
    console.log('メールサインアップ試行:', email);
    
    const result = await firebaseService.createUserWithEmail(email, password);
    
    if (result.success) {
      const user = result.user;
      console.log('サインアップ成功:', user.email);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'アカウント作成に失敗しました');
    }
  } catch (error) {
    console.error('メールサインアップエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Googleでログイン
ipcMain.handle('login-with-google', async (event) => {
  try {
    console.log('Googleログイン試行');
    
    const result = await firebaseService.signInWithGoogle();
    
    if (result.success) {
      const user = result.user;
      console.log('Googleログイン成功:', user.email);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } else {
      throw new Error(result.error || 'Googleログインに失敗しました');
    }
  } catch (error) {
    console.error('Googleログインエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// ログアウト
ipcMain.handle('logout', async (event) => {
  try {
    console.log('ログアウト試行');
    
    const result = await firebaseService.signOut();
    
    if (result.success) {
      console.log('ログアウト成功');
      return {
        success: true,
        message: 'ログアウトしました'
      };
    } else {
      throw new Error(result.error || 'ログアウトに失敗しました');
    }
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Firebase - プロジェクト同期
ipcMain.handle('firebase-sync-project', async (event, action, projectData) => {
  try {
    const result = await firebaseService.syncProject(action, projectData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ユーザーのプロジェクト一覧取得
ipcMain.handle('firebase-get-user-projects', async (event) => {
  try {
    const result = await firebaseService.getUserProjects();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ユーザーのプロジェクト一覧取得（シンプル版）
ipcMain.handle('firebase-get-user-projects-simple', async (event) => {
  try {
    const result = await firebaseService.getUserProjectsSimple();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - プロジェクトスケジュール更新
ipcMain.handle('firebase-update-project-schedule', async (event, projectId, scheduleData) => {
  try {
    const result = await firebaseService.updateProjectSchedule(projectId, scheduleData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - プロジェクト投稿履歴取得
ipcMain.handle('firebase-get-project-history', async (event, projectId, limit) => {
  try {
    const result = await firebaseService.getProjectHistory(projectId, limit);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - ツイート再試行
ipcMain.handle('firebase-retry-tweet', async (event, tweetId) => {
  try {
    const result = await firebaseService.retryTweet(tweetId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Firebase - 接続確認
ipcMain.handle('firebase-check-connection', async (event) => {
  try {
    const result = await firebaseService.checkConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Firebase プラン管理 IPCハンドラー
// ==========================================

// プロジェクトのプラン一覧を取得
ipcMain.handle('firebase-get-project-plans', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectPlans(projectId);
    return result;
  } catch (error) {
    return { success: false, error: error.message, plans: [] };
  }
});

// プラン作成
ipcMain.handle('firebase-create-plan', async (event, planData) => {
  try {
    const result = await firebaseService.createPlan(planData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラン更新
ipcMain.handle('firebase-update-plan', async (event, projectId, planId, updateData) => {
  try {
    const result = await firebaseService.updatePlan(projectId, planId, updateData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラン削除
ipcMain.handle('firebase-delete-plan', async (event, planId) => {
  try {
    const result = await firebaseService.deletePlan(planId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 個別プランを取得
ipcMain.handle('firebase-get-plan', async (event, projectId, planId) => {
  try {
    const result = await firebaseService.getPlan(projectId, planId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Firebase 投稿管理 IPCハンドラー
// ==========================================

// プロジェクトの投稿一覧を取得
ipcMain.handle('firebase-get-project-posts', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectPosts(projectId);
    return result;
  } catch (error) {
    return { success: false, error: error.message, posts: [] };
  }
});

// 個別投稿を取得
ipcMain.handle('firebase-get-post', async (event, projectId, planId, postId) => {
  try {
    const result = await firebaseService.getPost(projectId, planId, postId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿作成
ipcMain.handle('firebase-create-post', async (event, postData) => {
  try {
    const result = await firebaseService.createPost(postData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿更新
ipcMain.handle('firebase-update-post', async (event, projectId, planId, postId, updateData) => {
  try {
    const result = await firebaseService.updatePost(projectId, planId, postId, updateData);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 投稿削除
ipcMain.handle('firebase-delete-post', async (event, postId) => {
  try {
    const result = await firebaseService.deletePost(postId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cloud Function手動実行（デバッグ用）
ipcMain.handle('test-cloud-function', async (event, functionName) => {
  try {
    const https = require('https');
    const http = require('http');
    
    // Firebase Functions URLの設定
    const projectId = 'ad-project-4fb54'; // 実際のプロジェクトID
    const region = 'us-central1'; // リージョン
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    
    console.log(`🚀 Cloud Function実行: ${functionUrl}`);
    
    return new Promise((resolve, reject) => {
      const url = new URL(functionUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({ success: true, data: result });
          } catch (parseError) {
            resolve({ success: false, error: 'レスポンスの解析に失敗', data });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      req.end();
    });
    
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Twitter API IPCハンドラー
// ==========================================

// Twitter API認証情報を設定
ipcMain.handle('twitter-set-credentials', async (event, credentials) => {
  try {
    const result = await twitterService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API認証情報の状態を取得
ipcMain.handle('twitter-get-status', async (event) => {
  try {
    const status = twitterService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API接続テスト
ipcMain.handle('twitter-test-connection', async (event) => {
  try {
    const result = await twitterService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ツイート投稿
ipcMain.handle('twitter-post-tweet', async (event, tweetText) => {
  try {
    const result = await twitterService.postTweet(tweetText);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter API認証情報をクリア
ipcMain.handle('twitter-clear-credentials', async (event) => {
  try {
    const result = await twitterService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Twitter OAuth 1.0a認証フロー開始
ipcMain.handle('twitter-oauth-start', async (event, { projectId, consumerKey, consumerSecret }) => {
  try {
    const result = await twitterOAuthService.startAuthFlow(projectId, consumerKey, consumerSecret);

    // ブラウザで認証URLを開く
    shell.openExternal(result.authUrl);

    return {
      success: true,
      message: 'Twitter認証画面を開きました。ブラウザで認証を完了してください。'
    };
  } catch (error) {
    console.error('❌ Twitter OAuth開始エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter認証情報を取得
ipcMain.handle('get-project-twitter-auth', async (event, { projectId }) => {
  try {
    const result = await firebaseService.getProjectTwitterAuth(projectId);
    return result;
  } catch (error) {
    console.error('❌ Twitter認証情報取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのTwitter連携を解除
ipcMain.handle('remove-project-twitter-auth', async (event, { projectId }) => {
  try {
    const result = await firebaseService.removeProjectTwitterAuth(projectId);
    return result;
  } catch (error) {
    console.error('❌ Twitter連携解除エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// Google Ads API IPCハンドラー
// ==========================================

// Google Ads API認証情報を設定
ipcMain.handle('google-ads-set-credentials', async (event, credentials) => {
  try {
    const result = await googleAdsService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API設定状況を取得
ipcMain.handle('google-ads-get-status', async (event) => {
  try {
    const status = googleAdsService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API接続テスト
ipcMain.handle('google-ads-test-connection', async (event) => {
  try {
    const result = await googleAdsService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Performance Max Campaign作成
ipcMain.handle('google-ads-create-performance-max', async (event, config) => {
  try {
    const result = await googleAdsService.createPerformanceMaxCampaign(config);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Demand Gen Campaign作成
ipcMain.handle('google-ads-create-demand-gen', async (event, config) => {
  try {
    const result = await googleAdsService.createDemandGenCampaign(config);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// キャンペーンの一時停止・再開
ipcMain.handle('google-ads-pause-resume-campaign', async (event, campaignId, action) => {
  try {
    const result = await googleAdsService.pauseOrResumeCampaign(campaignId, action);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// キャンペーン一覧取得
ipcMain.handle('google-ads-get-campaigns', async (event) => {
  try {
    const result = await googleAdsService.getCampaigns();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Google Ads API認証情報をクリア
ipcMain.handle('google-ads-clear-credentials', async (event) => {
  try {
    const result = await googleAdsService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// YouTube Data API IPCハンドラー
// ==========================================

// YouTube Data API認証情報を設定
ipcMain.handle('youtube-data-set-credentials', async (event, credentials) => {
  try {
    const result = await youtubeDataService.setCredentials(credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API設定状況を取得
ipcMain.handle('youtube-data-get-status', async (event) => {
  try {
    const status = youtubeDataService.getConfigurationStatus();
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API接続テスト
ipcMain.handle('youtube-data-test-connection', async (event) => {
  try {
    const result = await youtubeDataService.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// チャンネル情報を取得
ipcMain.handle('youtube-data-get-channel-info', async (event, channelId) => {
  try {
    const result = await youtubeDataService.getChannelInfo(channelId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 動画情報を取得
ipcMain.handle('youtube-data-get-video-info', async (event, videoIds) => {
  try {
    const result = await youtubeDataService.getVideoInfo(videoIds);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// チャンネルの動画一覧を取得
ipcMain.handle('youtube-data-get-channel-videos', async (event, channelId, maxResults) => {
  try {
    const result = await youtubeDataService.getChannelVideos(channelId, maxResults);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 動画を検索
ipcMain.handle('youtube-data-search-videos', async (event, query, maxResults, options) => {
  try {
    const result = await youtubeDataService.searchVideos(query, maxResults, options);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// チャンネルを分析
ipcMain.handle('youtube-data-analyze-channel', async (event, channelId) => {
  try {
    const result = await youtubeDataService.analyzeChannel(channelId);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// YouTube Data API認証情報をクリア
ipcMain.handle('youtube-data-clear-credentials', async (event) => {
  try {
    const result = await youtubeDataService.clearCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// マルチプラットフォーム認証管理IPCハンドラー
// ==========================================

// 全プラットフォームの認証状況を取得
ipcMain.handle('multi-auth-get-all-status', async (event) => {
  try {
    const status = multiPlatformAuthManager.getAllPlatformStatus();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 特定プラットフォームの認証情報を設定
ipcMain.handle('multi-auth-set-platform-credentials', async (event, platformName, credentials) => {
  try {
    const result = await multiPlatformAuthManager.setPlatformCredentials(platformName, credentials);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 特定プラットフォームの接続テスト
ipcMain.handle('multi-auth-test-platform-connection', async (event, platformName) => {
  try {
    const result = await multiPlatformAuthManager.testPlatformConnection(platformName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 全プラットフォームの接続テスト
ipcMain.handle('multi-auth-test-all-connections', async (event) => {
  try {
    const result = await multiPlatformAuthManager.testAllConnections();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 統合広告キャンペーン作成
ipcMain.handle('multi-auth-create-crossplatform-campaign', async (event, campaignConfig) => {
  try {
    const result = await multiPlatformAuthManager.createCrossplatformCampaign(campaignConfig);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// プラットフォーム認証情報をクリア
ipcMain.handle('multi-auth-clear-platform-credentials', async (event, platformName) => {
  try {
    const result = await multiPlatformAuthManager.clearPlatformCredentials(platformName);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 全プラットフォーム認証情報をクリア
ipcMain.handle('multi-auth-clear-all-credentials', async (event) => {
  try {
    const result = await multiPlatformAuthManager.clearAllCredentials();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 統合データ分析レポート生成
ipcMain.handle('multi-auth-generate-crossplatform-report', async (event) => {
  try {
    const result = await multiPlatformAuthManager.generateCrossplatformReport();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// 不足していたIPCハンドラー
// ==========================================

// ツイート履歴取得
ipcMain.handle('get-tweet-history', async (event) => {
  try {
    // ダミーデータを返す（実際の実装は後で追加）
    return { 
      success: true, 
      data: [
        {
          id: '1',
          text: 'AI生成投稿のサンプルです。#広告配信プラットフォーム',
          timestamp: new Date().toISOString(),
          platform: 'Twitter',
          isAI: true
        }
      ] 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 簡易データストレージ（実際のデータベース実装までの暫定措置）
const fsSync = require('fs');
const os = require('os');

// データファイルのパス
const dataDir = path.join(os.homedir(), '.ad-project');
const projectsFile = path.join(dataDir, 'projects.json');
const deletedFile = path.join(dataDir, 'deleted.json');

// ディレクトリを作成
if (!fsSync.existsSync(dataDir)) {
  fsSync.mkdirSync(dataDir, { recursive: true });
}

// データを読み込み
let registeredProjects = [];
let deletedProjectIds = new Set();

function loadData() {
  try {
    // プロジェクトデータ読み込み
    if (fsSync.existsSync(projectsFile)) {
      const data = fsSync.readFileSync(projectsFile, 'utf8');
      registeredProjects = JSON.parse(data);
    } else {
      // 初期データ
      registeredProjects = [
        {
          id: '1',
          name: 'shuumy',
          path: '/Users/tomuraeishi/develop/shuumy_data/shuumy/',
          description: 'AI生成投稿のサンプルプロジェクト',
          category: 'web',
          lastModified: new Date().toISOString()
        }
      ];
      saveProjects();
    }
    
    // 削除データ読み込み
    if (fsSync.existsSync(deletedFile)) {
      const data = fsSync.readFileSync(deletedFile, 'utf8');
      deletedProjectIds = new Set(JSON.parse(data));
    }
    
    console.log('📂 データ読み込み完了:', {
      projects: registeredProjects.length,
      deleted: deletedProjectIds.size
    });
  } catch (error) {
    console.error('❌ データ読み込みエラー:', error);
  }
}

function saveProjects() {
  try {
    fsSync.writeFileSync(projectsFile, JSON.stringify(registeredProjects, null, 2));
  } catch (error) {
    console.error('❌ プロジェクトデータ保存エラー:', error);
  }
}

function saveDeleted() {
  try {
    fsSync.writeFileSync(deletedFile, JSON.stringify([...deletedProjectIds], null, 2));
  } catch (error) {
    console.error('❌ 削除データ保存エラー:', error);
  }
}

// 起動時にデータ読み込み
loadData();

// プロジェクト一覧取得
ipcMain.handle('get-project-list', async (event) => {
  try {
    // 削除されていないプロジェクトのみ返す
    const activeProjects = registeredProjects.filter(project => 
      !deletedProjectIds.has(project.id)
    );
    
    return { 
      success: true, 
      projects: activeProjects,
      data: activeProjects  // 後方互換性のため両方提供
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// AI説明生成
ipcMain.handle('generate-project-description', async (event, projectData) => {
  try {
    console.log('🤖 AI説明生成開始:', projectData);
    
    // projectDataから適切なパスを抽出
    let projectPath = '';
    
    if (typeof projectData === 'string') {
      projectPath = projectData;
    } else if (typeof projectData === 'object' && projectData !== null) {
      projectPath = projectData.path || projectData.projectPath || projectData.directory;
    }
    
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('有効なプロジェクトパスが指定されていません');
    }

    console.log('📁 使用するパス:', projectPath);

    // AIサービスを使用してプロジェクト説明を生成
    const prompt = `以下のプロジェクトディレクトリ構造を分析して、プロジェクトの概要説明を200文字程度で作成してください:\n\nパス: ${projectPath}`;
    const result = await aiServiceManager.generateText(prompt);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    console.log('✅ AI説明生成成功');
    return { success: true, description: result.content };
  } catch (error) {
    console.error('❌ AI説明生成エラー:', error);
    return { 
      success: false, 
      error: error.message,
      description: 'AI説明生成機能は現在利用できません。手動で説明を入力してください。'
    };
  }
});

// プロジェクト詳細取得
ipcMain.handle('get-project-detail', async (event, projectId) => {
  try {
    const project = registeredProjects.find(p => p.id === projectId && !deletedProjectIds.has(p.id));
    
    if (!project) {
      return { success: false, error: 'プロジェクトが見つかりません' };
    }
    
    return { success: true, project: project };
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// ディレクトリを開く
ipcMain.handle('open-directory', async (event, directoryPath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(directoryPath);
    return { success: true };
  } catch (error) {
    console.error('❌ ディレクトリオープンエラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトからAI投稿生成
ipcMain.handle('generate-project-tweet', async (event, projectData) => {
  try {
    console.log('🤖 プロジェクト投稿生成開始:', projectData.name);
    
    // プロジェクト情報を整理
    const projectInfo = `
プロジェクト名: ${projectData.name}
説明: ${projectData.description || '説明なし'}
カテゴリ: ${projectData.category || 'その他'}
ディレクトリ: ${projectData.path}
    `.trim();
    
    // AIサービスを使用してツイートを生成
    const prompt = `次のプロジェクト情報を基に、魅力的なTwitter投稿（280文字以内）を作成してください:\n\n${projectInfo}`;
    const result = await aiServiceManager.generateText(prompt, { maxTokens: 100 });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const tweet = result.content.trim();
    
    return { success: true, tweet: tweet };
  } catch (error) {
    console.error('❌ AI投稿生成エラー:', error);
    return { 
      success: false, 
      error: error.message,
      tweet: 'プロジェクトの進捗を報告 🚀 新機能開発中です！'
    };
  }
});

// プロジェクト登録
ipcMain.handle('register-project', async (event, projectData) => {
  try {
    console.log('📝 プロジェクト登録開始:', projectData);
    
    if (!projectData) {
      throw new Error('プロジェクトデータが指定されていません');
    }
    
    const { name, path, description, category } = projectData;
    
    if (!name || !path) {
      throw new Error('プロジェクト名とパスは必須です');
    }
    
    // プロジェクト情報を作成
    const projectInfo = {
      id: Date.now().toString(),
      name: name.trim(),
      path: path.trim(),
      description: description ? description.trim() : '',
      category: category || 'web',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    // 配列に追加
    registeredProjects.push(projectInfo);
    
    // ファイルに保存
    saveProjects();
    
    console.log('✅ プロジェクト登録完了:', projectInfo);
    
    return { 
      success: true, 
      message: 'プロジェクトが正常に登録されました',
      project: projectInfo
    };
    
  } catch (error) {
    console.error('❌ プロジェクト登録エラー:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// プロジェクト削除
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    console.log('🗑️ プロジェクト削除開始:', projectId);
    
    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }
    
    // プロジェクトの存在確認
    const projectExists = registeredProjects.some(project => project.id === projectId);
    if (!projectExists) {
      throw new Error('指定されたプロジェクトが見つかりません');
    }
    
    // 削除済みIDリストに追加（論理削除）
    deletedProjectIds.add(projectId);
    
    // ファイルに保存
    saveDeleted();
    
    console.log('✅ プロジェクト削除完了:', projectId);
    
    return { 
      success: true, 
      message: 'プロジェクトが正常に削除されました',
      deletedId: projectId
    };
    
  } catch (error) {
    console.error('❌ プロジェクト削除エラー:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// ==========================================
// データ移行サービス IPCハンドラー
// ==========================================

// 移行状態チェック
ipcMain.handle('check-migration-status', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }
    
    const status = await migrationService.checkMigrationStatus();
    return { success: true, ...status };
  } catch (error) {
    console.error('❌ 移行状態チェックエラー:', error);
    return { success: false, error: error.message };
  }
});

// ローカル→Firestore移行実行
ipcMain.handle('migrate-local-to-firestore', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }
    
    console.log('🔄 ローカル→Firestore移行開始');
    const result = await migrationService.migrateLocalProjectsToFirestore();
    
    if (result.success) {
      console.log(`✅ 移行完了: ${result.migrated}件`);
    } else {
      console.error('❌ 移行失敗:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 移行実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestore→ローカル同期実行
ipcMain.handle('sync-firestore-to-local', async (event) => {
  try {
    if (!migrationService) {
      throw new Error('Migration Service が初期化されていません');
    }
    
    console.log('⬇️ Firestore→ローカル同期開始');
    const result = await migrationService.syncFirestoreToLocal();
    
    if (result.success) {
      console.log(`✅ 同期完了: ${result.synced}件`);
      // ローカルデータを再読み込み
      loadData();
    } else {
      console.error('❌ 同期失敗:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 同期実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト一覧取得
ipcMain.handle('get-firestore-projects', async (event) => {
  try {
    const result = await firebaseService.getUserProjectsHierarchical();
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// AI設定保存
ipcMain.handle('save-user-ai-config', async (event, { userId, config }) => {
  try {
    const result = await firebaseService.saveUserAIConfig(userId, config);
    return result;
  } catch (error) {
    console.error('❌ AI設定保存エラー:', error);
    return { success: false, error: error.message };
  }
});

// AI設定読み込み
ipcMain.handle('load-user-ai-config', async (event, { userId }) => {
  try {
    const result = await firebaseService.loadUserAIConfig(userId);
    return result;
  } catch (error) {
    console.error('❌ AI設定読み込みエラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト作成（階層構造）
ipcMain.handle('create-firestore-project', async (event, projectData) => {
  try {
    const result = await firebaseService.createProjectHierarchical(projectData);
    
    if (result.success) {
      console.log('✅ Firestoreプロジェクト作成成功:', result.id);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト更新
ipcMain.handle('update-firestore-project', async (event, projectId, updateData) => {
  try {
    const result = await firebaseService.updateProjectHierarchical(projectId, updateData);
    
    if (result.success) {
      console.log('✅ Firestoreプロジェクト更新成功:', projectId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト削除
ipcMain.handle('delete-firestore-project', async (event, projectId) => {
  try {
    const result = await firebaseService.deleteProjectHierarchical(projectId);
    
    if (result.success) {
      console.log('✅ Firestoreプロジェクト削除成功:', projectId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// Firestoreプロジェクト取得（階層構造）
ipcMain.handle('get-firestore-project', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectHierarchical(projectId);
    
    if (result.success) {
      console.log('✅ Firestoreプロジェクト取得成功:', projectId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Firestoreプロジェクト取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト詳細取得（編集用）
ipcMain.handle('get-project-details', async (event, projectId) => {
  try {
    const result = await firebaseService.getProjectHierarchical(projectId);
    
    if (result.success) {
      console.log('✅ プロジェクト詳細取得成功:', projectId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト更新
ipcMain.handle('update-project', async (event, projectId, updatedData) => {
  try {
    console.log('📝 プロジェクト更新開始:', projectId, updatedData);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreでプロジェクトを更新
    const result = await firebaseService.updateProjectHierarchical(projectId, {
      name: updatedData.name,
      description: updatedData.description,
      githubUrl: updatedData.githubUrl,
      category: updatedData.category,
      lastModified: new Date().toISOString()
    });
    
    if (result.success) {
      console.log('✅ プロジェクト更新成功:', projectId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プロジェクト更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// === プラン管理 IPC ハンドラー ===

// プロジェクトのプラン一覧取得
ipcMain.handle('get-project-plans', async (event, projectId) => {
  try {
    console.log('📋 プラン一覧取得:', projectId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreからプラン一覧を取得
    const result = await firebaseService.getProjectPlans(projectId);
    
    if (result.success) {
      console.log(`✅ プラン一覧取得成功: ${result.plans.length}件`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プラン一覧取得エラー:', error);
    return { success: false, error: error.message, plans: [] };
  }
});

// プラン作成
ipcMain.handle('create-plan', async (event, planData) => {
  try {
    console.log('➕ プラン作成:', planData.name);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const currentUser = firebaseService.getCurrentUser();
    const { projectId, ...cleanPlanData } = planData;
    
    const newPlan = {
      ...cleanPlanData,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    // 階層構造対応：projectIdを別パラメータとして渡す
    const result = await firebaseService.createPlan(projectId, newPlan);
    
    if (result.success) {
      console.log('✅ プラン作成成功:', result.id);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プラン作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン更新
ipcMain.handle('update-plan', async (event, planId, updateData) => {
  try {
    console.log('✏️ プラン更新:', planId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const updatedData = {
      ...updateData,
      lastModified: new Date().toISOString()
    };

    const result = await firebaseService.updatePlan(planId, updatedData);
    
    if (result.success) {
      console.log('✅ プラン更新成功:', planId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プラン更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン削除
ipcMain.handle('delete-plan', async (event, planId) => {
  try {
    console.log('🗑️ プラン削除:', planId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const result = await firebaseService.deletePlan(planId);
    
    if (result.success) {
      console.log('✅ プラン削除成功:', planId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プラン削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// === 投稿管理 IPC ハンドラー ===

// プロジェクトの投稿一覧取得（全プランの投稿を含む）
ipcMain.handle('get-project-posts', async (event, projectId) => {
  try {
    console.log('⏰ 投稿一覧取得:', projectId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    // Firestoreからプロジェクトの投稿一覧を取得
    const result = await firebaseService.getProjectPosts(projectId);
    
    if (result.success) {
      console.log(`✅ 投稿一覧取得成功: ${result.posts.length}件`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 投稿一覧取得エラー:', error);
    return { success: false, error: error.message, posts: [] };
  }
});

// 投稿作成
ipcMain.handle('create-post', async (event, postData) => {
  try {
    console.log('📝 投稿作成:', postData.content?.substring(0, 50) + '...');
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const currentUser = firebaseService.getCurrentUser();
    const newPost = {
      ...postData,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const result = await firebaseService.createPost(postData.projectId, postData.planId, newPost);
    
    if (result.success) {
      console.log('✅ 投稿作成成功:', result.id);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 投稿作成エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿更新（階層構造対応）
ipcMain.handle('update-post', async (event, { projectId, planId, postId, updateData }) => {
  try {
    console.log('✏️ 投稿更新:', postId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }
    
    // 必須パラメータチェック
    if (!projectId || !planId || !postId) {
      return { success: false, error: 'プロジェクトID、プランID、投稿IDが必要です' };
    }

    const result = await firebaseService.updatePost(projectId, planId, postId, updateData);
    
    if (result.success) {
      console.log('✅ 投稿更新成功:', postId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 投稿更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿削除（階層構造対応）
ipcMain.handle('delete-post', async (event, { projectId, planId, postId }) => {
  try {
    console.log('🗑️ 投稿削除:', postId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }
    
    // 必須パラメータチェック
    if (!projectId || !planId || !postId) {
      return { success: false, error: 'プロジェクトID、プランID、投稿IDが必要です' };
    }

    const result = await firebaseService.deletePost(projectId, planId, postId);
    
    if (result.success) {
      console.log('✅ 投稿削除成功:', postId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 投稿削除エラー:', error);
    return { success: false, error: error.message };
  }
});

// === 自動投稿管理 IPC ハンドラー ===

// プロジェクトの自動投稿実行
ipcMain.handle('execute-auto-posts-project', async (event, projectId) => {
  try {
    console.log('🤖 プロジェクト自動投稿実行:', projectId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.executeAutoPostsForProject(projectId);
    
    if (result.success) {
      console.log(`✅ プロジェクト自動投稿実行成功: ${result.generated}件生成`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プロジェクト自動投稿実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// 全プロジェクトの自動投稿実行
ipcMain.handle('execute-auto-posts-all', async (event) => {
  try {
    console.log('🌐 全プロジェクト自動投稿実行');
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const result = await firebaseService.executeAutoPostsForAllProjects();
    
    if (result.success) {
      console.log(`✅ 全プロジェクト自動投稿実行成功: ${result.totalGenerated}件生成`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 全プロジェクト自動投稿実行エラー:', error);
    return { success: false, error: error.message };
  }
});

// 次回投稿予定取得
ipcMain.handle('get-upcoming-auto-posts', async (event, projectId) => {
  try {
    console.log('📅 次回投稿予定取得:', projectId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.getUpcomingAutoPosts(projectId);
    
    if (result.success) {
      console.log(`✅ 次回投稿予定取得成功: ${result.upcomingPosts.length}件`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 次回投稿予定取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プランの自動投稿ステータス更新
ipcMain.handle('update-plan-auto-post-status', async (event, { projectId, planId, isActive }) => {
  try {
    console.log('🔄 プラン自動投稿ステータス更新:', planId, isActive);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: 'プロジェクトIDとプランIDが必要です' };
    }

    const result = await firebaseService.updatePlanAutoPostStatus(projectId, planId, isActive);
    
    if (result.success) {
      console.log(`✅ プラン自動投稿ステータス更新成功: ${planId} → ${isActive ? '有効' : '無効'}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ プラン自動投稿ステータス更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// 手動自動投稿生成
ipcMain.handle('generate-manual-auto-post', async (event, { projectId, planId }) => {
  try {
    console.log('🎯 手動自動投稿生成:', projectId, planId);
    
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: 'プロジェクトIDとプランIDが必要です' };
    }

    const result = await firebaseService.generateManualAutoPost(projectId, planId);
    
    if (result.success) {
      console.log('✅ 手動自動投稿生成成功:', result.postId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 手動自動投稿生成エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// 会話記録管理 IPCハンドラー
// ==========================================

// 会話記録を保存
ipcMain.handle('save-conversation', async (event, conversationData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    const { projectId, planId, postId, messages, summary } = conversationData;

    if (!projectId || !planId || !postId || !messages) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.saveConversation(projectId, planId, postId, {
      planId,
      postId,
      messages,
      summary: summary || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ 会話記録保存エラー:', error);
    return { success: false, error: error.message };
  }
});

// 投稿の会話記録を取得
ipcMain.handle('get-post-conversations', async (event, projectId, planId, postId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId || !postId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.getPostConversations(projectId, planId, postId);
    return result;
  } catch (error) {
    console.error('❌ 投稿会話記録取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン全体の会話記録を取得（collectionGroup使用）
ipcMain.handle('get-plan-conversations', async (event, planId, limit = 20) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!planId) {
      return { success: false, error: 'プランIDが必要です' };
    }

    const result = await firebaseService.getPlanConversations(planId, limit);
    return result;
  } catch (error) {
    console.error('❌ プラン会話記録取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// 会話記録を更新
ipcMain.handle('update-conversation', async (event, projectId, planId, postId, conversationId, updateData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId || !postId || !conversationId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.updateConversation(projectId, planId, postId, conversationId, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ 会話記録更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// AI概要生成機能 IPCハンドラー
// ==========================================

// プロジェクトのAI概要を生成
ipcMain.handle('generate-project-ai-summary', async (event, projectId, projectData) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !projectData) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    // AI概要生成プロンプトを構築
    const prompt = `以下のプロジェクト情報を元に、SNS投稿生成に最適化された簡潔で魅力的な概要を作成してください。

プロジェクト名: ${projectData.name}
ユーザー説明: ${projectData.description || '説明なし'}
技術スタック: ${projectData.technologies ? projectData.technologies.join(', ') : '未指定'}
GitHub URL: ${projectData.githubUrl || '未設定'}

要件:
- 100-150文字程度で簡潔に
- SNS投稿での使用を想定
- プロジェクトの価値や特徴を強調
- 技術的すぎず、一般ユーザーにも理解しやすく
- ハッシュタグは含めない

概要:`;

    const result = await aiServiceManager.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.7
    });

    if (result.success) {
      const aiSummary = result.content.trim();

      // プロジェクトにAI概要を保存
      const updateResult = await firebaseService.updateProjectAISummary(projectId, {
        aiSummary: aiSummary,
        summaryHistory: projectData.summaryHistory || [],
        prompt: prompt,
        generatedAt: new Date().toISOString(),
        provider: result.provider
      });

      if (updateResult.success) {
        console.log('✅ AI概要生成・保存成功:', aiSummary.substring(0, 50) + '...');
        return {
          success: true,
          aiSummary: aiSummary,
          provider: result.provider
        };
      } else {
        return { success: false, error: updateResult.error };
      }
    } else {
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('❌ AI概要生成エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクトのAI概要を更新
ipcMain.handle('update-project-ai-summary', async (event, projectId, aiSummary) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !aiSummary) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.updateProjectAISummary(projectId, {
      aiSummary: aiSummary.trim(),
      manuallyEdited: true,
      updatedAt: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error('❌ AI概要更新エラー:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト詳細情報を取得（AI概要含む）
ipcMain.handle('get-project-details-with-ai-summary', async (event, projectId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    const result = await firebaseService.getProjectDetailsWithAISummary(projectId);
    return result;
  } catch (error) {
    console.error('❌ プロジェクト詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// プラン詳細情報を取得
ipcMain.handle('get-plan-details', async (event, projectId, planId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId || !planId) {
      return { success: false, error: '必要なパラメータが不足しています' };
    }

    const result = await firebaseService.getPlanDetails(projectId, planId);
    return result;
  } catch (error) {
    console.error('❌ プラン詳細取得エラー:', error);
    return { success: false, error: error.message };
  }
});

// 会話用の総合的な文脈情報を取得
ipcMain.handle('get-conversation-context', async (event, projectId, planId, postId) => {
  try {
    if (!firebaseService.isLoggedIn()) {
      return { success: false, error: 'ログインが必要です' };
    }

    if (!projectId) {
      return { success: false, error: 'プロジェクトIDが必要です' };
    }

    // プロジェクト情報を取得
    const projectResult = await firebaseService.getProjectDetailsWithAISummary(projectId);
    if (!projectResult.success) {
      return { success: false, error: projectResult.error };
    }

    const context = {
      project: projectResult.project
    };

    // プラン情報を取得（プラン編集時）
    if (planId) {
      const planResult = await firebaseService.getPlanDetails(projectId, planId);
      if (planResult.success) {
        context.plan = planResult.plan;
      }

      // プラン全体の会話履歴を取得
      const conversationsResult = await firebaseService.getPlanConversations(planId, 10);
      if (conversationsResult.success) {
        context.conversationHistory = conversationsResult.conversations;
      }
    }

    // 投稿情報を取得（投稿編集時）
    if (postId && planId) {
      const postResult = await firebaseService.getPost(projectId, planId, postId);
      if (postResult.success) {
        context.post = postResult.post;
      }

      // 投稿の会話履歴を取得
      const postConversationsResult = await firebaseService.getPostConversations(projectId, planId, postId);
      if (postConversationsResult.success) {
        context.postConversations = postConversationsResult.conversations;
      }
    }

    console.log('✅ 会話文脈情報取得成功:', {
      projectId,
      planId: planId || 'なし',
      postId: postId || 'なし',
      hasAISummary: !!context.project?.aiSummary
    });

    return {
      success: true,
      context: context
    };

  } catch (error) {
    console.error('❌ 会話文脈情報取得エラー:', error);
    return { success: false, error: error.message };
  }
});