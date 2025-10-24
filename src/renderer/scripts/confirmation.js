/**
 * confirmation.js
 * Confirmation and Intent System
 * Handles user confirmations and intent-based actions
 * 
 * Total functions: 14
 * Extracted from: index.html
 */

// ========== cancelConfirmation ==========
function cancelConfirmation() {
      if (!pendingConfirmation) {
        return;
      }

      console.log('❌ 確認をキャンセル');

      // ボタンUIを削除
      removeConfirmationOptions();

      // ユーザーの選択をチャット履歴に追加
      addUserMessage('操作をキャンセルします');

      // アシスタントメッセージ
      addAssistantMessage('承知いたしました。操作をキャンセルしました。他にご要望があればお聞かせください。');

      // 確認待ち状態をクリア
      pendingConfirmation = null;
    }

// ========== confirmAction ==========
async function confirmAction(actionType) {
      await confirmMultipleActions();
    }

// ========== confirmMultipleActions ==========
async function confirmMultipleActions() {
      if (!pendingConfirmation) {
        console.error('❌ 確認待ちの処理がありません');
        addAssistantMessage('申し訳ございません。確認待ちの処理が見つかりません。');
        return;
      }

      // チェックボックスの状態を取得
      const selectedActions = [];
      const checkboxes = document.querySelectorAll('.confirmation-options input[type="checkbox"]:checked');

      checkboxes.forEach(checkbox => {
        selectedActions.push(checkbox.value);
      });

      if (selectedActions.length === 0) {
        addAssistantMessage('少なくとも1つの選択肢を選んでください。');
        return;
      }


      // ボタンUIを削除
      removeConfirmationOptions();

      // ユーザーの選択をチャット履歴に追加
      const actionLabels = {
        'post_only': '📝 この投稿のみ修正',
        'plan_included': '📋 プラン設定にも反映',
        'project_wide': '🎯 プロジェクト全体に反映'
      };

      // より自然な会話形式で記録
      let userResponseMessage;
      if (selectedActions.length === 1) {
        userResponseMessage = `${actionLabels[selectedActions[0]]}をお願いします`;
      } else if (selectedActions.length === 2) {
        userResponseMessage = `${actionLabels[selectedActions[0]]}と${actionLabels[selectedActions[1]]}をお願いします`;
      } else {
        const allButLast = selectedActions.slice(0, -1).map(action => actionLabels[action]).join('、');
        const last = actionLabels[selectedActions[selectedActions.length - 1]];
        userResponseMessage = `${allButLast}、${last}をお願いします`;
      }
      addUserMessage(userResponseMessage);

      // 選択された処理を順番に実行
      await executeMultipleConfirmedActions(selectedActions, pendingConfirmation);

      // 確認待ち状態をクリア
      pendingConfirmation = null;
    }

