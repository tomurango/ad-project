/**
 * AI Service Manager
 * 複数のAIプロバイダーを統一インターフェースで管理
 */

// Node.js環境でのhttps代替実装
const makeRequest = async (url, options) => {
  if (typeof fetch !== 'undefined') {
    return await fetch(url, options);
  }
  
  // HTTPSモジュールを使った代替実装
  const https = require('https');
  const http = require('http');
  const urlParse = require('url').parse;
  
  return new Promise((resolve, reject) => {
    const parsedUrl = urlParse(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
};

class AIServiceManager {
  constructor() {
    this.currentProvider = 'gemini'; // Firestore対応のためデフォルトをGeminiに変更
    this.firebaseService = null;
    this.isFirestoreEnabled = false;
    this.userId = null;

    // Node.js環境でのfetch対応
    if (typeof fetch === 'undefined') {
      try {
        global.fetch = require('node-fetch');
      } catch (error) {
        // node-fetchがない場合はhttpsを使用
        this.useHttps = true;
      }
    }

    this.config = {
      gemini: {
        apiKey: '',
        model: 'gemini-2.0-flash',
        enabled: false,
        cloudAvailable: true
      },
      openai: {
        apiKey: '',
        model: 'gpt-3.5-turbo',
        enabled: false,
        cloudAvailable: true
      },
      claude: {
        apiKey: '',
        model: 'claude-3-haiku-20240307',
        enabled: false,
        cloudAvailable: true
      }
    };

    // ブラウザ環境でFirestore初期化
    if (typeof window !== 'undefined') {
      this.initializeFirestore();
    }
  }

  /**
   * AIプロバイダーを設定
   */
  setProvider(provider) {
    if (!this.config[provider]) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
    this.currentProvider = provider;
  }

  /**
   * 現在のプロバイダーを取得
   */
  getCurrentProvider() {
    return this.currentProvider;
  }

  /**
   * プロバイダー設定を更新
   */
  updateConfig(provider, config) {
    if (!this.config[provider]) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
    this.config[provider] = { ...this.config[provider], ...config };
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  getAvailableProviders() {
    return Object.keys(this.config).map(provider => ({
      id: provider,
      name: this.getProviderDisplayName(provider),
      configured: this.isProviderConfigured(provider)
    }));
  }

  /**
   * プロバイダーの表示名を取得
   */
  getProviderDisplayName(provider) {
    const names = {
      gemini: 'Gemini',
      openai: 'OpenAI',
      claude: 'Claude'
    };
    return names[provider] || provider;
  }

  /**
   * プロバイダーが設定済みかチェック
   */
  isProviderConfigured(provider) {
    const config = this.config[provider];
    if (!config) return false;
    return config.apiKey && config.apiKey.length > 0;
  }

  /**
   * テキスト生成（統一インターフェース）
   */
  async generateText(prompt, options = {}) {
    const provider = options.provider || this.currentProvider;

    switch (provider) {
      case 'gemini':
        return this.generateWithGemini(prompt, options);
      case 'openai':
        return this.generateWithOpenAI(prompt, options);
      case 'claude':
        return this.generateWithClaude(prompt, options);
      default:
        return {
          success: false,
          error: `未対応のAIプロバイダーです: ${provider}`,
          provider: provider
        };
    }
  }

  /**
   * Ollama でテキスト生成
   */
  async generateWithOllama(prompt, options = {}) {
    try {
      const config = this.config.ollama;
      const response = await makeRequest(`${config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || config.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.response,
        provider: 'ollama',
        model: options.model || config.model
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'ollama'
      };
    }
  }

  /**
   * OpenAI でテキスト生成
   */
  async generateWithOpenAI(prompt, options = {}) {
    try {
      const config = this.config.openai;
      if (!config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await makeRequest('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices[0].message.content,
        provider: 'openai',
        model: options.model || config.model
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'openai'
      };
    }
  }

  /**
   * Claude でテキスト生成
   */
  async generateWithClaude(prompt, options = {}) {
    try {
      const config = this.config.claude;
      if (!config.apiKey) {
        throw new Error('Claude API key not configured');
      }

      const response = await makeRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || config.model,
          max_tokens: options.maxTokens || 1000,
          messages: [{ role: 'user', content: prompt }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content[0].text,
        provider: 'claude',
        model: options.model || config.model
      };
    } catch (error) {
      console.error('Claude generation error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'claude'
      };
    }
  }

  /**
   * Gemini でテキスト生成
   */
  async generateWithGemini(prompt, options = {}) {
    try {
      const config = this.config.gemini;
      if (!config.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      const model = options.model || config.model;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      
      console.log(`🔧 Gemini API Request - Model: ${model}, URL: ${apiUrl.replace(/key=.*/g, 'key=[HIDDEN]')}`);
      
      const response = await makeRequest(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 1000
          }
        }),
      });

      if (!response.ok) {
        let errorMessage = `Gemini API error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage += ` - ${errorData.error.message}`;
          }
        } catch (e) {
          // エラーレスポンスのパースに失敗した場合は無視
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // レスポンス構造をチェック
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('Unexpected Gemini API response structure:', JSON.stringify(data, null, 2));
        throw new Error('Unexpected Gemini API response structure');
      }
      return {
        success: true,
        content: data.candidates[0].content.parts[0].text,
        provider: 'gemini',
        model: options.model || config.model
      };
    } catch (error) {
      console.error('Gemini generation error:', error);
      return {
        success: false,
        error: error.message,
        provider: 'gemini'
      };
    }
  }

  /**
   * Firestore初期化
   */
  async initializeFirestore() {
    try {

      // Electron環境でのFirebaseサービスチェック
      const fbService = (typeof firebaseService !== 'undefined' && firebaseService) ||
                       (typeof window !== 'undefined' && window.firebaseService);

      // Electron環境の場合は window.electronAPI 経由でFirestore使用
      const hasElectronAPI = typeof window !== 'undefined' && window.electronAPI;

      if (fbService) {
        this.firebaseService = fbService;
        this.isFirestoreEnabled = true;

        // ユーザーがログインしているかチェック
        if (fbService.currentUser) {
          this.userId = fbService.currentUser.uid;

          // Firestoreから読み込み
          await this.loadConfigFromFirestore();
        } else {
          // ログインしていない場合でもFirestore優先設定を保持
          // デフォルト設定のまま（Gemini有効）
        }
      } else if (hasElectronAPI) {
        // Electron環境：electronAPI経由でFirestore使用
        this.firebaseService = { electronAPI: window.electronAPI };
        this.isFirestoreEnabled = true;
        // Electron環境ではユーザー情報は別途管理される
      } else {
        console.log('⚠️ AIServiceManager: Firestore無効 - LocalStorageフォールバック');
        this.loadConfigFromLocalStorage();
      }
    } catch (error) {
      console.error('❌ Firestore初期化エラー:', error);
      this.loadConfigFromLocalStorage();
    }
  }

  /**
   * ユーザーログイン時の設定更新
   */
  async onUserLogin(userId) {
    this.userId = userId;

    if (this.isFirestoreEnabled) {
      // Firestoreから読み込み
      const configLoaded = await this.loadConfigFromFirestore();

      // 設定が存在しない場合は初期設定を作成
      if (!configLoaded) {
        await this.createDefaultAIConfig();
      }

      // UIを更新
      this.updateProviderSelect();
    }
  }

  /**
   * ユーザーログアウト時の設定クリア
   */
  onUserLogout() {
    this.userId = null;
    // デフォルト設定にリセット
    this.currentProvider = 'gemini';
    this.config = {
      gemini: { apiKey: '', model: 'gemini-2.0-flash', enabled: false, cloudAvailable: true },
      openai: { apiKey: '', model: 'gpt-3.5-turbo', enabled: false, cloudAvailable: true },
      claude: { apiKey: '', model: 'claude-3-haiku-20240307', enabled: false, cloudAvailable: true }
    };
  }

  /**
   * プロバイダー選択UIを更新
   */
  updateProviderSelect() {
    const selectElement = document.getElementById('ai-provider-select');
    if (selectElement) {
      selectElement.value = this.currentProvider;
    }
  }

  /**
   * 新規ユーザーのデフォルトAI設定を作成
   */
  async createDefaultAIConfig() {
    if (!this.isFirestoreEnabled || !this.userId) {
      return;
    }

    const defaultConfig = {
      defaultProvider: 'gemini',
      providers: {
        gemini: {
          apiKey: '',
          model: 'gemini-2.0-flash',
          enabled: false, // APIキー未設定なのでfalse
          cloudAvailable: true
        },
        openai: {
          apiKey: '',
          model: 'gpt-3.5-turbo',
          enabled: false,
          cloudAvailable: true
        },
        claude: {
          apiKey: '',
          model: 'claude-3-haiku-20240307',
          enabled: false,
          cloudAvailable: true
        }
      },
      createdAt: new Date().toISOString()
    };

    try {
      // Electron環境の場合はelectronAPI経由
      if (this.firebaseService.electronAPI) {
        await this.firebaseService.electronAPI.invoke('save-user-ai-config', {
          userId: this.userId,
          config: defaultConfig
        });
      } else {
        // 直接Firebase使用
        await this.firebaseService.saveUserAIConfig(this.userId, defaultConfig);
      }

      console.log('✅ デフォルトAI設定を作成しました');

      // ローカル設定も更新
      this.currentProvider = defaultConfig.defaultProvider;
      this.config = { ...this.config, ...defaultConfig.providers };
    } catch (error) {
      console.error('❌ デフォルトAI設定作成エラー:', error);
    }
  }


  /**
   * Firestoreから設定読み込み
   */
  async loadConfigFromFirestore() {
    if (!this.isFirestoreEnabled || !this.userId || !this.firebaseService) {
      this.loadConfigFromLocalStorage();
      return false;
    }

    try {
      let result;

      // Electron環境の場合はelectronAPI経由
      if (this.firebaseService.electronAPI) {
        result = await this.firebaseService.electronAPI.invoke('load-user-ai-config', {
          userId: this.userId
        });
      } else {
        // 直接Firebase使用
        result = await this.firebaseService.loadUserAIConfig(this.userId);
      }

      if (result.success && result.config) {
        this.currentProvider = result.config.defaultProvider || 'gemini';

        // 設定をマージ
        const loadedConfig = result.config.providers;

        // Ollamaを除外（サポート終了）
        if (loadedConfig.ollama) {
          delete loadedConfig.ollama;
          console.log('🔄 Ollama設定を削除しました（サポート終了）');
        }

        // 古いGeminiモデル名を自動アップグレード
        let needsUpdate = false;
        if (loadedConfig.gemini) {
          const oldModel = loadedConfig.gemini.model;
          const unsupportedModels = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];
          if (unsupportedModels.includes(oldModel)) {
            loadedConfig.gemini.model = 'gemini-2.0-flash';
            needsUpdate = true;
            console.log(`🔄 Geminiモデルを自動更新: ${oldModel} → gemini-2.0-flash`);
          }
        }

        this.config = { ...this.config, ...loadedConfig };

        // 設定が更新された場合はFirestoreに保存
        if (needsUpdate) {
          await this.saveConfigToFirestore();
        }

        return true; // 設定が存在した
      }
      return false; // 設定が存在しなかった
    } catch (error) {
      console.error('❌ Firestore読み込みエラー:', error);
      this.loadConfigFromLocalStorage();
      return false;
    }
  }

  /**
   * 統一設定保存メソッド
   */
  async saveConfig() {
    if (this.isFirestoreEnabled && this.userId) {
      await this.saveConfigToFirestore();
    } else {
      this.saveConfigToLocalStorage();
    }
  }

  /**
   * Firestoreに設定保存
   */
  async saveConfigToFirestore() {
    if (!this.isFirestoreEnabled || !this.userId || !this.firebaseService) {
      console.log('⚠️ Firestore無効 - LocalStorageに保存');
      return this.saveConfigToLocalStorage();
    }

    try {
      const firestoreConfig = {
        defaultProvider: this.currentProvider,
        providers: this.config
      };

      // Electron環境の場合はelectronAPI経由
      if (this.firebaseService.electronAPI) {
        const result = await this.firebaseService.electronAPI.invoke('save-user-ai-config', {
          userId: this.userId,
          config: firestoreConfig
        });
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        // 直接Firebase使用
        const result = await this.firebaseService.saveUserAIConfig(this.userId, firestoreConfig);
        if (!result.success) {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('❌ Firestore保存エラー:', error);
      // フォールバック: LocalStorageに保存
      this.saveConfigToLocalStorage();
    }
  }

  /**
   * LocalStorage保存（フォールバック）
   */
  saveConfigToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ai-service-config', JSON.stringify({
        currentProvider: this.currentProvider,
        config: this.config
      }));
    }
  }

  /**
   * LocalStorage読み込み（フォールバック）
   */
  loadConfigFromLocalStorage() {
    try {
      // ブラウザ環境のみ
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('ai-service-config');
        if (saved) {
          const data = JSON.parse(saved);
          this.currentProvider = data.currentProvider || 'gemini';
          this.config = { ...this.config, ...data.config };
        }
      }
    } catch (error) {
      console.error('❌ LocalStorage読み込みエラー:', error);
    }
  }
}

// シングルトンインスタンス
const aiServiceManager = new AIServiceManager();

// Firestore初期化（ブラウザ環境でのみ実行）
if (typeof window !== 'undefined') {
  aiServiceManager.initializeFirestore();
}

// ブラウザ環境ではwindowオブジェクトにも追加
if (typeof window !== 'undefined') {
  window.aiServiceManager = aiServiceManager;
}

module.exports = aiServiceManager;