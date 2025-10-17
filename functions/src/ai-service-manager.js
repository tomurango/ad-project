/**
 * AI Service Manager for Cloud Functions
 * 複数のAIプロバイダーを統一インターフェースで管理 (Cloud Functions版)
 */

const fetch = require('node-fetch');
const admin = require('firebase-admin');

class AIServiceManager {
  constructor() {
    this.currentProvider = 'gemini'; // Cloud FunctionsではGeminiをデフォルト
    this.config = {
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5:0.5b',
        cloudAvailable: false
      },
      openai: {
        apiKey: '', // Firestoreから読み込む
        model: 'gpt-3.5-turbo',
        cloudAvailable: true
      },
      claude: {
        apiKey: '', // Firestoreから読み込む
        model: 'claude-3-haiku-20240307',
        cloudAvailable: true
      },
      gemini: {
        apiKey: '', // Firestoreから読み込む
        model: 'gemini-2.0-flash', // 2.0安定版を使用（2.5はプレビュー）
        cloudAvailable: true
      }
    };
    this.db = admin.firestore();
    this.userConfigs = new Map(); // ユーザー設定キャッシュ
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
   * プロバイダーが設定済みかチェック
   */
  isProviderConfigured(provider) {
    const config = this.config[provider];
    switch (provider) {
      case 'ollama':
        return true; // ローカル環境なので常に利用可能
      case 'openai':
      case 'claude':
      case 'gemini':
        return config.apiKey && config.apiKey.length > 0;
      default:
        return false;
    }
  }

