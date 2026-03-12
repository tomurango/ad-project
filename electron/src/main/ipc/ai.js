/**
 * AI関連 IPCハンドラー
 *
 * AI生成、Ollama、AI設定管理のIPC通信を処理
 */

const { ipcMain } = require('electron');

// サービスの初期化は後で設定される
let ollamaService = null;
let aiServiceManager = null;
let firebaseService = null;

/**
 * サービスを初期化する
 * main.jsから呼び出される
 */
function initializeServices(services) {
  ollamaService = services.ollamaService;
  aiServiceManager = services.aiServiceManager;
  firebaseService = services.firebaseService;
}

// ==========================================
// AI Service Manager Handlers
// ==========================================

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

// ==========================================
// Ollama Service Handlers
// ==========================================

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

// ==========================================
// AI Configuration Handlers
// ==========================================

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

module.exports = {
  initializeServices
};
