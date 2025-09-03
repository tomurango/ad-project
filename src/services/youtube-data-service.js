// YouTube Data API v3 サービス管理クラス
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * YouTube Data API v3統合サービス
 * チャンネル・動画分析、パフォーマンス追跡
 */
class YouTubeDataService {
  constructor() {
    this.apiKey = null;
    this.isConfigured = false;
    this.quotaUsed = 0;
    this.dailyQuotaLimit = 10000; // units per day
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.configFilePath = path.join(__dirname, 'youtube-data-config-encrypted.json');
  }

  /**
   * 暗号化キーを取得または生成
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, '.youtube-data-key');
    try {
      const key = require('fs').readFileSync(keyPath, 'utf8');
      return key;
    } catch (error) {
      // キーが存在しない場合は新しく生成
      const newKey = crypto.randomBytes(32).toString('hex');
      require('fs').writeFileSync(keyPath, newKey, 'utf8');
      return newKey;
    }
  }

  /**
   * データを暗号化
   */
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  /**
   * データを復号化
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * YouTube Data API認証情報を設定
   */
  async setCredentials(credentials) {
    try {
      const { apiKey } = credentials;
      
      if (!apiKey) {
        throw new Error('YouTube Data API Keyが必要です');
      }

      // 認証情報を暗号化して保存
      const encryptedConfig = {
        apiKey: this.encrypt(apiKey),
        configuredAt: new Date().toISOString()
      };

      await fs.writeFile(this.configFilePath, JSON.stringify(encryptedConfig, null, 2), 'utf8');

      // メモリに保存
      this.apiKey = apiKey;
      this.isConfigured = true;

      console.log('✅ YouTube Data API認証情報を設定・保存しました');
      return { success: true, message: 'YouTube Data API認証情報を保存しました' };

    } catch (error) {
      console.error('❌ YouTube Data API認証情報設定エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存されているYouTube Data API認証情報を読み込み
   */
  async loadCredentials() {
    try {
      const configData = await fs.readFile(this.configFilePath, 'utf8');
      const encryptedConfig = JSON.parse(configData);

      // 復号化
      this.apiKey = this.decrypt(encryptedConfig.apiKey);
      this.isConfigured = true;

      console.log('✅ YouTube Data API認証情報を読み込みました');
      return { success: true, message: 'YouTube Data API認証情報を読み込みました' };

    } catch (error) {
      console.log('ℹ️ YouTube Data API認証情報が未設定です');
      return { success: false, error: 'YouTube Data API認証情報が未設定です' };
    }
  }

  /**
   * 設定状況を確認
   */
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      hasApiKey: !!this.apiKey,
      quotaUsed: this.quotaUsed,
      quotaRemaining: this.dailyQuotaLimit - this.quotaUsed,
      quotaPercentUsed: Math.round((this.quotaUsed / this.dailyQuotaLimit) * 100)
    };
  }

  /**
   * YouTube Data API認証情報をクリア
   */
  async clearCredentials() {
    try {
      // ファイルを削除
      await fs.unlink(this.configFilePath);
      
      // メモリをクリア
      this.apiKey = null;
      this.isConfigured = false;

      console.log('✅ YouTube Data API認証情報をクリアしました');
      return { success: true, message: 'YouTube Data API認証情報をクリアしました' };

    } catch (error) {
      console.error('❌ YouTube Data API認証情報クリアエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * YouTube Data APIへのリクエスト実行
   */
  async makeAPIRequest(endpoint, params = {}, quotaCost = 1) {
    try {
      if (!this.isConfigured) {
        throw new Error('YouTube Data API認証情報が設定されていません');
      }

      // クォータ制限チェック
      if (this.quotaUsed + quotaCost > this.dailyQuotaLimit) {
        throw new Error('YouTube Data APIの日次クォータ制限に達しています');
      }

      const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
      url.searchParams.set('key', this.apiKey);

      // パラメータを追加
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.set(key, value);
        }
      });

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`YouTube Data API エラー: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // クォータ使用量を更新
      this.quotaUsed += quotaCost;
      
      return { success: true, data: data };

    } catch (error) {
      console.error('❌ YouTube Data API リクエストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * チャンネル情報を取得
   */
  async getChannelInfo(channelId) {
    try {
      const result = await this.makeAPIRequest('channels', {
        part: 'snippet,statistics,brandingSettings',
        id: channelId
      }, 1);

      if (result.success && result.data.items && result.data.items.length > 0) {
        const channel = result.data.items[0];
        const channelInfo = {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          publishedAt: channel.snippet.publishedAt,
          thumbnails: channel.snippet.thumbnails,
          statistics: {
            viewCount: parseInt(channel.statistics.viewCount || 0),
            subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
            videoCount: parseInt(channel.statistics.videoCount || 0)
          },
          branding: channel.brandingSettings
        };

        console.log('✅ チャンネル情報取得成功:', channelInfo.title);
        return { success: true, data: channelInfo };
      } else {
        throw new Error('チャンネルが見つかりません');
      }

    } catch (error) {
      console.error('❌ チャンネル情報取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 動画情報を取得
   */
  async getVideoInfo(videoIds) {
    try {
      const ids = Array.isArray(videoIds) ? videoIds.join(',') : videoIds;
      
      const result = await this.makeAPIRequest('videos', {
        part: 'snippet,statistics,contentDetails',
        id: ids
      }, 1);

      if (result.success && result.data.items) {
        const videos = result.data.items.map(video => ({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          publishedAt: video.snippet.publishedAt,
          channelId: video.snippet.channelId,
          channelTitle: video.snippet.channelTitle,
          thumbnails: video.snippet.thumbnails,
          duration: video.contentDetails.duration,
          statistics: {
            viewCount: parseInt(video.statistics.viewCount || 0),
            likeCount: parseInt(video.statistics.likeCount || 0),
            commentCount: parseInt(video.statistics.commentCount || 0)
          }
        }));

        console.log(`✅ 動画情報取得成功: ${videos.length}件`);
        return { success: true, data: videos };
      } else {
        throw new Error('動画が見つかりません');
      }

    } catch (error) {
      console.error('❌ 動画情報取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * チャンネルの動画一覧を取得
   */
  async getChannelVideos(channelId, maxResults = 25) {
    try {
      const result = await this.makeAPIRequest('search', {
        part: 'snippet',
        channelId: channelId,
        maxResults: maxResults,
        order: 'date',
        type: 'video'
      }, 100);

      if (result.success && result.data.items) {
        const videoIds = result.data.items.map(item => item.id.videoId);
        
        // 詳細情報を取得
        const detailsResult = await this.getVideoInfo(videoIds);
        
        if (detailsResult.success) {
          console.log(`✅ チャンネル動画一覧取得成功: ${detailsResult.data.length}件`);
          return { success: true, data: detailsResult.data };
        } else {
          throw new Error(detailsResult.error);
        }
      } else {
        throw new Error('動画一覧を取得できませんでした');
      }

    } catch (error) {
      console.error('❌ チャンネル動画一覧取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 動画を検索
   */
  async searchVideos(query, maxResults = 25, options = {}) {
    try {
      const searchParams = {
        part: 'snippet',
        q: query,
        maxResults: maxResults,
        order: options.order || 'relevance',
        type: 'video',
        ...options
      };

      const result = await this.makeAPIRequest('search', searchParams, 100);

      if (result.success && result.data.items) {
        const videoIds = result.data.items.map(item => item.id.videoId);
        
        // 詳細情報を取得
        const detailsResult = await this.getVideoInfo(videoIds);
        
        if (detailsResult.success) {
          console.log(`✅ 動画検索成功: ${detailsResult.data.length}件`);
          return { success: true, data: detailsResult.data };
        } else {
          throw new Error(detailsResult.error);
        }
      } else {
        throw new Error('動画検索に失敗しました');
      }

    } catch (error) {
      console.error('❌ 動画検索エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * チャンネルの分析データを生成
   */
  async analyzeChannel(channelId) {
    try {
      console.log('📊 チャンネル分析開始:', channelId);
      
      // チャンネル基本情報を取得
      const channelResult = await this.getChannelInfo(channelId);
      if (!channelResult.success) {
        throw new Error(channelResult.error);
      }

      // 最新動画を取得
      const videosResult = await this.getChannelVideos(channelId, 10);
      if (!videosResult.success) {
        throw new Error(videosResult.error);
      }

      const channelInfo = channelResult.data;
      const videos = videosResult.data;

      // 分析データを計算
      const totalViews = videos.reduce((sum, video) => sum + video.statistics.viewCount, 0);
      const totalLikes = videos.reduce((sum, video) => sum + video.statistics.likeCount, 0);
      const totalComments = videos.reduce((sum, video) => sum + video.statistics.commentCount, 0);
      
      const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
      const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
      const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;

      const analysis = {
        channel: channelInfo,
        recentVideos: videos,
        analytics: {
          totalVideosAnalyzed: videos.length,
          averageViews: avgViews,
          averageLikes: avgLikes,
          averageComments: avgComments,
          engagementRate: avgViews > 0 ? Math.round((avgLikes + avgComments) / avgViews * 100 * 100) / 100 : 0,
          uploadsPerMonth: this.calculateUploadFrequency(videos)
        },
        insights: this.generateInsights(channelInfo, videos)
      };

      console.log('✅ チャンネル分析完了:', channelInfo.title);
      return { success: true, data: analysis };

    } catch (error) {
      console.error('❌ チャンネル分析エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * アップロード頻度を計算
   */
  calculateUploadFrequency(videos) {
    if (videos.length < 2) return 0;

    const dates = videos.map(video => new Date(video.publishedAt)).sort((a, b) => b - a);
    const latestDate = dates[0];
    const oldestDate = dates[dates.length - 1];
    const daysDiff = (latestDate - oldestDate) / (1000 * 60 * 60 * 24);
    const monthsDiff = daysDiff / 30;

    return monthsDiff > 0 ? Math.round(videos.length / monthsDiff * 100) / 100 : 0;
  }

  /**
   * インサイトを生成
   */
  generateInsights(channelInfo, videos) {
    const insights = [];

    // チャンネル登録者数に基づく分析
    const subscribers = channelInfo.statistics.subscriberCount;
    if (subscribers > 100000) {
      insights.push('大規模チャンネル: 広告効果が期待できます');
    } else if (subscribers > 10000) {
      insights.push('中規模チャンネル: ニッチな層への訴求に適しています');
    } else {
      insights.push('小規模チャンネル: 成長余地があります');
    }

    // エンゲージメント率の分析
    const avgViews = videos.reduce((sum, video) => sum + video.statistics.viewCount, 0) / videos.length;
    const avgEngagement = videos.reduce((sum, video) => sum + video.statistics.likeCount + video.statistics.commentCount, 0) / videos.length;
    const engagementRate = avgViews > 0 ? (avgEngagement / avgViews) * 100 : 0;

    if (engagementRate > 5) {
      insights.push('高いエンゲージメント率: ファンとの関係が良好です');
    } else if (engagementRate > 2) {
      insights.push('標準的なエンゲージメント率: 健全な成長を示しています');
    } else {
      insights.push('エンゲージメント改善の余地があります');
    }

    return insights;
  }

  /**
   * YouTube Data API接続テスト
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        throw new Error('YouTube Data API認証情報が設定されていません');
      }

      const result = await this.makeAPIRequest('channels', {
        part: 'snippet',
        mine: true
      }, 1);

      if (result.success) {
        console.log('✅ YouTube Data API接続テスト成功');
        return {
          success: true,
          message: 'YouTube Data APIに正常に接続できました',
          quotaStatus: this.getConfigurationStatus()
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ YouTube Data API接続テストエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化処理
   */
  async initialize() {
    try {
      console.log('📺 YouTube Data サービス初期化開始...');
      
      // 保存されている認証情報を読み込み
      await this.loadCredentials();
      
      console.log('✅ YouTube Data サービス初期化完了');
      return { success: true };
      
    } catch (error) {
      console.error('❌ YouTube Data サービス初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// シングルトンインスタンス
const youtubeDataService = new YouTubeDataService();

module.exports = youtubeDataService;