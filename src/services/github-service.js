/**
 * GitHub Service
 * GitHubリポジトリから開発情報を取得してAI投稿生成に利用
 */

// Node.js環境でのhttps代替実装
const makeHttpsRequest = async (url, options) => {
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

class GitHubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    
    // Node.js環境でのfetch対応（AI Service Managerから流用）
    if (typeof fetch === 'undefined') {
      try {
        global.fetch = require('node-fetch');
      } catch (error) {
        this.useHttps = true;
      }
    }
  }

  /**
   * リポジトリURLからオーナー名とリポジトリ名を抽出
   * @param {string} repoUrl - GitHubリポジトリURL
   * @returns {Object} {owner, repo} または null
   */
  parseRepoUrl(repoUrl) {
    if (!repoUrl) return null;
    
    // GitHub URL形式をパース
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
    }
    
    return null;
  }

  /**
   * GitHub APIにリクエストを送信
   * @param {string} endpoint - APIエンドポイント
   * @param {string} token - Personal Access Token (オプション)
   * @returns {Object} APIレスポンス
   */
  async makeRequest(endpoint, token = null) {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ad-project-app'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await makeHttpsRequest(`${this.baseUrl}${endpoint}`, { headers });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('GitHub API request failed:', error);
      throw error;
    }
  }

  /**
   * 最新コミット情報を取得
   * @param {string} owner - リポジトリオーナー
   * @param {string} repo - リポジトリ名
   * @param {string} token - Personal Access Token (オプション)
   * @returns {Array} 最新のコミット情報（最大5件）
   */
  async getLatestCommits(owner, repo, token = null) {
    try {
      const commits = await this.makeRequest(`/repos/${owner}/${repo}/commits?per_page=5`, token);
      
      return commits.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0], // 1行目のみ
        author: commit.commit.author.name,
        date: new Date(commit.commit.author.date).toLocaleDateString('ja-JP'),
        url: commit.html_url
      }));
    } catch (error) {
      console.error('Failed to fetch commits:', error);
      return [];
    }
  }

  /**
   * ファイル内容を取得
   * @param {string} owner - リポジトリオーナー
   * @param {string} repo - リポジトリ名
   * @param {string} path - ファイルパス
   * @param {string} token - Personal Access Token (オプション)
   * @returns {string} ファイル内容
   */
  async getFileContent(owner, repo, path, token = null) {
    try {
      const file = await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`, token);
      
      if (file.content) {
        // Base64デコード（Node.js/ブラウザ対応）
        let content;
        if (typeof atob !== 'undefined') {
          // ブラウザ環境
          content = atob(file.content.replace(/\s/g, ''));
        } else {
          // Node.js環境
          content = Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8');
        }
        return content;
      }
      
      return '';
    } catch (error) {
      console.error(`Failed to fetch file content (${path}):`, error);
      return '';
    }
  }

  /**
   * リポジトリ情報を取得
   * @param {string} owner - リポジトリオーナー
   * @param {string} repo - リポジトリ名
   * @param {string} token - Personal Access Token (オプション)
   * @returns {Object} リポジトリ情報
   */
  async getRepositoryInfo(owner, repo, token = null) {
    try {
      const repoInfo = await this.makeRequest(`/repos/${owner}/${repo}`, token);
      
      return {
        name: repoInfo.name,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        topics: repoInfo.topics || [],
        created: new Date(repoInfo.created_at).toLocaleDateString('ja-JP'),
        updated: new Date(repoInfo.updated_at).toLocaleDateString('ja-JP')
      };
    } catch (error) {
      console.error('Failed to fetch repository info:', error);
      return null;
    }
  }

  /**
   * プロジェクト用のGitHub情報を包括的に取得
   * @param {string} repoUrl - GitHubリポジトリURL
   * @param {string} token - Personal Access Token (オプション)
   * @returns {Object} 投稿生成用のGitHub情報
   */
  async getProjectData(repoUrl, token = null) {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error('Invalid GitHub repository URL');
    }

    const { owner, repo } = parsed;
    
    console.log(`📊 GitHub情報取得開始: ${owner}/${repo}`);

    try {
      // 並行して情報を取得
      const [repoInfo, commits, readme, claudeMd] = await Promise.all([
        this.getRepositoryInfo(owner, repo, token),
        this.getLatestCommits(owner, repo, token),
        this.getFileContent(owner, repo, 'README.md', token),
        this.getFileContent(owner, repo, 'CLAUDE.md', token)
      ]);

      const result = {
        repository: repoInfo,
        commits: commits,
        readme: readme ? this.truncateText(readme, 500) : '',
        claudeMd: claudeMd ? this.truncateText(claudeMd, 800) : '',
        lastUpdated: new Date().toISOString()
      };

      console.log(`✅ GitHub情報取得完了: コミット${commits.length}件, README${readme ? 'あり' : 'なし'}, CLAUDE.md${claudeMd ? 'あり' : 'なし'}`);
      
      return result;
    } catch (error) {
      console.error('Failed to fetch GitHub project data:', error);
      throw error;
    }
  }

  /**
   * テキストを指定文字数で切り詰め
   * @param {string} text - 元のテキスト
   * @param {number} maxLength - 最大文字数
   * @returns {string} 切り詰められたテキスト
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * GitHub情報をプロンプト用テキストに変換
   * @param {Object} githubData - getProjectDataの戻り値
   * @returns {string} プロンプト用テキスト
   */
  formatForPrompt(githubData) {
    if (!githubData) return '';

    let prompt = '\n--- 実際の開発情報（GitHub） ---\n';
    
    // リポジトリ情報
    if (githubData.repository) {
      const repo = githubData.repository;
      prompt += `リポジトリ: ${repo.name}\n`;
      if (repo.description) prompt += `説明: ${repo.description}\n`;
      if (repo.language) prompt += `主要言語: ${repo.language}\n`;
      prompt += `最終更新: ${repo.updated}\n\n`;
    }

    // 最新コミット
    if (githubData.commits && githubData.commits.length > 0) {
      prompt += '最近のコミット:\n';
      githubData.commits.slice(0, 3).forEach((commit, index) => {
        prompt += `${index + 1}. ${commit.message} (${commit.date})\n`;
      });
      prompt += '\n';
    }

    // README情報
    if (githubData.readme) {
      prompt += 'README概要:\n';
      prompt += githubData.readme + '\n\n';
    }

    // CLAUDE.md情報
    if (githubData.claudeMd) {
      prompt += '開発状況(CLAUDE.md):\n';
      prompt += githubData.claudeMd + '\n\n';
    }

    return prompt;
  }
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubService;
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.GitHubService = GitHubService;
}