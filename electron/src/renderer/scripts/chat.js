/**
 * chat.js
 * Chat and Conversation Management
 * Manages AI chat interface, message history, and conversation flows
 * 
 * Total functions: 18
 * Extracted from: index.html
 */

// ========== addAssistantMessage ==========
function addAssistantMessage(message) {
      const allMessagesDiv = document.getElementById('all-messages');

      const messageHTML = `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
          <div style="background: white; border: 1px solid #e1e8ed; padding: 12px 16px; border-radius: 18px; max-width: 70%; word-wrap: break-word; border-bottom-left-radius: 6px;">
            <div style="font-size: 12px; color: #657786; margin-bottom: 5px;">🤖 アシスタント</div>
            ${escapeAndFormatMessage(message)}
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', messageHTML);
      scrollToBottom();

      // チャット履歴にも追加
      chatHistory.push({ role: 'assistant', content: message });
    }

// ========== addAssistantMessageToHistory ==========
function addAssistantMessageToHistory(content) {
      const allMessagesDiv = document.getElementById('all-messages');

      if (!allMessagesDiv) {
        console.error('❌ all-messages要素が見つかりません（アシスタントメッセージ）');
        return;
      }

      const messageHTML = `
        <div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">
          <div style="background: white; border: 1px solid #e1e8ed; padding: 12px 16px; border-radius: 18px; max-width: 70%; word-wrap: break-word; border-bottom-left-radius: 6px;">
            <div style="font-size: 12px; color: #657786; margin-bottom: 5px;">🤖 アシスタント</div>
            ${content}
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', messageHTML);
    }

