/**
 * ui-components.js
 * UI Components and Helpers
 * Common UI functions, form handling, and visual feedback
 * 
 * Total functions: 31
 * Extracted from: index.html
 */

// ========== cancelScheduledPost ==========
function cancelScheduledPost(index) {
      if (confirm('この予約投稿をキャンセルしますか？')) {
        // 実装が必要: 実際の予約データから削除
        updateScheduledPostsList([]);
        alert('✅ 予約投稿をキャンセルしました。');
      }
    }

// ========== clearLoginForm ==========
function clearLoginForm() {
      document.getElementById('firebaseEmail').value = '';
      document.getElementById('firebasePassword').value = '';
    }

// ========== debugModal ==========
function debugModal() {
      console.log('AI Service Manager:', aiServiceManager);
      console.log('Modal exists:', !!document.getElementById('ai-config-modal'));
      const modal = document.getElementById('ai-config-modal');
      if (modal) {
        console.log('Modal display:', modal.style.display);
        console.log('Modal content:', modal.innerHTML.substring(0, 100));
      }
    }

// ========== debugPlanData ==========
async function debugPlanData() {
      if (!currentProjectId) {
        console.log('❌ プロジェクトが選択されていません');
        return;
      }

      try {
        console.log('🔍 planデータ構造をチェック中...');
        const result = await window.electronAPI.invoke('firebase-get-project-plans', currentProjectId);
        
        if (result.success && result.plans) {
          console.log(`📋 プラン数: ${result.plans.length}件`);
          result.plans.forEach((plan, index) => {
            console.log(`\n--- プラン${index + 1} ---`);
            console.log('📝 名前:', plan.name);
            console.log('⚡ isActive:', plan.isActive);
            console.log('🕒 schedule:', plan.schedule);
            console.log('🔄 frequency:', plan.frequency);
            console.log('📱 platform:', plan.platform);
            console.log('🎯 description:', plan.description);
            console.log('📄 全データ:', plan);
          });

          // 自動投稿の条件チェック
          const now = new Date();
          console.log('\n🕐 現在時刻:', now.toString());
          console.log('📊 自動投稿条件チェック:');
          
          result.plans.forEach((plan, index) => {
            const isActive = plan.isActive === true;
            const hasSchedule = plan.schedule && plan.schedule.time;
            const hasFrequency = plan.frequency;
            
            console.log(`\nプラン${index + 1} (${plan.name}):`);
            console.log('  ✅ アクティブ:', isActive);
            console.log('  ✅ スケジュール設定:', hasSchedule);
            console.log('  ✅ 頻度設定:', hasFrequency);
            console.log('  🎯 自動投稿対象:', isActive && hasSchedule && hasFrequency);
          });

        } else {
          console.log('❌ プラン取得失敗:', result.error);
        }
      } catch (error) {
        console.error('❌ デバッグエラー:', error);
      }
    }

// ========== debugPostData ==========
async function debugPostData() {
      if (!currentProjectId) {
        console.log('❌ プロジェクトが選択されていません');
        return;
      }

      try {
        console.log('🔍 postデータ構造をチェック中...');
        const result = await window.electronAPI.invoke('firebase-get-project-posts', currentProjectId);
        
        if (result.success && result.posts) {
          console.log(`📋 投稿数: ${result.posts.length}件`);
          
          if (result.posts.length === 0) {
            console.log('⚠️ 投稿が見つかりません。Cloud Functionが投稿を生成していない可能性があります');
          } else {
            result.posts.forEach((post, index) => {
              console.log(`\n--- 投稿${index + 1} ---`);
              console.log('📝 内容:', post.content?.substring(0, 50) + '...');
              console.log('⏰ スケジュール:', post.scheduledAt);
              console.log('📍 状態:', post.status);
              console.log('🏷️ タイプ:', post.type);
              console.log('📱 プラットフォーム:', post.platform);
              console.log('🆔 プランID:', post.planId);
              console.log('📄 全データ:', post);
            });
          }
        } else {
          console.log('❌ 投稿取得失敗:', result.error);
        }

        // Cloud Functionログも確認
        console.log('\n🔍 Cloud Functionのログを確認してください:');
        console.log('https://console.cloud.google.com/functions/details/us-central1/processAutoPostsManual?project=ad-project-4fb54');
        
      } catch (error) {
        console.error('❌ デバッグエラー:', error);
      }
    }

// ========== handleCompositionEnd ==========
function handleCompositionEnd(event) {
      // 少し遅延させてフラグをfalseに
      setTimeout(() => {
        isComposing = false;
      }, 100);
    }

// ========== handleCompositionStart ==========
function handleCompositionStart(event) {
      isComposing = true;
    }

// ========== handleCompositionUpdate ==========
function handleCompositionUpdate(event) {
      isComposing = true;
    }

