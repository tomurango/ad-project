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
    this.currentProvider = 'ollama'; // デフォルト
    
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
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5:0.5b'
      },
      openai: {
        apiKey: null,
        model: 'gpt-3.5-turbo'
      },
      claude: {
        apiKey: null,
        model: 'claude-3-haiku-20240307'
      },
      gemini: {
        apiKey: null,
        model: 'gemini-1.5-flash'
      }
    };
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
      ollama: 'Ollama',
      openai: 'OpenAI',
      claude: 'Claude',
      gemini: 'Gemini'
    };
    return names[provider] || provider;
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
   * 設定を保存
   */
  saveConfig() {
    // ブラウザ環境のみ
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ai-service-config', JSON.stringify({
        currentProvider: this.currentProvider,
        config: this.config
      }));
    }
  }

  /**
   * 設定を読み込み
   */
  loadConfig() {
    try {
      // ブラウザ環境のみ
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('ai-service-config');
        if (saved) {
          const data = JSON.parse(saved);
          this.currentProvider = data.currentProvider || 'ollama';
          this.config = { ...this.config, ...data.config };
        }
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  }
}

// シングルトンインスタンス
const aiServiceManager = new AIServiceManager();

// 設定を読み込み
aiServiceManager.loadConfig();

// ブラウザ環境ではwindowオブジェクトにも追加
if (typeof window !== 'undefined') {
  window.aiServiceManager = aiServiceManager;
}

module.exports = aiServiceManager;