// ========== displayConfirmationOptions ==========
function displayConfirmationOptions(intent) {
      const allMessagesDiv = document.getElementById('all-messages');

      const optionsHTML = `
        <div class="confirmation-options" style="
          background: #f8f9fa;
          border: 1px solid #e1e8ed;
          border-radius: 12px;
          padding: 15px;
          margin: 10px 0 15px 0;
          max-width: 70%;
        ">
          <div style="font-size: 12px; color: #657786; margin-bottom: 12px;">
            💡 チェックボックスで選択するか、チャットで「プランにも反映して」等とお答えください
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <label style="
              display: flex; align-items: center; gap: 10px; padding: 10px;
              border: 1px solid #e1e8ed; border-radius: 8px; cursor: pointer;
              background: white; transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='white'">
              <input type="checkbox" id="confirm-post-only" value="post_only" style="
                width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;
              ">
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #1565c0; margin-bottom: 2px;">📝 この投稿のみ修正</div>
                <div style="font-size: 12px; color: #657786;">現在の投稿内容だけを変更します</div>
              </div>
            </label>

            <label style="
              display: flex; align-items: center; gap: 10px; padding: 10px;
              border: 1px solid #e1e8ed; border-radius: 8px; cursor: pointer;
              background: white; transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='white'">
              <input type="checkbox" id="confirm-plan-included" value="plan_included" style="
                width: 16px; height: 16px; accent-color: #ff9800; cursor: pointer;
              " checked>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #f57c00; margin-bottom: 2px;">📋 プラン設定にも反映</div>
                <div style="font-size: 12px; color: #657786;">今後の自動投稿でも同じスタイルを適用（推奨）</div>
              </div>
            </label>

            <label style="
              display: flex; align-items: center; gap: 10px; padding: 10px;
              border: 1px solid #e1e8ed; border-radius: 8px; cursor: pointer;
              background: white; transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='white'">
              <input type="checkbox" id="confirm-project-wide" value="project_wide" style="
                width: 16px; height: 16px; accent-color: #4caf50; cursor: pointer;
              ">
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #2e7d32; margin-bottom: 2px;">🎯 プロジェクト全体に反映</div>
                <div style="font-size: 12px; color: #657786;">プロジェクトのAI要約にも変更内容を反映</div>
              </div>
            </label>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: flex-end;">
            <button onclick="confirmMultipleActions()" style="
              padding: 10px 20px; background: var(--primary); color: white; border: none;
              border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;
            ">
              ✅ 適用する
            </button>
            <button onclick="cancelConfirmation()" style="
              padding: 10px 20px; background: #6c757d; color: white; border: none;
              border-radius: 6px; cursor: pointer; font-size: 14px;
            ">
              ❌ キャンセル
            </button>
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', optionsHTML);
      scrollToBottom();
    }

// ========== displayResponseWithConfirmation ==========
function displayResponseWithConfirmation(responseData) {
      // 通常のAI応答を表示（安全な値の確保）
      const responseMessage = responseData.response || responseData.message || '処理が完了しました。';
      addAssistantMessage(responseMessage);

      // 確認オプションのボタンUIを生成
      if (responseData.requiresConfirmation) {
        // 選択肢提示メッセージをチャット履歴に追加
        const optionsMessage = `以下の適用範囲から選択してください：

📝 この投稿のみ修正 - 現在の投稿内容だけを変更します
📋 プラン設定にも反映 - 今後の自動投稿でも同じスタイルを適用（推奨）
🎯 プロジェクト全体に反映 - プロジェクトのAI要約にも変更内容を反映

複数選択可能です。どちらを適用しますか？`;

        addAssistantMessage(optionsMessage);
        displayConfirmationOptions(responseData.intent);
      }
    }

// ========== executeAutoPostsForProject ==========
async function executeAutoPostsForProject() {
      if (!currentProjectId) {
        alert('プロジェクトが選択されていません');
        return;
      }

      if (!confirm('このプロジェクトの自動投稿を今すぐ実行しますか？\n\n注意: プランのスケジュール設定に基づいて投稿が生成されます。')) {
        return;
      }

      try {
        showNotification('自動投稿実行を開始しています...', 'info');
        
        const result = await window.electronAPI.invoke('execute-auto-posts-project', currentProjectId);

        if (result.success) {
          const message = `✅ 自動投稿実行が完了しました！\n\n📊 処理結果:\n- 処理されたプラン: ${result.processed}件\n- 生成された投稿: ${result.generated}件`;
          
          alert(message);
          
          // 投稿一覧を再読み込み
          await loadProjectPosts(currentProjectId);
        } else {
          throw new Error(result.error || '自動投稿実行に失敗しました');
        }
      } catch (error) {
        console.error('❌ 自動投稿実行エラー:', error);
        alert(`自動投稿実行に失敗しました: ${error.message}`);
      }
    }

// ========== executeConfirmedAction ==========
async function executeConfirmedAction(actionType, confirmationData) {
      const { intent, postId, planId } = confirmationData;

      let results = [];
      let responseMessage = '';

      try {
        switch (actionType) {
          case 'post_only':
            // 投稿は既に修正済みなので、メッセージのみ
            responseMessage = '✅ この投稿のみを修正しました。今後の投稿への影響はありません。';

            // 投稿表示エリアの確認・更新
            if (confirmationData.updatedPost) {
              document.getElementById('generated-post-content').textContent = confirmationData.updatedPost;
              document.getElementById('generated-post-section').style.display = 'block';
            }
            break;

          case 'plan_included':
            // 投稿表示エリアの確認・更新
            if (confirmationData.updatedPost) {
              document.getElementById('generated-post-content').textContent = confirmationData.updatedPost;
              document.getElementById('generated-post-section').style.display = 'block';
            }

            // プラン更新を実行
            const planResult = await updatePlanBasedOnIntent(planId, intent.intent, confirmationData.userInput);
            results.push({ type: 'plan_update', success: planResult.success });

            if (planResult.success) {
              responseMessage = '✅ 投稿を修正し、プラン設定も更新しました！今後の自動投稿でも同じスタイルが適用されます。';
            } else {
              responseMessage = '❌ 投稿は修正しましたが、プラン設定の更新に失敗しました。';
            }
            break;

          case 'project_wide':
            // 投稿表示エリアの確認・更新
            if (confirmationData.updatedPost) {
              document.getElementById('generated-post-content').textContent = confirmationData.updatedPost;
              document.getElementById('generated-post-section').style.display = 'block';
            }

            // プラン + プロジェクト更新を実行
            const planResult2 = await updatePlanBasedOnIntent(planId, intent.intent, confirmationData.userInput);
            const projectResult = await updateProjectAISummaryFromConversation(intent.intent);

            results.push(
              { type: 'plan_update', success: planResult2.success },
              { type: 'ai_summary_update', success: projectResult.success }
            );

            const allSuccess = planResult2.success && projectResult.success;

            if (allSuccess) {
              responseMessage = '✅ 投稿、プラン設定、プロジェクト概要をすべて更新しました！変更内容がプロジェクト全体に反映されます。';
            } else {
              responseMessage = '⚠️ 投稿は修正しましたが、一部の設定更新に失敗しました。詳細はログをご確認ください。';
            }
            break;

          case 'chat_only':
            responseMessage = '承知しました。投稿の修正内容を確認いただき、ありがとうございます。設定の変更はありません。他にご質問があればお聞かせください。';
            break;

          default:
            responseMessage = '不明な選択です。もう一度お選びください。';
            break;
        }

        // 結果をユーザーに表示
        addAssistantMessage(responseMessage);

        // 実行ログを記録
        if (results.length > 0) {
          await logIntentExecution({ intent: intent.intent }, results);
        }


      } catch (error) {
        console.error('❌ 確認処理実行エラー:', error);
        addAssistantMessage(`処理中にエラーが発生しました: ${error.message}`);
      }
    }

// ========== executeMultipleConfirmedActions ==========
async function executeMultipleConfirmedActions(selectedActions, confirmationData) {
      const { intent, postId, planId } = confirmationData;
      let allResults = [];
      let responseMessage = '';

      try {
        // 投稿表示エリアの確認・更新（共通処理）
        if (confirmationData.updatedPost) {
          document.getElementById('generated-post-content').textContent = confirmationData.updatedPost;
          document.getElementById('generated-post-section').style.display = 'block';
        }

        // 各選択されたアクションを実行
        for (const actionType of selectedActions) {
          switch (actionType) {
            case 'post_only':
              // 投稿のみの処理は上記で完了
              allResults.push({ type: 'post_update', success: true });
              break;

            case 'plan_included':
              // プラン更新を実行
              const planResult = await updatePlanBasedOnIntent(planId, intent.intent, confirmationData.userInput);
              if (!planResult.skipped) {
                allResults.push({ type: 'plan_update', success: planResult.success });
              }
              break;

            case 'project_wide':
              // AI要約更新を実行
              const projectResult = await updateProjectAISummaryFromConversation(intent.intent);
              allResults.push({ type: 'ai_summary_update', success: projectResult.success });
              break;
          }
        }

        // 結果メッセージを生成
        const successfulActions = allResults.filter(r => r.success);
        const failedActions = allResults.filter(r => !r.success);

        responseMessage = `✅ **処理完了！**\n\n`;

        if (successfulActions.length > 0) {
          responseMessage += `**成功した処理:**\n`;
          successfulActions.forEach(result => {
            let type = '';
            if (result.type === 'post_update') type = '投稿更新';
            else if (result.type === 'plan_update') type = 'プラン設定更新';
            else if (result.type === 'ai_summary_update') type = 'AI要約更新';
            responseMessage += `- ✅ ${type}\n`;
          });
        }

        if (failedActions.length > 0) {
          responseMessage += `\n**失敗した処理:**\n`;
          failedActions.forEach(result => {
            let type = '';
            if (result.type === 'post_update') type = '投稿更新';
            else if (result.type === 'plan_update') type = 'プラン設定更新';
            else if (result.type === 'ai_summary_update') type = 'AI要約更新';
            responseMessage += `- ❌ ${type}\n`;
          });
        }

        // 特別な通知メッセージ
        const hasAISummaryUpdate = allResults.some(r => r.type === 'ai_summary_update' && r.success);
        const hasPlanUpdate = allResults.some(r => r.type === 'plan_update' && r.success);

        if (hasPlanUpdate) {
          responseMessage += `\n📚 **学習完了**: 今後の自動投稿でもこの調整内容が反映されます`;
        }

        if (hasAISummaryUpdate) {
          responseMessage += `\n🤖 **AI要約更新**: プロジェクト概要が会話内容を反映して自動更新されました`;
        }

        addAssistantMessage(responseMessage);


      } catch (error) {
        console.error('❌ 複数確認処理実行エラー:', error);
        addAssistantMessage(`処理中にエラーが発生しました: ${error.message}`);
      }
    }

// ========== hasRecentStyleChanges ==========
function hasRecentStyleChanges() {
      return chatHistory.some(msg =>
        msg.role === 'assistant' &&
        (msg.content.includes('スタイル') || msg.content.includes('文体'))
      );
    }

// ========== logIntentExecution ==========
async function logIntentExecution(intentResult, executionResults) {
      try {
        const logData = {
          timestamp: new Date().toISOString(),
          intent: intentResult.intent,
          ai_provider: intentResult.ai_provider,
          execution_results: executionResults,
          project_id: currentProjectId,
          plan_id: editingPlanId,
          post_id: editingPostId
        };

        console.log('📊 意図実行ログ:', logData);
        // 必要に応じてFirestoreにログ保存も可能
        
      } catch (error) {
        console.error('❌ ログ記録エラー:', error);
      }
    }

// ========== parseNaturalConfirmation ==========
function parseNaturalConfirmation(userInput) {
      const input = userInput.toLowerCase().trim();
      const selectedActions = [];

      // 否定的な応答・キャンセル
      if (input.includes('いいえ') || input.includes('no') || input.includes('やめ') ||
          input.includes('キャンセル') || input.includes('何もしない') || input.includes('変更しない')) {
        return []; // 空配列でキャンセル扱い
      }

      // 明示的な選択指示を解析
      if (input.includes('投稿のみ') || input.includes('投稿だけ') ||
          input.includes('この投稿だけ') || input.includes('今回だけ') ||
          input.includes('一回だけ')) {
        selectedActions.push('post_only');
      }

      if (input.includes('プラン') || input.includes('設定') ||
          input.includes('今後') || input.includes('自動投稿')) {
        selectedActions.push('plan_included');
      }

      if (input.includes('プロジェクト') || input.includes('全体') ||
          input.includes('すべて') || input.includes('全て') ||
          input.includes('概要') || input.includes('要約')) {
        selectedActions.push('project_wide');
      }

      // 明示的な選択がある場合はそれを返す
      if (selectedActions.length > 0) {
        return selectedActions;
      }

      // 一般的な肯定的応答（デフォルト動作）
      if (input.includes('はい') || input.includes('yes') || input.includes('ok') ||
          input.includes('更新') || input.includes('反映') || input.includes('お願い') ||
          input.includes('そうして') || input.includes('適用')) {
        return ['plan_included']; // デフォルトでプラン更新のみ
      }

      // 不明
      return null;
    }

// ========== removeConfirmationOptions ==========
function removeConfirmationOptions() {
      const optionsDiv = document.querySelector('.confirmation-options');
      if (optionsDiv) {
        optionsDiv.remove();
      }
    }

// ========== setPendingConfirmation ==========
function setPendingConfirmation(intentResult, userInput) {
      pendingConfirmation = {
        intent: intentResult,
        userInput: userInput,
        timestamp: Date.now(),
        postId: editingPostId,
        planId: editingPlanId,
        updatedPost: document.getElementById('generated-post-content')?.textContent || ''
      };
      console.log('⏳ 確認待ち状態設定:', pendingConfirmation);
    }

// ========== shouldRequestConfirmation ==========
function shouldRequestConfirmation(intent) {
      const triggers = [
        // プラン設定に影響する変更
        intent.plan_update_required,
        // ブランド調整や大きな変更
        intent.intent_type === 'brand_adjustment',
        // 高い信頼度で範囲が広い変更
        intent.confidence >= 0.8 && intent.target_scope !== 'this_post',
        // 初回の大きなスタイル変更
        intent.intent_type === 'style_change' && !hasRecentStyleChanges()
      ];

      const needsConfirmation = triggers.some(trigger => trigger);
      console.log('🤔 確認必要性判定:', {
        intent_type: intent.intent_type,
        target_scope: intent.target_scope,
        confidence: intent.confidence,
        plan_update_required: intent.plan_update_required,
        needsConfirmation: needsConfirmation
      });

      return needsConfirmation;
    }
