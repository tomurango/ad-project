/**
 * prompt-assistant.js
 * Prompt Assistant System
 * Provides intelligent prompt generation and improvement suggestions
 * 
 * Total functions: 16
 * Extracted from: index.html
 */

// ========== addPromptAssistantMessage ==========
function addPromptAssistantMessage(message) {
      const chatMessages = document.getElementById('prompt-chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'assistant-message';
      messageDiv.innerHTML = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid var(--warning);">
          <div style="font-weight: bold; color: #856404; margin-bottom: 5px;">🤖 指示文アシスタント</div>
          ${escapeAndFormatMessage(message)}
        </div>
      `;
      chatMessages.appendChild(messageDiv);
      scrollPromptToBottom();
    }

// ========== addPromptUserMessage ==========
function addPromptUserMessage(message) {
      const chatMessages = document.getElementById('prompt-chat-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = 'user-message';
      messageDiv.innerHTML = `
        <div style="background: #dcf8c6; padding: 15px; border-radius: 12px; margin-bottom: 15px; margin-left: 50px; border-right: 4px solid #25d366;">
          <div style="font-weight: bold; color: #075e54; margin-bottom: 5px;">👤 あなた</div>
          ${escapeAndFormatMessage(message)}
        </div>
      `;
      chatMessages.appendChild(messageDiv);
      scrollPromptToBottom();
    }

// ========== closePromptAssistant ==========
function closePromptAssistant() {
      document.getElementById('prompt-assistant-modal').style.display = 'none';
      document.getElementById('generated-prompt-section').style.display = 'none';
      document.getElementById('prompt-user-input').value = '';
    }

// ========== convertModificationToCreationPrompt ==========
async function convertModificationToCreationPrompt(userInput, intent, currentPlanInfo) {
      // 「プランにも反映させたい」のような反映要求は変換しない
      if (userInput.includes('プランに') && (userInput.includes('反映') || userInput.includes('適用'))) {
        console.log('🔄 プラン反映要求のため変換をスキップ');
        return generateFallbackCreationPrompt(userInput, intent);
      }

      const conversionPrompt = `
あなたはSNS投稿管理システムのAIアシスタントです。ユーザーの修正指示を、将来の投稿作成で使用できる明確な作成指示に変換してください。

重要：以下は変換しないでください：
- 「プランに反映」「設定に保存」などの管理操作
- 「こんにちは」などの挨拶
- 一般的な質問や確認

【ユーザーの修正指示】
"${userInput}"

【意図解析結果】
- 修正タイプ: ${intent.intent_type}
- 変更点: ${intent.specific_changes.join(', ')}

【現在のプラン設定】
- 名前: ${currentPlanInfo.name}
- プラットフォーム: ${currentPlanInfo.platform}
- 既存カスタムプロンプト: ${currentPlanInfo.customPrompt || 'なし'}

【変換ルール】
1. 具体的な投稿スタイルや内容の修正指示のみを変換
2. 明確で具体的な作成指示にする
3. 既存のカスタムプロンプトとの重複を避ける
4. プラットフォームに適した形式にする

【例】
修正指示: "もっとカジュアルにして"
→ 作成指示: "カジュアルで親しみやすい文体で投稿を作成してください"

修正指示: "絵文字を追加して"
→ 作成指示: "適切な絵文字を使って親しみやすい投稿を作成してください"

修正指示: "もう少しユースケースに沿った形にして欲しい"
→ 作成指示: "実際のユースケースや具体的な使用場面を重視した投稿を作成してください"

変換できない場合は「SKIP」と回答してください。
変換後の作成指示のみを回答してください。説明は不要です。`;

      try {
        const result = await aiServiceManager.generateText(conversionPrompt, {
          maxTokens: 200,
          temperature: 0.5
        });

        if (result.success) {
          const convertedPrompt = (result.content || result.text || '').trim();
          console.log('🔄 修正指示変換結果:', convertedPrompt);

          // 「SKIP」や不適切な応答の場合はフォールバックを使用
          if (convertedPrompt === 'SKIP' ||
              convertedPrompt.includes('反映') ||
              convertedPrompt.includes('利用してください') ||
              convertedPrompt.length < 10) {
            console.log('🔄 不適切な変換結果のためフォールバックを使用');
            return generateFallbackCreationPrompt(userInput, intent);
          }

          return convertedPrompt;
        } else {
          throw new Error('変換に失敗しました');
        }
      } catch (error) {
        console.error('❌ 修正指示変換エラー:', error);
        // フォールバック：基本的な変換ルール
        return generateFallbackCreationPrompt(userInput, intent);
      }
    }

// ========== displayCurrentSuggestion ==========
function displayCurrentSuggestion() {
      if (currentSuggestionIndex < 0 || currentSuggestionIndex >= suggestionHistory.length) {
        return;
      }

      const suggestion = suggestionHistory[currentSuggestionIndex];

      // グローバル変数を更新
      promptSuggestion = suggestion.promptSuggestion;
      improvedContent = suggestion.improvedContent;

      // 入力欄を更新
      document.getElementById('improve-instruction').value = suggestion.instruction;

      // プロンプト提案を表示
      document.getElementById('prompt-suggestion-text').textContent = suggestion.promptSuggestion;

      // 修正後のカスタムプロンプトを表示
      const updatedPrompt = currentCustomPrompt
        ? `${currentCustomPrompt}\n${suggestion.promptSuggestion}`
        : suggestion.promptSuggestion;
      document.getElementById('updated-custom-prompt').textContent = updatedPrompt;

      // 投稿プレビューを表示
      if (suggestion.improvedContent) {
        document.getElementById('improved-post-content').textContent = suggestion.improvedContent;
        document.getElementById('improved-preview-section').style.display = 'block';
      } else {
        document.getElementById('improved-preview-section').style.display = 'none';
      }

      // 提案セクションを表示
      const suggestionSection = document.getElementById('prompt-suggestion-section');
      if (suggestionSection) suggestionSection.style.display = 'block';

      // 反復調整UIを表示
      const genBtn = document.getElementById('generate-suggestion-btn');
      if (genBtn) genBtn.style.display = 'none';

      const regenBtn = document.getElementById('regenerate-suggestion-btn');
      if (regenBtn) regenBtn.style.display = 'inline-block';

      const hintEl = document.getElementById('refinement-hint');
      if (hintEl) hintEl.style.display = 'block';
    }

// ========== editPrompt ==========
function editPrompt() {
      const currentPrompt = document.getElementById('generated-prompt-content').textContent;
      const editInstruction = prompt('どのような修正をしたいですか？', '');
      
      if (editInstruction && editInstruction.trim()) {
        addPromptUserMessage(`修正指示: ${editInstruction}`);
        promptChatHistory.push({ role: 'user', content: `修正指示: ${editInstruction}` });
        
        const modifiedPrompt = `以下の指示文を修正してください：

【現在の指示文】
${currentPrompt}

【修正指示】
${editInstruction}

修正後の指示文のみを返答してください。`;

        generatePromptWithCustomPrompt(modifiedPrompt);
      }
    }

// ========== handlePromptCompositionEnd ==========
function handlePromptCompositionEnd(event) {
      // 少し遅延させてフラグをfalseに
      setTimeout(() => {
        isPromptComposing = false;
      }, 100);
    }

// ========== handlePromptCompositionStart ==========
function handlePromptCompositionStart(event) {
      isPromptComposing = true;
    }

// ========== handlePromptCompositionUpdate ==========
function handlePromptCompositionUpdate(event) {
      isPromptComposing = true;
    }

// ========== handlePromptInputKeydown ==========
function handlePromptInputKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey && !isPromptComposing && !event.isComposing) {
        event.preventDefault();
        sendPromptMessage();
      }
    }

// ========== navigateSuggestion ==========
function navigateSuggestion(direction) {
      const newIndex = currentSuggestionIndex + direction;

      if (newIndex < 0 || newIndex >= suggestionHistory.length) {
        return; // 範囲外
      }

      currentSuggestionIndex = newIndex;
      displayCurrentSuggestion();
      updateNavigationButtons();
    }

// ========== openPromptAssistant ==========
function openPromptAssistant() {
      document.getElementById('prompt-assistant-modal').style.display = 'block';
      
      // チャット履歴をリセット
      promptChatHistory = [];
      resetPromptChatMessages();
    }

// ========== resetPromptChatMessages ==========
function resetPromptChatMessages() {
      const chatMessages = document.getElementById('prompt-chat-messages');
      chatMessages.innerHTML = `
        <div class="assistant-message">
          <div style="background: #fff3cd; padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid var(--warning);">
            <div style="font-weight: bold; color: #856404; margin-bottom: 5px;">🤖 指示文アシスタント</div>
            AI投稿生成用の指示文作成をお手伝いします！<br>
            どのような投稿を作りたいか教えてください：<br>
            • どんな目的の投稿ですか？<br>
            • ターゲットは誰ですか？<br>
            • 伝えたいメッセージは？<br>
            • 避けたい表現はありますか？
          </div>
        </div>
      `;
    }

// ========== savePromptImprovement ==========
async function savePromptImprovement() {
      if (!promptSuggestion || !improvingPlanId) {
        alert('保存する内容がありません');
        return;
      }

      try {
        // 1. カスタムプロンプトを更新（メイン処理）
        const planResult = await window.electronAPI.invoke('firebase-get-plan', currentProjectId, improvingPlanId);

        if (!planResult.success) {
          throw new Error('プラン情報の取得に失敗しました');
        }

        const plan = planResult.plan;
        const updatedPrompt = plan.customPrompt
          ? `${plan.customPrompt}\n${promptSuggestion}`
          : promptSuggestion;

        await window.electronAPI.invoke('firebase-update-plan',
          currentProjectId,
          improvingPlanId,
          { customPrompt: updatedPrompt }
        );

        // 2. 投稿も更新（チェックボックスがONの場合のみ）
        const applyToCurrentPost = document.getElementById('apply-to-current-post').checked;
        let postUpdated = false;

        if (applyToCurrentPost && improvedContent && improvingPostId) {
          const updateResult = await window.electronAPI.invoke('firebase-update-post',
            currentProjectId,
            improvingPlanId,
            improvingPostId,
            { content: improvedContent }
          );

          if (updateResult.success) {
            postUpdated = true;
          }
        }

        const message = '✅ カスタムプロンプトを保存しました' + (postUpdated ? '\n📝 この投稿も更新しました' : '');
        alert(message);

        closeImproveModal();

        // 投稿一覧を再読み込み
        if (currentPlanId) {
          await displayPlanPosts(currentPlanId);
        }

      } catch (error) {
        console.error('❌ プロンプト保存エラー:', error);
        alert('プロンプト保存に失敗しました: ' + error.message);
      }
    }

// ========== scrollPromptToBottom ==========
function scrollPromptToBottom() {
      const chatArea = document.getElementById('prompt-assistant-chat');
      chatArea.scrollTop = chatArea.scrollHeight;
    }

// ========== sendPromptMessage ==========
async function sendPromptMessage() {
      const userInput = document.getElementById('prompt-user-input');
      const message = userInput.value.trim();
      
      if (!message) return;
      
      // ユーザーメッセージを表示
      addPromptUserMessage(message);
      userInput.value = '';
      
      // チャット履歴に追加
      promptChatHistory.push({ role: 'user', content: message });
      
      try {
        // AI応答を生成
        await generatePromptAssistantResponse(message);
      } catch (error) {
        console.error('プロンプトAI応答生成エラー:', error);
        addPromptAssistantMessage('申し訳ありません。エラーが発生しました。もう一度お試しください。');
      }
    }
