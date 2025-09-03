/**
 * 自動投稿スケジューラー
 * プランの設定に基づいて自動投稿のスケジュールを管理
 */

class AutoPostScheduler {
  constructor() {
    this.weekdays = {
      'monday': 1,
      'tuesday': 2, 
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
  }

  /**
   * プランの次回投稿日時を計算
   * @param {Object} plan - プラン情報
   * @param {Date} fromDate - 基準日時（省略時は現在日時）
   * @returns {Date|null} 次回投稿日時
   */
  calculateNextPostTime(plan, fromDate = new Date()) {
    if (!plan || !plan.frequency || !plan.schedule) {
      console.warn('⚠️ プラン情報が不完全です:', plan);
      return null;
    }

    const schedule = plan.schedule;
    const frequency = plan.frequency;
    const scheduleTime = schedule.time || '10:00'; // デフォルト10:00

    console.log(`📅 次回投稿時間計算開始 - プラン: ${plan.name}, 頻度: ${frequency}`);

    try {
      switch (frequency) {
        case 'daily':
          return this._calculateDailyNext(fromDate, scheduleTime);
        
        case 'weekly':
          return this._calculateWeeklyNext(fromDate, scheduleTime, schedule.weekdays || []);
        
        case 'monthly':
          return this._calculateMonthlyNext(fromDate, scheduleTime, schedule.dayOfMonth || 1);
        
        default:
          console.warn('⚠️ サポートされていない頻度:', frequency);
          return null;
      }
    } catch (error) {
      console.error('❌ 次回投稿時間計算エラー:', error);
      return null;
    }
  }

  /**
   * 毎日投稿の次回日時を計算
   */
  _calculateDailyNext(fromDate, timeString) {
    const nextDate = new Date(fromDate);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    nextDate.setHours(hours, minutes, 0, 0);
    
    // 今日の投稿時間が過ぎている場合は明日に設定
    if (nextDate <= fromDate) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    console.log(`📅 毎日投稿 - 次回: ${nextDate.toLocaleString('ja-JP')}`);
    return nextDate;
  }

  /**
   * 毎週投稿の次回日時を計算
   */
  _calculateWeeklyNext(fromDate, timeString, weekdays) {
    if (!weekdays || weekdays.length === 0) {
      console.warn('⚠️ 週次投稿の曜日が設定されていません');
      return null;
    }

    const [hours, minutes] = timeString.split(':').map(Number);
    const currentDay = fromDate.getDay();
    const currentTime = fromDate.getHours() * 60 + fromDate.getMinutes();
    const targetTime = hours * 60 + minutes;

    // 曜日を数値に変換してソート
    const targetDays = weekdays
      .map(day => this.weekdays[day])
      .filter(day => day !== undefined)
      .sort((a, b) => a - b);

    if (targetDays.length === 0) {
      console.warn('⚠️ 有効な曜日が設定されていません');
      return null;
    }

    // 今日以降の最も近い曜日を探す
    let nextDay = null;
    let daysToAdd = 0;

    // 今日の投稿時間をチェック
    if (targetDays.includes(currentDay) && currentTime < targetTime) {
      nextDay = currentDay;
      daysToAdd = 0;
    } else {
      // 今週の残りの曜日をチェック
      for (const day of targetDays) {
        if (day > currentDay) {
          nextDay = day;
          daysToAdd = day - currentDay;
          break;
        }
      }
      
      // 今週に該当なしの場合、来週の最初の曜日
      if (nextDay === null) {
        nextDay = targetDays[0];
        daysToAdd = 7 - currentDay + nextDay;
      }
    }

    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    nextDate.setHours(hours, minutes, 0, 0);
    
    console.log(`📅 週次投稿 - 次回: ${nextDate.toLocaleString('ja-JP')} (${weekdays.join(', ')})`);
    return nextDate;
  }

  /**
   * 毎月投稿の次回日時を計算
   */
  _calculateMonthlyNext(fromDate, timeString, dayOfMonth) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const nextDate = new Date(fromDate);
    
    nextDate.setHours(hours, minutes, 0, 0);
    nextDate.setDate(dayOfMonth);
    
    // 今月の投稿日が過ぎている場合は来月に設定
    if (nextDate <= fromDate) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    console.log(`📅 月次投稿 - 次回: ${nextDate.toLocaleString('ja-JP')} (毎月${dayOfMonth}日)`);
    return nextDate;
  }

