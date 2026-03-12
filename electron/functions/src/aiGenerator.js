const fetch = require("node-fetch");
const functions = require("firebase-functions");

// Ollama API のエンドポイント（環境変数で設定可能）
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/**
 * Ollama API を使用してツイート内容を生成
 * @param {Object} project プロジェクト情報
 * @return {Promise<string>} 生成されたツイート内容
 */
async function generateTweetContent(project) {
  try {
    console.log(`AI生成開始: ${project.name}`);
    
    // プロンプトを構築
    const prompt = createTweetPrompt(project);
    
    // Ollama API に送信
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5:0.5b",
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 100,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API エラー: ${response.statusText}`);
    }
    
    const data = await response.json();
    const generatedText = data.response || "";
    
    // 生成結果をクリーンアップ
    const cleanedText = cleanupGeneratedText(generatedText, project);
    
    console.log(`AI生成完了: ${project.name} (${cleanedText.length}文字)`);
    
    return cleanedText;
    
  } catch (error) {
    console.error(`AI生成エラー (${project.name}):`, error);
    
    // フォールバック: 手動テンプレート
    return generateFallbackTweet(project);
  }
}

/**
 * ツイート生成用のプロンプトを作成
 * @param {Object} project
 * @return {string}
 */
function createTweetPrompt(project) {
  const today = new Date().toLocaleDateString("ja-JP");
  
  return `次の情報を基に、Twitter投稿用の文章を280文字以内で作成してください：

プロジェクト名: ${project.name}
カテゴリ: ${project.category}
技術スタック: ${project.tech || ""}
説明: ${project.description}

要件:
- 280文字以内厳守
- 自然な日本語
- 開発者向けの内容
- ハッシュタグを2-3個含める
- 今日の日付: ${today}

例:
「${project.name}の開発が順調に進んでいます！${project.tech}を使って${project.category}アプリを作成中。今日は新機能の実装に取り組みました。 #開発日記 #${project.tech} #プログラミング」

上記の例を参考に、${project.name}について同じ形式で投稿文を作成してください。`;
}

/**
 * 生成されたテキストをクリーンアップ
 * @param {string} text
 * @param {Object} project
 * @return {string}
 */
function cleanupGeneratedText(text, project) {
  if (!text) return generateFallbackTweet(project);
  
  // 不要な前置きを削除
  let cleaned = text.trim();
  
  // プロンプトの指示文を削除
  cleaned = cleaned.replace(/^.*?以下.*?：\s*/s, "");
  cleaned = cleaned.replace(/^.*?条件.*?：\s*/s, "");
  cleaned = cleaned.replace(/^.*?要件.*?：\s*/s, "");
  cleaned = cleaned.replace(/^.*?例.*?：\s*/s, "");
  
  // 引用符を削除
  cleaned = cleaned.replace(/^[「"』]/, "").replace(/[」"』]$/, "");
  
  // テンプレート表現を置換
  cleaned = cleaned.replace(/\[.*?\]/g, "");
  cleaned = cleaned.replace(/\[主要タスク\]/g, "基本機能");
  cleaned = cleaned.replace(/\[簡単操作\]/g, "直感的な操作");
  
  // 改行や余分な空白を整理
  cleaned = cleaned.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  
  // 280文字制限
  if (cleaned.length > 280) {
    cleaned = cleaned.substring(0, 277) + "...";
  }
  
  // 最小文字数チェック
  if (cleaned.length < 20) {
    return generateFallbackTweet(project);
  }
  
  return cleaned;
}

/**
 * フォールバックツイートを生成
 * @param {Object} project
 * @return {string}
 */
function generateFallbackTweet(project) {
  const templates = [
    `${project.name}の開発進捗をお知らせします！${project.tech ? project.tech + "を使って" : ""}${project.category}アプリを作成中です。 #開発日記 #プログラミング`,
    
    `今日も${project.name}の開発に取り組みました。${project.description || "機能改善"}を進めています。 #開発 #${project.category}`,
    
    `${project.name}プロジェクトの更新です。${project.tech ? project.tech + "での" : ""}開発が順調に進んでいます！ #開発ログ #エンジニア`,
  ];
  
  // ランダムにテンプレートを選択
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // 280文字制限
  return template.length > 280 ? template.substring(0, 277) + "..." : template;
}

/**
 * Ollama の健康状態をチェック
 * @return {Promise<boolean>}
 */
async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    
    return response.ok;
  } catch (error) {
    console.error("Ollama 健康チェック失敗:", error);
    return false;
  }
}

module.exports = {
  generateTweetContent,
  checkOllamaHealth,
};