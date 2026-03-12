// Ollama API連携サービス
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434/api';
    this.currentModel = 'qwen2.5:0.5b';
  }

  // AIでTwitter投稿を生成
  async generateTweet(projectInfo) {
    const prompt = `Twitter投稿を作成してください。

プロジェクト情報：
${projectInfo}

【重要な制限】
- 必ず280文字以内にしてください
- 日本語で書いてください
- 絵文字を2-3個使用してください
- 開発進捗や機能改善をアピールしてください

【出力形式】
ツイート本文のみを1つ出力してください。説明文は不要です。`;

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 100
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.cleanResponse(data.response);
    } catch (error) {
      console.error('Ollama API呼び出しエラー:', error);
      return this.getFallbackTweet(projectInfo);
    }
  }

  // AI相談機能
  async chatWithAI(message, context = '') {
    const prompt = `あなたは広告配信とSNSマーケティングの専門家です。
${context ? `コンテキスト: ${context}` : ''}

ユーザーの質問: ${message}

簡潔で実用的なアドバイスを日本語で回答してください。`;

    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.8,
            max_tokens: 200
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
      }

      const data = await response.json();
      return this.cleanResponse(data.response);
    } catch (error) {
      console.error('AI相談エラー:', error);
      return 'すみません、現在AIサービスに接続できません。しばらく待ってから再試行してください。';
    }
  }

  // developディレクトリからプロジェクト情報を分析
  async analyzeProject(projectName) {
    const developPath = '/Users/tomuraeishi/develop';
    let projectPath;
    
    // プロジェクト名に応じて正しいパスを設定
    switch(projectName) {
      case 'shuumy':
        projectPath = path.join(developPath, 'shuumy_data', 'shuumy');
        break;
      case 'chokushii':
        projectPath = path.join(developPath, 'chokushii', 'chokushii_app');
        break;
      case 'genshin-hensei':
        projectPath = path.join(developPath, 'genshin-hensei');
        break;
      default:
        projectPath = path.join(developPath, projectName);
    }

    try {
      // プロジェクトディレクトリの存在確認
      await fs.access(projectPath);

      const projectInfo = await this.extractProjectInfo(projectPath, projectName);
      return projectInfo;
    } catch (error) {
      console.error(`プロジェクト分析エラー (${projectName}):`, error);
      return `プロジェクト名: ${projectName}
内容: 開発プロジェクト
ステータス: 分析中`;
    }
  }

  // プロジェクト情報を抽出
  async extractProjectInfo(projectPath, projectName) {
    let info = `プロジェクト名: ${projectName}\n`;

    try {
      // README.mdを読み取り
      const readmePath = path.join(projectPath, 'README.md');
      try {
        const readme = await fs.readFile(readmePath, 'utf8');
        const description = this.extractDescription(readme);
        if (description) {
          info += `説明: ${description}\n`;
        }
      } catch (e) {
        // README.mdがない場合はスキップ
      }

      // CLAUDE.mdを読み取り
      const claudePath = path.join(projectPath, 'CLAUDE.md');
      try {
        const claude = await fs.readFile(claudePath, 'utf8');
        const recentUpdate = this.extractRecentUpdate(claude);
        if (recentUpdate) {
          info += `最新情報: ${recentUpdate}\n`;
        }
      } catch (e) {
        // CLAUDE.mdがない場合はスキップ
      }

      // package.jsonを読み取り（技術スタック）
      const packagePath = path.join(projectPath, 'package.json');
      try {
        const packageJson = await fs.readFile(packagePath, 'utf8');
        const pkg = JSON.parse(packageJson);
        if (pkg.description) {
          info += `概要: ${pkg.description}\n`;
        }
        info += `技術: Node.js/JavaScript\n`;
      } catch (e) {
        // pubspec.yamlをチェック（Flutter）
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        try {
          await fs.access(pubspecPath);
          info += `技術: Flutter/Dart\n`;
        } catch (e2) {
          info += `技術: その他\n`;
        }
      }

      return info;
    } catch (error) {
      console.error('プロジェクト情報抽出エラー:', error);
      return info + '詳細情報: 分析中';
    }
  }

  // READMEから説明を抽出
  extractDescription(readme) {
    // 最初の段落を抽出
    const lines = readme.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line && !line.startsWith('#') && !line.startsWith('!') && line.length > 10) {
        return line.substring(0, 100);
      }
    }
    return null;
  }

  // CLAUDE.mdから最新情報を抽出
  extractRecentUpdate(claude) {
    // 「完了」「リリース」「更新」等のキーワードを含む行を探す
    const lines = claude.split('\n');
    for (let line of lines) {
      if (line.includes('完了') || line.includes('リリース') || line.includes('更新') || 
          line.includes('v1.') || line.includes('改善')) {
        return line.replace(/[#\-*]/g, '').trim().substring(0, 80);
      }
    }
    return null;
  }

  // レスポンスをクリーンアップ
  cleanResponse(response) {
    let cleaned = response;
    
    // プロンプトの指示文を削除
    cleaned = cleaned.replace(/【.*?】/g, '');
    cleaned = cleaned.replace(/- 必ず.*?\n/g, '');
    cleaned = cleaned.replace(/- 日本語.*?\n/g, '');
    cleaned = cleaned.replace(/- 絵文字.*?\n/g, '');
    cleaned = cleaned.replace(/- 開発.*?\n/g, '');
    cleaned = cleaned.replace(/ツイート本文.*?\n/g, '');
    cleaned = cleaned.replace(/説明文.*?\n/g, '');
    cleaned = cleaned.replace(/プロジェクト情報：.*?\n/g, '');
    cleaned = cleaned.replace(/Twitter投稿を作成.*?\n/g, '');
    
    // 一般的なクリーンアップ
    cleaned = cleaned
      .replace(/^\s*[\-*]\s*/gm, '') // リストマーカーを削除
      .replace(/^#+\s*/gm, '') // ヘッダーマーカーを削除
      .replace(/\n{3,}/g, '\n\n') // 過度な改行を削除
      .replace(/^\s*\n/gm, '') // 空行を削除
      .trim();
    
    // 280文字制限を強制適用
    if (cleaned.length > 280) {
      cleaned = cleaned.substring(0, 280);
      // 最後の文が途切れないよう、句読点で切る
      const lastPeriod = Math.max(cleaned.lastIndexOf('。'), cleaned.lastIndexOf('！'), cleaned.lastIndexOf('？'));
      if (lastPeriod > 200) {
        cleaned = cleaned.substring(0, lastPeriod + 1);
      }
    }
    
    return cleaned;
  }

  // フォールバック用のツイート生成
  getFallbackTweet(projectInfo) {
    const templates = [
      '開発進捗の共有 📝 新しい機能を追加しました！',
      'プロジェクト更新 🚀 より良いユーザー体験を目指して改善中です',
      '技術的改善 ⚡ パフォーマンスとUIを向上させました'
    ];
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return randomTemplate;
  }

  // 利用可能なモデル一覧を取得
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/tags`);
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('モデル一覧取得エラー:', error);
      return [];
    }
  }

  // モデルを変更
  setModel(modelName) {
    this.currentModel = modelName;
    console.log(`Ollamaモデルを変更: ${modelName}`);
  }

  // プロジェクト説明を生成
  async generateProjectDescription(projectPath) {
    try {
      console.log('🔍 プロジェクト情報抽出開始:', projectPath);
      
      // プロジェクト情報を抽出
      const projectName = path.basename(projectPath);
      let projectInfo = '';
      
      try {
        // README.mdを読み取り
        const readmePath = path.join(projectPath, 'README.md');
        const readme = await fs.readFile(readmePath, 'utf8');
        projectInfo += `README内容の抜粋:\n${readme.substring(0, 500)}\n\n`;
      } catch (e) {
        // README.mdがない場合
      }
      
      try {
        // CLAUDE.mdを読み取り
        const claudePath = path.join(projectPath, 'CLAUDE.md');
        const claude = await fs.readFile(claudePath, 'utf8');
        projectInfo += `開発メモの抜粋:\n${claude.substring(0, 500)}\n\n`;
      } catch (e) {
        // CLAUDE.mdがない場合
      }
      
      try {
        // package.jsonを読み取り
        const packagePath = path.join(projectPath, 'package.json');
        const packageJson = await fs.readFile(packagePath, 'utf8');
        const packageData = JSON.parse(packageJson);
        projectInfo += `プロジェクト設定:\n名前: ${packageData.name}\n説明: ${packageData.description}\n`;
      } catch (e) {
        // package.jsonがない場合
      }

      if (!projectInfo.trim()) {
        projectInfo = `プロジェクト名: ${projectName}\nディレクトリ: ${projectPath}`;
      }

      const prompt = `以下のプロジェクト情報を基に、簡潔で分かりやすいプロジェクト説明を日本語で生成してください。

プロジェクト情報：
${projectInfo}

【要件】
- 1-2文の簡潔な説明にしてください
- 技術的な詳細は避け、プロジェクトの目的や機能を説明してください
- 日本語で出力してください
- 説明文のみを出力し、余計な前置きは不要です`;

      console.log('🤖 AI説明生成リクエスト送信');
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 200
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API エラー: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.response || '';
      
      // 生成されたテキストをクリーンアップ
      const cleanDescription = this.cleanResponse(generatedText);
      
      console.log('✅ AI説明生成完了');
      return {
        success: true,
        description: cleanDescription || 'プロジェクトの詳細な説明を生成できませんでした。'
      };

    } catch (error) {
      console.error('❌ AI説明生成エラー:', error);
      return {
        success: false,
        error: error.message,
        description: 'AI説明生成に失敗しました。手動で説明を入力してください。'
      };
    }
  }

  // Ollamaサービスの状態確認
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OllamaService;