// ========== addMessageToChat ==========
function addMessageToChat(sender, message) {
      const chatContainer = document.getElementById('aiChat');
      const messageDiv = document.createElement('div');
      
      if (sender === 'user') {
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `<strong>あなた</strong><br>${message}`;
      } else {
        messageDiv.className = 'ai-message';
        messageDiv.innerHTML = `<strong>AI</strong><br>${message}`;
      }
      
      chatContainer.appendChild(messageDiv);
      
      // 最新メッセージまでスクロール
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

// ========== addSessionDivider ==========
function addSessionDivider(createdAt) {
      const allMessagesDiv = document.getElementById('all-messages');

      if (!allMessagesDiv) {
        console.error('❌ all-messages要素が見つかりません');
        return;
      }

      const date = new Date(createdAt?.seconds * 1000 || createdAt);
      const dateString = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const dividerHTML = `
        <div style="text-align: center; margin: 20px 0; color: #657786; font-size: 12px;">
          <div style="display: inline-block; background: #f8f9fa; padding: 6px 12px; border-radius: 12px; border: 1px solid #e1e8ed;">
            📅 ${dateString}
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', dividerHTML);
    }

// ========== addUserMessage ==========
function addUserMessage(message, skipHistory = false) {
      const allMessagesDiv = document.getElementById('all-messages');

      const messageHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
          <div style="background: var(--primary); color: white; padding: 12px 16px; border-radius: 18px; max-width: 70%; word-wrap: break-word; border-bottom-right-radius: 6px;">
            ${escapeAndFormatMessage(message)}
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', messageHTML);
      scrollToBottom();

      // チャット履歴にも追加（skipHistoryがtrueの場合は追加しない）
      if (!skipHistory) {
        chatHistory.push({ role: 'user', content: message });
      }
    }

// ========== addUserMessageToHistory ==========
function addUserMessageToHistory(content) {
      const allMessagesDiv = document.getElementById('all-messages');

      if (!allMessagesDiv) {
        console.error('❌ all-messages要素が見つかりません（ユーザーメッセージ）');
        return;
      }

      const messageHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
          <div style="background: var(--primary); color: white; padding: 12px 16px; border-radius: 18px; max-width: 70%; word-wrap: break-word; border-bottom-right-radius: 6px;">
            ${content}
          </div>
        </div>
      `;

      allMessagesDiv.insertAdjacentHTML('beforeend', messageHTML);
    }

// ========== addWelcomeMessage ==========
function addWelcomeMessage() {
      const allMessagesDiv = document.getElementById('all-messages');

      if (editingPostId && editingPlanId) {
        // 既存投稿の編集の場合
        addAssistantMessageToHistory('こんにちは！この投稿の内容についてご相談がある場合は、お気軽にお話しください。');
      } else {
        // 新規投稿作成の場合
        const welcomeMessage = `
こんにちは！SNS投稿のお手伝いをします。<br>
どのような内容の投稿を作成したいですか？例えば：<br>
• 新機能のお知らせ<br>
• ユーザー向けのヒント<br>
• プロダクトの価値訴求<br>
• コミュニティ向けメッセージ
        `;
        addAssistantMessageToHistory(welcomeMessage);
      }
    }

// ========== escapeAndFormatMessage ==========
function escapeAndFormatMessage(message) {
      // 安全な文字列確保
      if (message === null || message === undefined) {
        message = '';
      }
      if (typeof message !== 'string') {
        message = String(message);
      }

      // HTMLエスケープ
      const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      // マークダウンライクな簡単なフォーマット
      let formatted = escaped
        // **太字**
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // *斜体*
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        // 箇条書き（•で始まる行）
        .replace(/^• (.+)$/gm, '<div style="margin: 5px 0; padding-left: 15px;">• $1</div>')
        // 改行をbrタグに
        .replace(/\n/g, '<br>');
      
      return formatted;
    }

// ========== extractConversationInsights ==========
function extractConversationInsights() {
      const insights = [];

      chatHistory.forEach((message, index) => {
        if (message.role === 'user') {
          // ユーザーの要求からプロジェクト関連情報を抽出
          const text = message.content.toLowerCase();

          if (text.includes('ユーザー') || text.includes('利用者')) {
            insights.push('- ユーザー視点を重視する姿勢');
          }
          if (text.includes('技術') || text.includes('実装')) {
            insights.push('- 技術的な実装に関する言及');
          }
          if (text.includes('改善') || text.includes('最適化')) {
            insights.push('- 継続的改善を重要視');
          }
          if (text.includes('デザイン') || text.includes('UI')) {
            insights.push('- ユーザーエクスペリエンスへの配慮');
          }
        }
      });

      // 重複を削除して返す
      return [...new Set(insights)].slice(0, 5);
    }

// ========== extractConversationSummary ==========
function extractConversationSummary(messages) {
      const summary = {
        userPreferences: [],
        improvements: [],
        patterns: []
      };

      messages.forEach(message => {
        if (message.role === 'user') {
          const content = message.content.toLowerCase();

          // トーン・スタイル設定を検出
          if (content.includes('カジュアル') || content.includes('親しみ')) {
            summary.userPreferences.push('casual_tone');
          }
          if (content.includes('フォーマル') || content.includes('丁寧')) {
            summary.userPreferences.push('formal_tone');
          }
          if (content.includes('絵文字') || content.includes('emoji')) {
            summary.userPreferences.push('emoji_usage');
          }
          if (content.includes('短く') || content.includes('簡潔')) {
            summary.userPreferences.push('concise_style');
          }
          if (content.includes('具体的') || content.includes('詳細')) {
            summary.userPreferences.push('detailed_style');
          }

          // 改善指示を検出
          if (content.includes('読みやすく') || content.includes('わかりやすく')) {
            summary.improvements.push('readability');
          }
          if (content.includes('興味') || content.includes('エンゲージ')) {
            summary.improvements.push('engagement');
          }
        }
      });

      // 重複除去
      summary.userPreferences = [...new Set(summary.userPreferences)];
      summary.improvements = [...new Set(summary.improvements)];

      return summary;
    }

// ========== extractLearningInsights ==========
function extractLearningInsights(conversations) {
      const insights = new Set();

      conversations.forEach(conversation => {
        if (conversation.summary && conversation.summary.userPreferences) {
          conversation.summary.userPreferences.forEach(pref => {
            if (pref === 'casual_tone') insights.add('カジュアルなトーン');
            if (pref === 'emoji_usage') insights.add('絵文字使用');
            if (pref === 'concise_style') insights.add('簡潔なスタイル');
            if (pref === 'detailed_style') insights.add('詳細なスタイル');
          });
        }
      });

      return Array.from(insights).slice(0, 3); // 最大3つまで
    }

// ========== initializeUnifiedChat ==========
async function initializeUnifiedChat() {
      const allMessagesDiv = document.getElementById('all-messages');
      const loadingIndicator = document.getElementById('loading-indicator');

      // ローディング表示
      loadingIndicator.style.display = 'block';
      allMessagesDiv.innerHTML = '';

      try {
        // 過去の会話履歴を読み込み
        await loadAndDisplayPreviousConversations();

        // ウェルカムメッセージまたは続行メッセージを追加
        addWelcomeMessage();

      } catch (error) {
        console.error('❌ 統一チャット初期化エラー:', error);
        // エラー時はウェルカムメッセージのみ表示
        addWelcomeMessage();
      } finally {
        loadingIndicator.style.display = 'none';
      }
    }

// ========== loadAndDisplayPreviousConversations ==========
async function loadAndDisplayPreviousConversations() {
      if (!editingPostId || !editingPlanId || !currentProjectId) {
        // 新規投稿の場合は過去の履歴なし
        return;
      }

      console.log('📚 過去の会話履歴を読み込み中...');

      try {
        const result = await window.electronAPI.invoke('get-post-conversations',
          currentProjectId, editingPlanId, editingPostId);

        if (result.success && result.conversations && result.conversations.length > 0) {
          console.log(`✅ ${result.conversations.length}件の過去の会話を読み込み`);

          // 日付順にソート（古い順）
          const sortedConversations = result.conversations.sort((a, b) => {
            const dateA = new Date(a.createdAt?.seconds * 1000 || a.createdAt);
            const dateB = new Date(b.createdAt?.seconds * 1000 || b.createdAt);
            return dateA - dateB;
          });

          // 各会話のメッセージを時系列で表示
          sortedConversations.forEach((conversation, conversationIndex) => {
            // 会話セッション区切りを表示
            addSessionDivider(conversation.createdAt);

            // メッセージを順番に表示
            if (conversation.messages && conversation.messages.length > 0) {
              conversation.messages.forEach(message => {
                if (message.role === 'user') {
                  addUserMessageToHistory(message.content);
                } else if (message.role === 'assistant') {
                  addAssistantMessageToHistory(message.content);
                }
              });
            }
          });
        } else {
          console.log('ℹ️ 表示する会話履歴がありません:', {
            success: result.success,
            hasConversations: !!result.conversations,
            length: result.conversations?.length || 0
          });
        }
      } catch (error) {
        console.error('❌ 会話履歴読み込みエラー:', error);
      }
    }

// ========== processUserResponse ==========
async function processUserResponse(userInput) {
      try {
        // 確認待ち状態の場合
        if (pendingConfirmation) {
          console.log('🔍 確認待ち中のユーザー応答:', userInput);

          const actionTypes = parseNaturalConfirmation(userInput);
          if (actionTypes && actionTypes.length > 0) {

            // ボタンUIを削除（もしあれば）
            removeConfirmationOptions();

            // ユーザーの選択をチャット履歴に追加
            const actionLabels = {
              'post_only': '📝 この投稿のみ修正',
              'plan_included': '📋 プラン設定にも反映',
              'project_wide': '🎯 プロジェクト全体に反映'
            };

            const selectedLabels = actionTypes.map(action => actionLabels[action]).join(', ');
            addUserMessage(`選択した適用範囲: ${selectedLabels}`);

            // 複数選択に対応した処理を実行
            await executeMultipleConfirmedActions(actionTypes, pendingConfirmation);

            // 確認待ち状態をクリア
            pendingConfirmation = null;
            return;
          } else if (actionTypes && actionTypes.length === 0) {
            // キャンセル
            cancelConfirmation();
            return;
          } else {
            console.log('❓ 応答を理解できませんでした。確認オプションを再表示');
            addAssistantMessage('申し訳ございません。より具体的にお答えください。例：「プランにも反映して」「この投稿だけ」「プロジェクト全体にも適用」');
            return;
          }
        }

        // 通常の会話処理
        const currentPostContent = document.getElementById('generated-post-content')?.textContent || '';
        const currentPlanInfo = await getCurrentPlanData(editingPlanId);

        if (!currentPlanInfo) {
          addAssistantMessage('プラン情報の取得に失敗しました。');
          return;
        }

        // 新しい確認付き応答生成を使用
        const result = await generateResponseWithConfirmation(userInput, currentPostContent, currentPlanInfo);

        if (result.success) {
          // 確認付きまたは通常の応答を表示
          if (result.requiresConfirmation) {
            displayResponseWithConfirmation(result);
          } else {
            // 従来のシステムの結果を表示（投稿内容の表示も更新）
            if (result.updatedPost) {
              document.getElementById('generated-post-content').textContent = result.updatedPost;
              document.getElementById('generated-post-section').style.display = 'block';
              // 投稿更新メッセージはaddAssistantMessage内で自動的にchatHistoryに追加される
            }

            // 結果メッセージを生成
            let resultMessage;
            if (result.message) {
              resultMessage = result.message;
            } else if (result.intent && result.results) {
              resultMessage = generateResultMessage({ intent: result.intent }, result);
            } else {
              // 修正指示でない場合（挨拶など）
              if (userInput.toLowerCase().includes('こんにちは') || userInput.toLowerCase().includes('hello')) {
                resultMessage = 'こんにちは！投稿の修正や調整についてお聞かせください。例：「もっとカジュアルにして」「絵文字を追加して」など';
              } else {
                resultMessage = '投稿の修正や調整について具体的にお聞かせください。例：「もっとカジュアルにして」「短くして」「ユースケースに沿った内容にして」など';
              }
            }
            addAssistantMessage(resultMessage);
          }
        } else {
          // AI処理エラーの場合は明確にエラーメッセージを表示
          let errorMessage;
          if (result.isAPIError) {
            if (result.error.includes('503') || result.error.includes('overloaded')) {
              errorMessage = `🔧 AIサービスが一時的に過負荷状態です。しばらく時間をおいてから再度お試しください。\n\n詳細: ${result.error}`;
            } else if (result.error.includes('401') || result.error.includes('unauthorized')) {
              errorMessage = `🔑 AI APIの認証に問題があります。設定をご確認ください。\n\n詳細: ${result.error}`;
            } else {
              errorMessage = `❌ AI処理中にエラーが発生しました。ネットワーク接続やAI設定をご確認ください。\n\n詳細: ${result.error}`;
            }
          } else {
            errorMessage = `❌ 処理中にエラーが発生しました: ${result.error}`;
          }

          addAssistantMessage(errorMessage);
          console.error('🚫 AI処理エラーのため更新処理を中止:', result.error);
        }

      } catch (error) {
        console.error('❌ ユーザー応答処理エラー:', error);
        console.error('❌ エラースタック:', error.stack);
        console.error('❌ 現在の状態:', {
          pendingConfirmation,
          editingPostId,
          editingPlanId,
          userInput
        });
        addAssistantMessage(`処理中にエラーが発生しました: ${error.message}`);
      }
    }

// ========== resetChatMessages ==========
function resetChatMessages() {
      const chatMessages = document.getElementById('chat-messages');
      chatMessages.innerHTML = `
        <div class="assistant-message">
          <div style="background: #e3f2fd; padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid var(--primary);">
            <div style="font-weight: bold; color: #1565c0; margin-bottom: 5px;">🤖 アシスタント</div>
            こんにちは！SNS投稿のお手伝いをします。<br>
            どのような内容の投稿を作成したいですか？例えば：<br>
            • 新機能のお知らせ<br>
            • ユーザー向けのヒント<br>
            • プロダクトの価値訴求<br>
            • コミュニティ向けメッセージ
          </div>
        </div>
      `;
    }

// ========== resetChatMessagesForEdit ==========
function resetChatMessagesForEdit(post) {
      const chatMessages = document.getElementById('chat-messages');
      const scheduledDate = new Date(post.scheduledAt).toLocaleString('ja-JP');
      chatMessages.innerHTML = `
        <div class="assistant-message">
          <div style="background: #fff3cd; padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid var(--warning);">
            <div style="font-weight: bold; color: #856404; margin-bottom: 5px;">📝 編集モード</div>
            予約投稿の修正をお手伝いします！<br>
            <strong>予定日時:</strong> ${scheduledDate}<br><br>
            現在の投稿内容を下に表示しています。どのような修正をしたいか教えてください：<br>
            • もっとカジュアルに<br>
            • 具体的な効果を強調<br>
            • 短くまとめる<br>
            • 別の角度からアプローチ
          </div>
        </div>
      `;
    }

// ========== saveCurrentConversation ==========
async function saveCurrentConversation() {
      try {
        if (!chatHistory || chatHistory.length === 0) {
          console.log('保存する会話がありません');
          return;
        }

        console.log('💾 会話記録を保存中...', {
          projectId: currentProjectId,
          planId: editingPlanId,
          postId: editingPostId,
          messageCount: chatHistory.length
        });

        // 学習データを抽出
        const summary = extractConversationSummary(chatHistory);

        const conversationData = {
          projectId: currentProjectId,
          planId: editingPlanId,
          postId: editingPostId,
          messages: chatHistory,
          summary: summary
        };

        const result = await window.electronAPI.invoke('save-conversation', conversationData);

        if (result.success) {
        } else {
          console.error('❌ 会話記録保存失敗:', result.error);
        }

      } catch (error) {
        console.error('❌ 会話記録保存エラー:', error);
      }
    }

// ========== sendMessage ==========
async function sendMessage() {
      const input = document.getElementById('aiInput');
      const message = input.value.trim();
      
      if (!message) {
        alert('❌ メッセージを入力してください。');
        return;
      }
      
      // ユーザーメッセージを表示
      addMessageToChat('user', message);
      
      // 入力フィールドをクリア
      input.value = '';
      
      console.log('🤖 AIに相談送信:', message);
      
      try {
        const result = await window.electronAPI.invoke('chat-with-ai', message);
        if (result.success) {
          // AI応答を表示
          addMessageToChat('ai', result.response);
        } else {
          addMessageToChat('ai', `申し訳ございません。エラーが発生しました：${result.error}`);
        }
      } catch (error) {
        console.error('❌ AI相談エラー:', error);
        addMessageToChat('ai', '申し訳ございません。AIサービスに接続できませんでした。Ollamaサービスが起動していることを確認してください。');
      }
    }
