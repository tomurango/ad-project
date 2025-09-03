/**
 * AI Service Manager for Cloud Functions
 * 複数のAIプロバイダーを統一インターフェースで管理 (Cloud Functions版)
 */

const fetch = require('node-fetch');

class AIServiceManager {
  constructor() {
    this.currentProvider = 'ollama'; // デフォルト
    this.config = {
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'qwen2.5:0.5b'
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo'
      },
      claude: {
        apiKey: process.env.CLAUDE_API_KEY,
        model: 'claude-3-haiku-20240307'
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-pro'
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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${options.model || config.model}:generateContent?key=${config.apiKey}`, {
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
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
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
}

// シングルトンインスタンス
const aiServiceManager = new AIServiceManager();

module.exports = aiServiceManager;