// ========== handleInputKeydown ==========
function handleInputKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey && !isComposing && !event.isComposing) {
        event.preventDefault();
        sendMessage();
      }
    }

// ========== initializeTweetForm ==========
function initializeTweetForm() {
      const textArea = document.getElementById('tweetText');
      const charCount = document.getElementById('charCount');
      
      if (textArea && charCount) {
        textArea.addEventListener('input', function() {
          const count = this.value.length;
          charCount.textContent = count;
          charCount.style.color = count > 260 ? '#e0245e' : '#657786';
          
          // プレビュー更新
          updatePreview();
        });
      }
      
      // スケジュール設定の表示切り替え
      const scheduleType = document.getElementById('scheduleType');
      if (scheduleType) {
        scheduleType.addEventListener('change', function() {
          const scheduleTime = document.getElementById('scheduleTime');
          if (this.value === 'scheduled') {
            scheduleTime.style.display = 'block';
            // デフォルトを1時間後に設定
            const now = new Date();
            now.setHours(now.getHours() + 1);
            scheduleTime.value = now.toISOString().slice(0, 16);
          } else {
            scheduleTime.style.display = 'none';
          }
          updatePreview();
        });
      }
    }

// ========== postTweet ==========
async function postTweet() {
      const content = document.getElementById('tweetText').value.trim();
      const scheduleType = document.getElementById('scheduleType').value;
      const scheduleTime = document.getElementById('scheduleTime').value;
      
      if (!content) {
        alert('❌ 内容を入力してください。');
        return;
      }
      
      if (content.length > 280) {
        alert('❌ ツイートは280文字以内にしてください。');
        return;
      }
      
      if (scheduleType === 'scheduled' && !scheduleTime) {
        alert('❌ 投稿時間を指定してください。');
        return;
      }

      console.log('🐦 ツイート投稿開始');
      
      try {
        const tweetData = {
          content: content,
          scheduleType: scheduleType,
          scheduleTime: scheduleTime
        };
        
        const result = await window.electronAPI.invoke('post-tweet', tweetData);
        if (result.success) {
          alert('✅ ツイートを投稿しました！');
          document.getElementById('tweetText').value = '';
          updatePreview();
          document.getElementById('charCount').textContent = '0';
        } else {
          alert(`❌ 投稿エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ ツイート投稿エラー:', error);
        alert(`❌ 投稿エラー: ${error.message}`);
      }
    }

// ========== refreshAllApiStatus ==========
async function refreshAllApiStatus() {
      console.log('🔄 全API接続状況確認開始');
      
      // Ollama AI状況確認
      await checkOllamaStatus();
      
      // Twitter状況確認
      await checkTwitterStatus();
      
      // Google Ads状況確認
      await checkGoogleAdsStatus();
      
      // Firebase状況確認
      await checkFirebaseStatus();
    }

// ========== refreshAllPlatformStatus ==========
function refreshAllPlatformStatus() { alert('全プラットフォーム状況を更新します'); }

// ========== refreshPostPreview ==========
async function refreshPostPreview() {
      try {
        if (editingPostId && editingPlanId) {
          const postData = await getCurrentPostData(editingPostId);
          if (postData && postData.content) {
            document.getElementById('generated-post-content').textContent = postData.content;
          }
        }
      } catch (error) {
        console.error('投稿プレビュー更新エラー:', error);
      }
    }

// ========== refreshTweetHistory ==========
async function refreshTweetHistory() {
      console.log('📊 ツイート履歴更新開始');
      
      try {
        const result = await window.electronAPI.invoke('get-tweet-history');
        if (result.success) {
          updateTweetHistoryUI(result.tweets);
        } else {
          console.error('❌ ツイート履歴取得失敗:', result.error);
        }
      } catch (error) {
        console.error('❌ ツイート履歴取得エラー:', error);
      }
    }

// ========== saveDraft ==========
function saveDraft() {
      const content = document.getElementById('tweetText').value.trim();
      if (!content) {
        alert('❌ 内容を入力してください。');
        return;
      }
      
      localStorage.setItem('tweetDraft', content);
      alert('✅ 下書きを保存しました！');
    }

// ========== scheduleMultiplePosts ==========
function scheduleMultiplePosts() {
      alert('📅 まとめてスケジュール機能は開発中です。\n\n予定機能：\n• 複数投稿の一括スケジューリング\n• テンプレートを使用した投稿生成\n• 曜日・時間帯別の自動配信');
    }

// ========== scrollToBottom ==========
function scrollToBottom() {
      const chatArea = document.getElementById('unified-chat-area');
      chatArea.scrollTop = chatArea.scrollHeight;
    }

// ========== showNotification ==========
function showNotification(message, type = 'info') {
      console.log(`📢 ${type.toUpperCase()}: ${message}`);
      
      // 簡易通知表示（本格的な実装は後で行う）
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#cce7ff'};
        color: ${type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#004085'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'warning' ? '#ffeaa7' : '#a6d5fa'};
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }

// ========== showPostHistory ==========
function showPostHistory() {
      alert('📋 投稿履歴機能は開発中です。\n\n予定機能：\n• 過去の投稿一覧\n• エンゲージメント統計\n• 投稿効果の分析');
    }

// ========== showScheduleSettings ==========
async function showScheduleSettings() {
      alert('⏰ スケジュール設定機能は近日実装予定です\n\n現在は Firebase Functions で自動的に:\n• 毎晩23:00 - AI投稿生成\n• 毎朝10:00 - 自動投稿実行\nが設定されています');
    }

// ========== showUpcomingAutoPosts ==========
async function showUpcomingAutoPosts() {
      if (!currentProjectId) {
        alert('プロジェクトが選択されていません');
        return;
      }

      try {
        const result = await window.electronAPI.invoke('get-upcoming-auto-posts', currentProjectId);

        if (result.success) {
          if (result.upcomingPosts.length === 0) {
            alert('📅 次回投稿予定\n\n予定されている自動投稿はありません。\n\nプランのスケジュール設定を確認してください。');
            return;
          }

          const postList = result.upcomingPosts
            .map(post => `• ${post.planName} (${post.platform})\n  次回: ${new Date(post.nextPostTime).toLocaleString('ja-JP')}\n  状態: ${post.isReady ? '実行準備完了' : post.timeUntilPost}`)
            .join('\n\n');

          alert(`📅 次回投稿予定 (${result.upcomingPosts.length}件)\n\n${postList}`);
        } else {
          throw new Error(result.error || '投稿予定取得に失敗しました');
        }
      } catch (error) {
        console.error('❌ 投稿予定取得エラー:', error);
        alert(`投稿予定の取得に失敗しました: ${error.message}`);
      }
    }

// ========== togglePlanAutoPost ==========
async function togglePlanAutoPost(planId, currentStatus) {
      if (!currentProjectId || !planId) {
        alert('プロジェクトまたはプランが選択されていません');
        return;
      }

      const newStatus = !currentStatus;
      const action = newStatus ? '有効にする' : '無効にする';

      if (!confirm(`この プランの自動投稿を${action}しますか？`)) {
        return;
      }

      try {
        const result = await window.electronAPI.invoke('update-plan-auto-post-status', {
          projectId: currentProjectId,
          planId: planId,
          isActive: newStatus
        });

        if (result.success) {
          console.log(`✅ プラン自動投稿ステータス更新成功: ${planId} → ${newStatus ? '有効' : '無効'}`);
          
          // プラン一覧を再読み込み
          await loadProjectPlans(currentProjectId);
          
          showNotification(`プランの自動投稿を${newStatus ? '有効' : '無効'}にしました`, newStatus ? 'success' : 'warning');
        } else {
          throw new Error(result.error || 'ステータス更新に失敗しました');
        }
      } catch (error) {
        console.error('❌ プラン自動投稿ステータス更新エラー:', error);
        alert(`ステータス更新に失敗しました: ${error.message}`);
      }
    }

// ========== toggleProjectRegistrationForm ==========
function toggleProjectRegistrationForm() {
      const section = document.getElementById('projectRegistrationSection');

      if (section.style.display === 'none' || section.style.display === '') {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    }

// ========== updateCharCount ==========
function updateCharCount() {
      const content = document.getElementById('edit-post-content').value;
      document.getElementById('char-count').textContent = content.length;
    }

// ========== updateNavigationButtons ==========
function updateNavigationButtons() {
      const prevBtn = document.getElementById('prev-suggestion-btn');
      const nextBtn = document.getElementById('next-suggestion-btn');
      const counter = document.getElementById('suggestion-counter');
      const navContainer = prevBtn.parentElement;

      // 履歴が0の場合はナビゲーション全体を非表示
      if (suggestionHistory.length === 0) {
        navContainer.style.display = 'none';
        return;
      }

      // 履歴が1つで、その1つを表示中の場合は非表示
      if (suggestionHistory.length === 1 && currentSuggestionIndex === 0) {
        navContainer.style.display = 'none';
        return;
      }

      // それ以外の場合は表示
      navContainer.style.display = 'flex';

      // 新規提案入力モード（currentSuggestionIndex = suggestionHistory.length）の場合
      if (currentSuggestionIndex >= suggestionHistory.length) {
        prevBtn.style.display = 'inline-block';
        prevBtn.disabled = false; // 前に戻れる
        nextBtn.style.display = 'none'; // 次の提案ボタンを非表示
        counter.textContent = `新規/${suggestionHistory.length}`;
      } else {
        // 過去の提案を表示中
        // 最初の提案の場合は「← 前の提案」を非表示
        if (currentSuggestionIndex <= 0) {
          prevBtn.style.display = 'none';
        } else {
          prevBtn.style.display = 'inline-block';
          prevBtn.disabled = false;
        }

        // 最新の提案の場合は「次の提案」を非表示
        if (currentSuggestionIndex >= suggestionHistory.length - 1) {
          nextBtn.style.display = 'none';
        } else {
          nextBtn.style.display = 'inline-block';
          nextBtn.disabled = false;
        }

        counter.textContent = `${currentSuggestionIndex + 1}/${suggestionHistory.length}`;
      }
    }

// ========== updatePreview ==========
function updatePreview() {
      const textEl = document.getElementById('tweetText');
      const preview = document.getElementById('tweetPreview');
      const previewText = document.getElementById('previewText');
      
      if (textEl && preview && previewText) {
        const text = textEl.value;
        if (text.trim()) {
          preview.style.display = 'block';
          previewText.textContent = text;
        } else {
          preview.style.display = 'none';
        }
      }
    }

// ========== updateSaveButtonText ==========
function updateSaveButtonText() {
      const saveBtn = document.getElementById('save-post-btn');
      if (editingPostId && editingPlanId) {
        saveBtn.innerHTML = '💾 投稿を更新';
      } else {
        saveBtn.innerHTML = '💾 投稿として保存';
      }
    }

// ========== updateScheduledPostsList ==========
function updateScheduledPostsList(posts) {
      const listElement = document.getElementById('scheduled-posts-list');
      
      if (!posts || posts.length === 0) {
        listElement.innerHTML = '<div style="color: #657786; text-align: center; padding: 20px;">予約されている投稿はありません</div>';
        return;
      }
      
      let html = '';
      posts.forEach((post, index) => {
        html += `
          <div style="background: white; border: 1px solid #e1e8ed; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
            <div style="font-size: 14px; margin-bottom: 8px; line-height: 1.4;">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #657786;">
              <span>📅 ${post.datetime} | 🐦 ${post.platform}</span>
              <button onclick="cancelScheduledPost(${index})" style="background: none; border: none; color: var(--danger); cursor: pointer;">❌</button>
            </div>
          </div>
        `;
      });
      
      listElement.innerHTML = html;
      
      // 統計を更新
      const scheduledCount = document.getElementById('scheduled-count');
      const nextPostTime = document.getElementById('next-post-time');
      
      if (scheduledCount) {
        scheduledCount.textContent = posts.length;
      }
      if (nextPostTime) {
        nextPostTime.textContent = posts.length > 0 ? posts[0].datetime : '予約されていません';
      }
    }

// ========== updateTestTweetCharCount ==========
function updateTestTweetCharCount() {
      const textarea = document.getElementById('testTweetText');
      const counter = document.getElementById('testTweetCharCount');
      const postBtn = document.getElementById('testTweetBtn');
      
      if (textarea && counter) {
        const length = textarea.value.length;
        const remaining = 280 - length;
        
        counter.textContent = `${length} / 280`;
        
        // 文字数に応じて色を変更
        if (length > 280) {
          counter.style.color = '#e0245e'; // 赤色
          if (postBtn) postBtn.disabled = true;
        } else if (length > 260) {
          counter.style.color = '#f45d22'; // オレンジ色
          if (postBtn) postBtn.disabled = false;
        } else {
          counter.style.color = '#657786'; // グレー色
          if (postBtn) postBtn.disabled = length === 0;
        }
      }
    }

// ========== updateTweetHistoryUI ==========
function updateTweetHistoryUI(tweets) {
      const historyContainer = document.getElementById('tweetHistory');
      
      if (!tweets || tweets.length === 0) {
        historyContainer.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #657786;">
            <p>📝 まだツイート履歴がありません</p>
            <p style="font-size: 14px;">ツイートを投稿すると、ここに履歴が表示されます</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      tweets.forEach(tweet => {
        const date = new Date(tweet.createdAt || tweet.scheduledTime || Date.now());
        const statusClass = tweet.status === 'posted' ? 'status-posted' : 
                           tweet.status === 'scheduled' ? 'status-scheduled' : 'status-failed';
        const statusText = tweet.status === 'posted' ? '投稿済み' : 
                          tweet.status === 'scheduled' ? '予約済み' : '失敗';
        
        html += `
          <div class="tweet-item">
            <div class="tweet-meta">
              <span>${date.toLocaleString('ja-JP')}</span>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div>${tweet.content}</div>
          </div>
        `;
      });
      
      historyContainer.innerHTML = html;
    }
