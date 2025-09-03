/**
 * 自動投稿マネージャー
 * プランに基づいて自動投稿を生成・管理
 */

const AutoPostScheduler = require('./auto-post-scheduler');
const { execSync } = require('child_process');
const path = require('path');

class AutoPostManager {
  constructor(firebaseService) {
    this.firebaseService = firebaseService;
    this.scheduler = new AutoPostScheduler();
  }

  /**
   * プロジェクトの全プランの自動投稿を処理
   * @param {string} projectId - プロジェクトID
   * @returns {Object} 処理結果
   */
  async processProjectAutoPosts(projectId) {
    try {
      console.log(`🤖 プロジェクト自動投稿処理開始: ${projectId}`);

      // プロジェクト情報を取得
      const projectResult = await this.firebaseService.getProjectHierarchical(projectId);
      if (!projectResult.success) {
        throw new Error(`プロジェクト取得失敗: ${projectResult.error}`);
      }

      const project = projectResult.project;

      // プラン一覧を取得
      const plansResult = await this.firebaseService.getProjectPlans(projectId);
      if (!plansResult.success) {
        throw new Error(`プラン取得失敗: ${plansResult.error}`);
      }

      const plans = plansResult.plans || [];
      const activePlans = plans.filter(plan => plan.isActive !== false);

      console.log(`📋 アクティブプラン数: ${activePlans.length}件`);

      if (activePlans.length === 0) {
        return {
          success: true,
          message: 'アクティブなプランがありません',
          processed: 0,
          generated: 0
        };
      }

      // スケジュールを計算
      const schedules = this.scheduler.calculateAllPlanSchedules(activePlans);
      const readySchedules = schedules.filter(schedule => schedule.isReady);

      console.log(`⏰ 実行準備完了: ${readySchedules.length}件`);

      let generatedCount = 0;
      const results = [];

      // 実行準備完了のスケジュールを処理
      for (const schedule of readySchedules) {
        try {
          const plan = activePlans.find(p => p.id === schedule.planId);
          if (!plan) {
            console.warn(`⚠️ プランが見つかりません: ${schedule.planId}`);
            continue;
          }

          const result = await this.generateAutoPost(project, plan);
          results.push({
            planId: schedule.planId,
            planName: schedule.planName,
            ...result
          });

          if (result.success) {
            generatedCount++;
          }

        } catch (error) {
          console.error(`❌ プラン処理エラー (${schedule.planName}):`, error);
          results.push({
            planId: schedule.planId,
            planName: schedule.planName,
            success: false,
            error: error.message
          });
        }
      }

      console.log(`✅ 自動投稿生成完了: ${generatedCount}/${readySchedules.length}件`);

      return {
        success: true,
        processed: readySchedules.length,
        generated: generatedCount,
        results: results
      };

    } catch (error) {
      console.error('❌ プロジェクト自動投稿処理エラー:', error);
      return {
        success: false,
        error: error.message,
        processed: 0,
        generated: 0
      };
    }
  }