  /**
   * テキスト生成（統一インターフェース）
   */
  async generateText(prompt, options = {}) {
    const provider = options.provider || this.currentProvider;
    
    switch (provider) {
      case 'ollama':
        return this.generateWithOllama(prompt, options);
      case 'openai':
        return this.generateWithOpenAI(prompt, options);
      case 'claude':
        return this.generateWithClaude(prompt, options);
      case 'gemini':
        return this.generateWithGemini(prompt, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Ollama でテキスト生成
   */
  async generateWithOllama(prompt, options = {}) {
    try {
      const config = this.config.ollama;
      const response = await fetch(`${config.baseUrl}/api/generate`, {
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

      const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

      console.log(`🔧 Gemini API呼び出し - Model: ${model}, APIキー: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'なし'}`);

      const response = await fetch(url, {
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

      console.log(`📡 Gemini APIレスポンス - Status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Gemini APIエラーレスポンス: ${errorBody}`);
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      console.log(`📦 Gemini APIレスポンス構造: ${JSON.stringify(data, null, 2)}`);

      // レスポンス構造のチェック
      if (!data.candidates || !data.candidates[0]) {
        console.error('❌ Gemini API: candidates が存在しません');
        throw new Error(`Gemini API: Invalid response structure - ${JSON.stringify(data)}`);
      }

      if (!data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('❌ Gemini API: content.parts が存在しません');
        throw new Error(`Gemini API: Invalid content structure - ${JSON.stringify(data.candidates[0])}`);
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
   * Firestoreからユーザーの AI設定を読み込み
   */
  async loadUserAIConfig(userId) {
    try {
      // キャッシュをチェック
      if (this.userConfigs.has(userId)) {
        console.log(`🔍 ユーザーAI設定をキャッシュから取得: ${userId}`);
        return this.userConfigs.get(userId);
      }

      console.log(`🔍 FirestoreからユーザーAI設定を読み込み: ${userId}`);
      const configRef = this.db.doc(`users/${userId}/settings/aiConfig`);
      const configDoc = await configRef.get();

      if (!configDoc.exists) {
        console.log(`⚠️ ユーザーAI設定が存在しません: ${userId} - デフォルト設定を使用`);

        // デフォルト設定を返す
        const defaultConfig = {
          defaultProvider: 'gemini',
          providers: {
            gemini: {
              enabled: true,
              apiKey: '', // 環境変数を使用
              model: 'gemini-2.0-flash',
              cloudAvailable: true
            }
          }
        };

        this.userConfigs.set(userId, defaultConfig);
        return defaultConfig;
      }

      const userConfig = configDoc.data();
      console.log(`✅ ユーザーAI設定読み込み成功: ${userId}, プロバイダー: ${userConfig.defaultProvider}`);

      // 古いGeminiモデル名を自動修正
      let needsUpdate = false;
      if (userConfig.providers && userConfig.providers.gemini) {
        const oldModel = userConfig.providers.gemini.model;
        const unsupportedModels = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];
        if (unsupportedModels.includes(oldModel)) {
          userConfig.providers.gemini.model = 'gemini-2.0-flash';
          needsUpdate = true;
          console.log(`🔄 Geminiモデルを自動更新: ${oldModel} → gemini-2.0-flash`);
        }
      }

      // 設定が更新された場合はFirestoreに保存
      if (needsUpdate) {
        try {
          await configRef.set(userConfig, { merge: true });
          console.log(`✅ ユーザーAI設定を自動更新: ${userId}`);
        } catch (error) {
          console.error(`❌ ユーザーAI設定自動更新エラー: ${error.message}`);
        }
      }

      // キャッシュに保存
      this.userConfigs.set(userId, userConfig);
      return userConfig;

    } catch (error) {
      console.error(`❌ ユーザーAI設定読み込みエラー (${userId}):`, error);

      // エラー時はデフォルト設定を返す
      const defaultConfig = {
        defaultProvider: 'gemini',
        providers: {
          gemini: {
            enabled: true,
            apiKey: '',
            model: 'gemini-2.5-flash',
            cloudAvailable: true
          }
        }
      };

      return defaultConfig;
    }
  }

  /**
   * Cloud Functions用のプロバイダー選択
   * Ollamaなど、Cloud Functionsでアクセスできないプロバイダーを自動で除外
   */
  selectBestProviderForCloudFunctions(userConfig) {
    const availableProviders = Object.keys(userConfig.providers || {})
      .filter(provider => {
        const config = userConfig.providers[provider];
        // enabledフラグとAPIキーの両方が必要
        const isEnabled = config.enabled === true;
        const hasApiKey = config.apiKey && config.apiKey.length > 0;

        return isEnabled &&
               config.cloudAvailable !== false &&
               provider !== 'ollama' && // Ollamaは除外
               hasApiKey; // APIキー必須
      });

    console.log(`🔍 利用可能なプロバイダー: ${availableProviders.join(', ') || 'なし'}`);

    if (availableProviders.length === 0) {
      throw new Error('利用可能なAIプロバイダーがありません。AI設定でプロバイダーを有効化してください。');
    }

    // デフォルトプロバイダーが利用可能ならそれを使用
    if (availableProviders.includes(userConfig.defaultProvider)) {
      console.log(`✅ デフォルトプロバイダーを使用: ${userConfig.defaultProvider}`);
      return userConfig.defaultProvider;
    }

    // そうでなければ最初の利用可能なプロバイダーを使用
    console.log(`✅ 利用可能なプロバイダーから選択: ${availableProviders[0]}`);
    return availableProviders[0];
  }

  /**
   * ユーザー設定を使用してテキスト生成
   */
  async generateTextWithUserConfig(prompt, options = {}, userId) {
    try {
      console.log(`🤖 ユーザー設定でAI生成開始: ${userId}`);

      // ユーザー設定を読み込み
      const userConfig = await this.loadUserAIConfig(userId);

      // Cloud Functions用の最適なプロバイダーを選択
      const selectedProvider = this.selectBestProviderForCloudFunctions(userConfig);
      console.log(`🎯 選択されたプロバイダー: ${selectedProvider}`);

      // プロバイダー設定を取得
      const providerConfig = userConfig.providers[selectedProvider];

      // 一時的に設定を更新
      const originalProvider = this.currentProvider;
      const originalConfig = { ...this.config };

      this.currentProvider = selectedProvider;

      // ユーザー設定のAPIキーを使用（必須）
      if (providerConfig && providerConfig.apiKey) {
        console.log(`🔑 ユーザー設定のAPIキーを使用: ${selectedProvider}`);
        this.config[selectedProvider] = {
          ...this.config[selectedProvider],
          ...providerConfig
        };
      } else {
        throw new Error(`${selectedProvider}のAPIキーが設定されていません`);
      }

      // AI生成実行
      const result = await this.generateText(prompt, {
        ...options,
        provider: selectedProvider
      });

      // 設定を元に戻す
      this.currentProvider = originalProvider;
      this.config = originalConfig;

      console.log(`${result.success ? '✅' : '❌'} ユーザー設定AI生成結果: ${userId}, ${selectedProvider}, ${result.success ? '成功' : result.error}`);

      return result;

    } catch (error) {
      console.error(`❌ ユーザー設定AI生成エラー (${userId}):`, error);
      return {
        success: false,
        error: error.message,
        provider: 'unknown'
      };
    }
  }

  /**
   * ユーザー設定キャッシュをクリア
   */
  clearUserConfigCache(userId = null) {
    if (userId) {
      this.userConfigs.delete(userId);
      console.log(`🗑️ ユーザー設定キャッシュをクリア: ${userId}`);
    } else {
      this.userConfigs.clear();
      console.log('🗑️ 全ユーザー設定キャッシュをクリア');
    }
  }
}

// シングルトンインスタンス
const aiServiceManager = new AIServiceManager();

module.exports = aiServiceManager;