  /**
   * プランが投稿実行対象かチェック
   * @param {Object} plan - プラン情報
   * @param {Date} currentTime - 現在時刻
   * @returns {boolean} 実行対象かどうか
   */
  shouldExecutePlan(plan, currentTime = new Date()) {
    if (!plan || !plan.isActive) {
      return false;
    }

    // プラン期間のチェック
    if (plan.startDate) {
      const startDate = new Date(plan.startDate);
      if (currentTime < startDate) {
        return false;
      }
    }

    if (plan.endDate) {
      const endDate = new Date(plan.endDate);
      if (currentTime > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * 複数プランの次回投稿スケジュールを一括計算
   * @param {Array} plans - プラン配列
   * @param {Date} fromDate - 基準日時
   * @returns {Array} スケジュール情報配列
   */
  calculateAllPlanSchedules(plans, fromDate = new Date()) {
    if (!Array.isArray(plans)) {
      console.warn('⚠️ プラン配列が無効です');
      return [];
    }

    const schedules = [];

    for (const plan of plans) {
      if (!this.shouldExecutePlan(plan, fromDate)) {
        console.log(`⏭️ プランスキップ: ${plan.name} (非アクティブまたは期間外)`);
        continue;
      }

      const nextPostTime = this.calculateNextPostTime(plan, fromDate);
      
      if (nextPostTime) {
        schedules.push({
          planId: plan.id,
          planName: plan.name,
          platform: plan.platform,
          frequency: plan.frequency,
          nextPostTime: nextPostTime,
          isReady: nextPostTime <= fromDate
        });
      }
    }

    // 次回投稿時間でソート
    schedules.sort((a, b) => a.nextPostTime - b.nextPostTime);

    console.log(`📊 スケジュール計算完了: ${schedules.length}件`);
    return schedules;
  }

  /**
   * 投稿内容を生成するためのプロンプトテンプレート
   * @param {Object} plan - プラン情報
   * @param {Object} project - プロジェクト情報
   * @param {Object} post - 投稿情報（オプション、customPromptがある場合）
   * @returns {Promise<string>} プロンプト
   */
  async generatePostPrompt(plan, project, post = null) {
    // Plan.customPromptがある場合は優先使用
    if (plan.customPrompt) {
      console.log('🎯 Plan.customPromptを使用:', plan.customPrompt.substring(0, 100) + '...');
      return plan.customPrompt;
    }
    let basePrompt = `プロジェクト「${project.name}」の開発進捗や更新情報について、${plan.platform}向けの投稿を作成してください。

プロジェクト情報:
- 名前: ${project.name}
- 説明: ${project.description || 'なし'}
- カテゴリ: ${project.category || 'web'}`;

    // GitHub情報を取得して追加
    let githubInfo = '';
    if (project.githubUrl) {
      try {
        console.log('📊 GitHub情報取得開始:', project.githubUrl);
        const GitHubService = require('./github-service');
        const githubService = new GitHubService();
        const githubData = await githubService.getProjectData(project.githubUrl);
        githubInfo = githubService.formatForPrompt(githubData);
        console.log('✅ GitHub情報取得完了');
      } catch (error) {
        console.error('❌ GitHub情報取得失敗:', error);
        githubInfo = '\n※ GitHub情報の取得に失敗しました。基本情報のみで投稿を生成します。\n';
      }
    }

    basePrompt += githubInfo;
    basePrompt += `

重要な制約:
- 上記のGitHub情報がある場合は、実際のコミット内容やREADMEを参考にしてください
- 情報がない場合や不明な場合は「開発中」「進行中」「準備中」などの表現を使用してください
- 存在しない機能やサービスについて言及しないでください
- 簡潔で控えめな表現を心がけてください`;

    // プラットフォーム固有の指示
    const platformInstructions = {
      'twitter': `280文字以内で以下の形式で作成してください：
「${project.name}プロジェクトの開発を進めています。[簡潔な進捗内容] #開発 #プログラミング」`,
      'instagram': `簡潔で控えめなインスタグラム投稿を作成してください。過度な宣伝は避けてください。`,
      'linkedin': `LinkedIn向けの専門的だが控えめな開発進捗報告を作成してください。`,
      'facebook': `Facebook向けの親しみやすい開発日記風の投稿を作成してください。`
    };

    const instruction = platformInstructions[plan.platform] || 'プラットフォームに適した控えめな投稿を作成してください。';

    return `${basePrompt}

${instruction}

投稿内容のみを返してください。説明や前置きは不要です。`;
  }

  /**
   * デバッグ用：スケジュール情報を見やすい形式で出力
   * @param {Array} schedules - スケジュール配列
   */
  logSchedules(schedules) {
    console.log('\n📅 自動投稿スケジュール一覧:');
    console.log('=====================================');
    
    if (schedules.length === 0) {
      console.log('📭 スケジュールされている投稿はありません');
      return;
    }

    schedules.forEach((schedule, index) => {
      const status = schedule.isReady ? '🟢 実行可能' : '⏰ 待機中';
      const timeStr = schedule.nextPostTime.toLocaleString('ja-JP');
      
      console.log(`${index + 1}. ${schedule.planName} (${schedule.platform})`);
      console.log(`   └─ 次回投稿: ${timeStr} ${status}`);
    });
    
    console.log('=====================================\n');
  }
}

module.exports = AutoPostScheduler;