  /**
   * 個別プランの自動投稿を生成
   * @param {Object} project - プロジェクト情報
   * @param {Object} plan - プラン情報
   * @returns {Object} 生成結果
   */
  async generateAutoPost(project, plan) {
    try {
      console.log(`📝 自動投稿生成開始: ${plan.name} (${plan.platform})`);

      // プロンプトを生成
      const prompt = await this.scheduler.generatePostPrompt(plan, project);

      // AI投稿を生成
      const content = await this.generateAIContent(prompt, project);
      if (!content) {
        throw new Error('AI投稿生成に失敗しました');
      }

      // 次回投稿日時を計算
      const nextPostTime = this.scheduler.calculateNextPostTime(plan);
      if (!nextPostTime) {
        throw new Error('次回投稿時間の計算に失敗しました');
      }

      // 投稿データを作成
      const postData = {
        content: content,
        scheduledAt: nextPostTime.toISOString(),
        status: 'scheduled',
        type: 'auto_generated',
        platform: plan.platform,
        planId: plan.id,
        planName: plan.name,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Firestoreに投稿を保存
      const createResult = await this.firebaseService.createPost(
        project.id, 
        plan.id, 
        postData
      );

      if (!createResult.success) {
        throw new Error(`投稿保存失敗: ${createResult.error}`);
      }

      console.log(`✅ 自動投稿生成成功: ${createResult.id}`);

      return {
        success: true,
        postId: createResult.id,
        content: content,
        scheduledAt: nextPostTime.toISOString(),
        platform: plan.platform
      };

    } catch (error) {
      console.error(`❌ 自動投稿生成エラー (${plan.name}):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * AI投稿内容を生成
   * @param {string} prompt - プロンプト
   * @param {Object} project - プロジェクト情報
   * @returns {string|null} 生成された投稿内容
   */
  async generateAIContent(prompt, project) {
    try {
      // BrowserWindowからレンダラープロセスにメッセージを送信してAI生成
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      
      if (!mainWindow) {
        throw new Error('メインウィンドウが見つかりません');
      }
      
      console.log('🤖 AI投稿生成開始...');
      
      // レンダラープロセスでAI生成を実行
      const result = await mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            if (typeof aiServiceManager === 'undefined') {
              return { success: false, error: 'AI Service Manager not available' };
            }
            
            const provider = aiServiceManager.getCurrentProvider();
            console.log('🔧 現在のプロバイダー:', provider);
            
            const result = await aiServiceManager.generateText(\`${prompt.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`, {
              maxTokens: 500,
              temperature: 0.7
            });
            
            return result;
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      if (!result.success) {
        throw new Error(`AI生成失敗: ${result.error}`);
      }
      
      const content = result.content.trim();
      
      if (!content) {
        throw new Error('AI投稿生成結果が空です');
      }
      
      console.log(`✅ AI投稿生成成功 (${content.length}文字) - ${result.provider}/${result.model}`);
      console.log(`📝 生成内容: ${content.substring(0, 100)}...`);
      
      return content;
      
    } catch (error) {
      console.error('❌ AI投稿生成エラー:', error);
      
      // フォールバック投稿を生成
      return this.generateFallbackContent(project);
    }
  }

  /**
   * フォールバック投稿内容を生成
   * @param {Object} project - プロジェクト情報
   * @returns {string} フォールバック投稿内容
   */
  generateFallbackContent(project) {
    const templates = [
      `${project.name}の開発進捗をお知らせします！ 🚀`,
      `${project.name}プロジェクトの最新情報をチェック！ 💡`,
      `${project.name}で新しいことに挑戦中です 🌟`,
      `${project.name}の成長を続けています 📈`,
      `${project.name}をより良くするために頑張っています 💪`
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const hashtags = ['#開発', '#プログラミング', '#テック'];
    const randomHashtag = hashtags[Math.floor(Math.random() * hashtags.length)];

    return `${randomTemplate} ${randomHashtag}`;
  }

  /**
   * 全てのアクティブプロジェクトの自動投稿を処理
   * @returns {Object} 処理結果
   */
  async processAllProjectsAutoPosts() {
    try {
      console.log('🌐 全プロジェクト自動投稿処理開始');

      // 全プロジェクトを取得
      const projectsResult = await this.firebaseService.getUserProjectsHierarchical();
      if (!projectsResult.success) {
        throw new Error(`プロジェクト一覧取得失敗: ${projectsResult.error}`);
      }

      const projects = projectsResult.projects || [];
      console.log(`📋 対象プロジェクト数: ${projects.length}件`);

      let totalProcessed = 0;
      let totalGenerated = 0;
      const projectResults = [];

      for (const project of projects) {
        try {
          const result = await this.processProjectAutoPosts(project.id);
          projectResults.push({
            projectId: project.id,
            projectName: project.name,
            ...result
          });

          totalProcessed += result.processed || 0;
          totalGenerated += result.generated || 0;

        } catch (error) {
          console.error(`❌ プロジェクト処理エラー (${project.name}):`, error);
          projectResults.push({
            projectId: project.id,
            projectName: project.name,
            success: false,
            error: error.message,
            processed: 0,
            generated: 0
          });
        }
      }

      console.log(`🎉 全プロジェクト自動投稿処理完了: ${totalGenerated}/${totalProcessed}件生成`);

      return {
        success: true,
        totalProjects: projects.length,
        totalProcessed: totalProcessed,
        totalGenerated: totalGenerated,
        projectResults: projectResults
      };

    } catch (error) {
      console.error('❌ 全プロジェクト自動投稿処理エラー:', error);
      return {
        success: false,
        error: error.message,
        totalProjects: 0,
        totalProcessed: 0,
        totalGenerated: 0
      };
    }
  }

  /**
   * 次回投稿予定を確認
   * @param {string} projectId - プロジェクトID  
   * @returns {Object} 次回投稿予定情報
   */
  async getUpcomingPosts(projectId) {
    try {
      // プラン一覧を取得
      const plansResult = await this.firebaseService.getProjectPlans(projectId);
      if (!plansResult.success) {
        throw new Error(`プラン取得失敗: ${plansResult.error}`);
      }

      const plans = plansResult.plans || [];
      const activePlans = plans.filter(plan => plan.isActive !== false);

      // スケジュールを計算
      const schedules = this.scheduler.calculateAllPlanSchedules(activePlans);

      return {
        success: true,
        upcomingPosts: schedules.map(schedule => ({
          planId: schedule.planId,
          planName: schedule.planName,
          platform: schedule.platform,
          nextPostTime: schedule.nextPostTime.toISOString(),
          isReady: schedule.isReady,
          timeUntilPost: this.getTimeUntilPost(schedule.nextPostTime)
        }))
      };

    } catch (error) {
      console.error('❌ 次回投稿予定取得エラー:', error);
      return {
        success: false,
        error: error.message,
        upcomingPosts: []
      };
    }
  }

  /**
   * 投稿までの残り時間を取得
   * @param {Date} postTime - 投稿予定時刻
   * @returns {string} 残り時間の文字列
   */
  getTimeUntilPost(postTime) {
    const now = new Date();
    const diff = postTime - now;

    if (diff <= 0) {
      return '実行可能';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}日後`;
    } else if (hours > 0) {
      return `${hours}時間${minutes}分後`;
    } else {
      return `${minutes}分後`;
    }
  }
}

module.exports = AutoPostManager;