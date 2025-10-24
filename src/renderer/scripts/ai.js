/**
 * ai.js
 * AI Service Manager Integration
 * Handles AI configuration, provider management, and AI-powered content generation
 * 
 * Total functions: 52
 * Extracted from: index.html
 */

// ========== applyGeneratedPrompt ==========
function applyGeneratedPrompt() {
      const promptContent = document.getElementById('generated-prompt-content').textContent;
      if (!promptContent) return;
      
      // プラン作成フォームの指示文テキストエリアに設定
      const customPromptField = document.getElementById('custom-prompt');
      if (customPromptField) {
        customPromptField.value = promptContent;
        closePromptAssistant();
        alert('✅ 指示文を適用しました！');
      } else {
        alert('❌ 指示文の適用に失敗しました');
      }
    }

// ========== checkOllamaStatus ==========
async function checkOllamaStatus() {
      const statusEl = document.getElementById('ollama-status');
      try {
        statusEl.innerHTML = '⏳ 確認中...';
        statusEl.style.color = 'var(--warning)';
        
        const result = await window.electronAPI.invoke('ollama-health-check');
        if (result.success) {
          statusEl.innerHTML = '✅ 動作中';
          statusEl.style.color = 'var(--success)';
        } else {
          statusEl.innerHTML = '❌ 停止中';
          statusEl.style.color = 'var(--danger)';
        }
      } catch (error) {
        statusEl.innerHTML = '❌ エラー';
        statusEl.style.color = 'var(--danger)';
      }
    }

// ========== closeAIConfig ==========
function closeAIConfig() {
      const modal = document.getElementById('ai-config-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

// ========== createAIConfigModal ==========
function createAIConfigModal() {
      
      // 既存のモーダルがあれば削除
      const existingModal = document.getElementById('ai-config-modal');
      if (existingModal) {
        existingModal.remove();
      }
      
      const modal = document.createElement('div');
      modal.id = 'ai-config-modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2000;
        overflow-y: auto;
      `;
      
      modal.innerHTML = `
        <div style="background: white; margin: 50px auto; width: 90%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
          <div style="background: var(--primary); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">🤖 AI設定</h3>
            <button onclick="closeAIConfig()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 5px;">×</button>
          </div>
          <div style="padding: 20px;">
            <div id="ai-config-content">
              <!-- 設定内容がここに動的に生成される -->
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button onclick="saveAIConfig()" style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; flex: 1;">💾 保存</button>
              <button onclick="closeAIConfig()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">キャンセル</button>
            </div>
          </div>
        </div>
      `;
      
      // クリック時にモーダルを閉じる（背景クリック）
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeAIConfig();
        }
      });
      
      document.body.appendChild(modal);
    }

// ========== createCrossPlatformCampaign ==========
function createCrossPlatformCampaign() { alert('統合キャンペーンを作成します'); }

// ========== displayGeneratedPrompt ==========
function displayGeneratedPrompt(promptContent) {
      document.getElementById('generated-prompt-content').textContent = promptContent;
      document.getElementById('generated-prompt-section').style.display = 'block';
    }

// ========== editGeneratedTweet ==========
function editGeneratedTweet() {
      const currentContent = document.getElementById('tweet-preview-content').textContent;
      const newContent = prompt('投稿内容を編集してください:', currentContent);
      
      if (newContent !== null) {
        if (newContent.length > 280) {
          alert('❌ 投稿は280文字以内で入力してください。');
          return;
        }
        document.getElementById('tweet-preview-content').textContent = newContent;
      }
    }

// ========== ensureAIServiceManagerReady ==========
async function ensureAIServiceManagerReady() {
      let attempts = 0;
      const maxAttempts = 10;

      while (!window.aiServiceManager && attempts < maxAttempts) {
        console.log(`⏳ AIServiceManager準備待ち... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.aiServiceManager) {
        console.warn('⚠️ AIServiceManager準備タイムアウト - フォールバック実行');
        await initializeAIManagerFallback();
      }
    }

// ========== generateAITweet ==========
async function generateAITweet() {
      if (!currentProjectData) {
        alert('プロジェクトデータが読み込まれていません');
        return;
      }
      
      // プラン選択
      const plans = await getProjectPlansForSelection();
      if (!plans || plans.length === 0) {
        alert('このプロジェクトにはプランがありません。まずプランを作成してください。');
        return;
      }
      
      // プラン選択ダイアログ
      let selectedPlanId = null;
      if (plans.length === 1) {
        selectedPlanId = plans[0].id;
      } else {
        const planOptions = plans.map((plan, index) => `${index + 1}. ${plan.name} (${plan.platform})`).join('\n');
        const selection = prompt(`投稿先プランを選択してください:\n\n${planOptions}\n\n番号を入力:`);
        
        if (selection && !isNaN(selection)) {
          const index = parseInt(selection) - 1;
          if (index >= 0 && index < plans.length) {
            selectedPlanId = plans[index].id;
          }
        }
      }
      
      if (!selectedPlanId) {
        alert('プランが選択されませんでした');
        return;
      }

      try {
        const result = await window.electronAPI.invoke('generate-project-tweet', currentProjectData);

        if (result.success && result.tweet) {
          const scheduleNow = confirm(`AI生成投稿:\n\n${result.tweet}\n\n今すぐ予約投稿しますか？`);
          
          if (scheduleNow) {
            const scheduledTime = new Date();
            scheduledTime.setMinutes(scheduledTime.getMinutes() + 5); // 5分後に予約
            
            const selectedPlan = plans.find(p => p.id === selectedPlanId);

            const postData = {
              projectId: currentProjectId,
              planId: selectedPlanId,
              content: result.tweet,
              scheduledAt: scheduledTime.toISOString(),
              status: 'scheduled',
              type: 'ai_generated',
              platform: selectedPlan?.platform || 'twitter'
            };

            const createResult = await window.electronAPI.invoke('create-post', postData);
            
            if (createResult.success) {
              await loadProjectPosts(currentProjectId);
              alert('AI生成投稿を予約しました！');
            } else {
              alert('投稿予約に失敗しました');
            }
          }
        } else {
          alert('AI投稿生成に失敗しました');
        }
      } catch (error) {
        console.error('❌ AI投稿生成エラー:', error);
        alert('AI投稿生成でエラーが発生しました');
      }
    }

// ========== generateAssistantResponse ==========
async function generateAssistantResponse(userMessage) {
      // 投稿生成のキーワードをチェック
      const postGenerationKeywords = ['投稿', '作成', '書いて', 'ポスト', 'tweet', 'つぶやき', 'SNS'];
      const isPostGeneration = postGenerationKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isPostGeneration && chatHistory.length <= 3) {
        // 投稿生成要求の場合
        await generatePostContent(userMessage);
      } else {
        // 通常の会話の場合
        await generateConversationResponse(userMessage);
      }
    }

// ========== generateConfirmationMessage ==========
async function generateConfirmationMessage(intent, currentPostContent) {
      // 安全な値の確保
      const intentType = intent.intent_type || '内容修正';
      const targetScope = intent.target_scope || 'this_post';
      const specificChanges = Array.isArray(intent.specific_changes) ? intent.specific_changes.join(', ') : '文体・内容の調整';
      const suggestedPrompt = intent.suggested_plan_prompt || '調整内容をプラン設定に反映';

      const confirmationPrompt = `
あなたはSNS投稿アシスタントです。ユーザーの修正を行った後、今後の設定について自然で親しみやすい口調で確認してください。

【修正内容】
- 修正タイプ: ${intentType}
- 対象範囲: ${targetScope}
- 変更点: ${specificChanges}
- 推奨プラン更新: ${suggestedPrompt}

【状況】
投稿の修正は完了しています。この変更を今後の投稿にも適用するかユーザーに確認する必要があります。

【要求】
Claude Codeのような自然で親しみやすい口調で以下を含めて回答してください：
1. 修正完了の報告
2. 今後の設定についての提案・確認
3. 「はい」「いいえ」でも答えられることを伝える
4. 下に選択ボタンが表示されることを軽く触れる

回答例：
「投稿をカジュアルな文体に修正しました！

この変更は今後の投稿でも使用したいスタイルでしょうか？プラン設定に反映しておくと、自動投稿でも同じトーンが適用されます。

「はい」「いいえ」でお答えいただくか、下の選択肢からお選びください。」
`;

      try {
        const result = await aiServiceManager.generateText(confirmationPrompt, {
          maxTokens: 300,
          temperature: 0.7
        });

        if (result.success) {
          return result.text || result.content;
        } else {
          throw new Error(`AI応答生成失敗: ${result.error}`);
        }
      } catch (error) {
        console.error('確認メッセージ生成エラー:', error);
        // API障害時はエラーを返す
        throw error;
      }
    }

// ========== generateConversationResponse ==========
async function generateConversationResponse(userMessage) {
      const conversationHistory = chatHistory.slice(-4).map(msg => 
        `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
      ).join('\n');

      const prompt = `
あなたはSNS投稿作成のアシスタントです。ユーザーとの会話を通じて、最適な投稿内容を作成するお手伝いをします。

【プロジェクト情報】
${currentPostContext}

【これまでの会話】
${conversationHistory}

【最新のユーザーメッセージ】
${userMessage}

ユーザーの質問や要望に対して、親しみやすく、具体的でアドバイス的な返答をしてください。
投稿に関する相談であれば、具体的な提案やアイデアを含めてください。
      `;

      try {
        const result = await aiServiceManager.generateText(prompt, {
          maxTokens: 600,
          temperature: 0.7
        });

        if (result.success) {
          const response = result.content.trim();
          addAssistantMessage(response);
          // chatHistoryへの追加はaddAssistantMessage内で自動的に行われる
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('会話応答生成エラー:', error);

        // より具体的なエラーメッセージを表示
        let errorMessage = '申し訳ありません。応答生成中にエラーが発生しました。';
        const currentProvider = aiServiceManager.getCurrentProvider();

        if (currentProvider === 'ollama') {
          if (error.message && error.message.includes('ECONNREFUSED')) {
            errorMessage = `Ollamaサーバーに接続できません。\n\n以下をご確認ください：\n• Ollamaが起動しているか\n• http://localhost:11434 にアクセス可能か\n\nヘッダーから他のAIプロバイダーを選択することもできます。`;
          } else {
            errorMessage = `Ollama応答エラー: ${error.message}\n\n他のAIプロバイダーを試すか、Ollamaの設定をご確認ください。`;
          }
        } else if (error.message && error.message.includes('API')) {
          errorMessage = `${currentProvider}との通信でエラーが発生しました: ${error.message}\n\nAPIキーの設定をご確認いただくか、他のプロバイダーをお試しください。`;
        }

        addAssistantMessage(errorMessage);
      }
    }

// ========== generateCrossPlatformReport ==========
function generateCrossPlatformReport() { alert('統合レポートを生成します'); }

// ========== generateCustomPromptFromChat ==========
function generateCustomPromptFromChat() {
      if (!chatHistory || chatHistory.length === 0) {
        return null;
      }
      
      // ユーザーの指示を抽出
      const userMessages = chatHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .filter(content => {
          // 投稿生成指示以外の調整指示を抽出
          const adjustmentKeywords = [
            'もっと', 'より', '変更', '修正', '調整', '短く', '長く',
            'カジュアル', 'フォーマル', 'ハッシュタグ', 'トーン', 'スタイル',
            '親しみ', '専門的', 'シンプル', '詳細', '具体的', '抽象的'
          ];
          return adjustmentKeywords.some(keyword => content.includes(keyword));
        });
      
      if (userMessages.length === 0) {
        return null;
      }
      
      // 調整指示をまとめてプロンプトに変換
      const adjustmentInstructions = userMessages.map(msg => {
        // よくある指示パターンを標準的なプロンプトに変換
        let instruction = msg;
        
        if (msg.includes('カジュアル') || msg.includes('親しみ')) {
          instruction += '（カジュアルで親しみやすいトーンで作成）';
        }
        if (msg.includes('短く') || msg.includes('簡潔')) {
          instruction += '（簡潔に要点をまとめて）';
        }
        if (msg.includes('ハッシュタグ')) {
          instruction += '（関連するハッシュタグを適切に追加）';
        }
        if (msg.includes('具体的') || msg.includes('詳細')) {
          instruction += '（具体的で詳細な内容を含めて）';
        }
        
        return instruction;
      });
      
      const customPrompt = `以下のユーザー指示に基づいて投稿を作成してください：

${adjustmentInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

上記の指示を踏まえて、プロジェクト情報とプラン設定に合わせた投稿を生成してください。`;
      
      console.log('🎯 生成されたcustomPrompt:', customPrompt);
      return customPrompt;
    }

// ========== generateFallbackCreationPrompt ==========
function generateFallbackCreationPrompt(userInput, intent) {
      const input = userInput.toLowerCase();

      // プラン反映要求などの管理操作は変換しない
      if (input.includes('プランに') || input.includes('反映') || input.includes('適用') || input.includes('保存')) {
        return null; // nullを返してプラン更新をスキップ
      }

      if (input.includes('カジュアル') || input.includes('親しみ')) {
        return 'カジュアルで親しみやすい文体で投稿を作成してください';
      }
      if (input.includes('短く') || input.includes('簡潔')) {
        return '簡潔で要点を絞った投稿を作成してください';
      }
      if (input.includes('絵文字')) {
        return '適切な絵文字を使って親しみやすい投稿を作成してください';
      }
      if (input.includes('具体的') || input.includes('詳細')) {
        return '具体的で詳細な情報を含む投稿を作成してください';
      }
      if (input.includes('ユースケース') || input.includes('使用場面')) {
        return '実際のユースケースや具体的な使用場面を重視した投稿を作成してください';
      }
      if (input.includes('フォーマル') || input.includes('専門的')) {
        return 'フォーマルで専門的な文体で投稿を作成してください';
      }

      // 修正指示でない場合はnullを返す
      return null;
    }

// ========== generateFromProject ==========
async function generateFromProject() {
      const project = document.getElementById('projectSelect').value;
      if (!project) {
        alert('❌ プロジェクトを選択してください。');
        return;
      }

      console.log('🤖 プロジェクトからAI生成開始:', project);
      
      try {
        const result = await window.electronAPI.invoke('generate-tweet-from-project', project);
        if (result.success) {
          document.getElementById('tweetText').value = result.content;
          updatePreview();
          
          // 文字数カウント更新
          const count = result.content.length;
          document.getElementById('charCount').textContent = count;
          document.getElementById('charCount').style.color = count > 260 ? '#e0245e' : '#657786';
          
          alert('✅ AI生成が完了しました！');
        } else {
          alert(`❌ AI生成エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ AI生成エラー:', error);
        alert(`❌ AI生成エラー: ${error.message}`);
      }
    }

// ========== generateManualAutoPost ==========
async function generateManualAutoPost(planId) {
      if (!currentProjectId || !planId) {
        alert('プロジェクトまたはプランが選択されていません');
        return;
      }

      if (!confirm('このプランの投稿を今すぐ生成しますか？\n\nプランのスケジュール設定に基づいた投稿が作成されます。')) {
        return;
      }

      try {
        showNotification('自動投稿を生成しています...', 'info');
        
        const result = await window.electronAPI.invoke('generate-manual-auto-post', {
          projectId: currentProjectId,
          planId: planId
        });

        if (result.success) {
          
          // 投稿一覧を再読み込み
          await loadProjectPosts(currentProjectId);
          
          alert(`✅ 投稿を生成しました！\n\n📝 内容: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}\n📅 予定時刻: ${new Date(result.scheduledAt).toLocaleString('ja-JP')}`);
        } else {
          throw new Error(result.error || '投稿生成に失敗しました');
        }
      } catch (error) {
        console.error('❌ 手動自動投稿生成エラー:', error);
        alert(`投稿生成に失敗しました: ${error.message}`);
      }
    }

// ========== generateProjectTweet ==========
async function generateProjectTweet(projectId) {
      try {
        console.log('🤖 プロジェクトAI投稿生成開始:', projectId);
        
        // ツイートタブに移動
        showTab('tweet');
        
        // プロジェクト選択ドロップダウンを更新
        const projectSelect = document.getElementById('projectSelect');
        if (projectSelect) {
          projectSelect.value = projectId;
        }
        
        // AI生成を実行
        await generateFromProject();
        
      } catch (error) {
        console.error('❌ プロジェクトAI投稿生成エラー:', error);
        alert(`❌ AI投稿生成エラー: ${error.message}`);
      }
    }

// ========== generateProjectTweetDetail ==========
async function generateProjectTweetDetail() {
      if (!currentProjectData) return;
      
      const generateBtn = document.getElementById('generate-tweet-btn');
      const previewDiv = document.getElementById('generated-tweet-preview');
      
      generateBtn.disabled = true;
      generateBtn.textContent = '🤖 生成中...';
      
      try {
        const result = await window.electronAPI.invoke('generate-project-tweet', currentProjectData);
        
        if (result.success) {
          document.getElementById('tweet-preview-content').textContent = result.tweet;
          previewDiv.style.display = 'block';
        } else {
          alert('❌ AI投稿生成に失敗しました: ' + result.error);
        }
      } catch (error) {
        console.error('❌ AI投稿生成エラー:', error);
        alert('❌ AI投稿生成中にエラーが発生しました');
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '📝 新しい投稿を生成';
      }
    }

// ========== generatePromptAssistantResponse ==========
async function generatePromptAssistantResponse(userMessage) {
      // プロンプト生成のキーワードをチェック
      const promptGenerationKeywords = ['指示文', 'プロンプト', '作成', '生成', '書いて', 'prompt'];
      const isPromptGeneration = promptGenerationKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isPromptGeneration || promptChatHistory.length >= 2) {
        // プロンプト生成要求の場合
        await generatePromptContent(userMessage);
      } else {
        // 通常の会話の場合
        await generatePromptConversationResponse(userMessage);
      }
    }

// ========== generatePromptContent ==========
async function generatePromptContent(userMessage) {
      const conversationHistory = promptChatHistory.slice(-4).map(msg => 
        `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
      ).join('\n');

      const prompt = `
あなたはAI投稿生成用の指示文作成の専門家です。
ユーザーとの会話を基に、効果的なAI投稿生成指示文を作成してください。

【会話履歴】
${conversationHistory}

【最新の要望】
${userMessage}

【指示文作成のガイドライン】
- SNS投稿生成に特化した具体的な指示
- ユーザーが求める投稿の目的・ターゲット・トーンを反映
- 技術的すぎない、親しみやすい表現の指示
- 避けるべき要素や強調すべき要素を明確化
- 280文字制限などプラットフォームの制約を考慮

AIが投稿生成時に使用する指示文のみを返答してください。説明や前置きは不要です。
      `;

      try {
        const result = await aiServiceManager.generateText(prompt, {
          maxTokens: 1000,
          temperature: 0.7
        });

        if (result.success) {
          displayGeneratedPrompt(result.content.trim());
          addPromptAssistantMessage('指示文を生成しました！内容をご確認ください。修正が必要でしたらお知らせください。');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('プロンプト生成エラー:', error);
        addPromptAssistantMessage('指示文生成中にエラーが発生しました。もう一度お試しください。');
      }
    }

// ========== generatePromptConversationResponse ==========
async function generatePromptConversationResponse(userMessage) {
      const conversationHistory = promptChatHistory.slice(-4).map(msg => 
        `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
      ).join('\n');

      const prompt = `
あなたはAI投稿生成用の指示文作成アシスタントです。ユーザーとの会話を通じて、最適な指示文を作成するお手伝いをします。

【これまでの会話】
${conversationHistory}

【最新のユーザーメッセージ】
${userMessage}

ユーザーの要望を詳しく聞き出し、より具体的で効果的な指示文を作成するために、親しみやすく質問してください。
以下の観点から具体的に聞き出してください：
- 投稿の目的（宣伝、お知らせ、コミュニケーションなど）
- ターゲット層（開発者、一般ユーザー、企業など）
- 投稿のトーン（カジュアル、フォーマル、親しみやすいなど）
- 強調したいポイント
- 避けたい表現や内容
      `;

      try {
        const result = await aiServiceManager.generateText(prompt, {
          maxTokens: 600,
          temperature: 0.7
        });

        if (result.success) {
          const response = result.content.trim();
          addPromptAssistantMessage(response);
          promptChatHistory.push({ role: 'assistant', content: response });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('プロンプト会話応答生成エラー:', error);
        addPromptAssistantMessage('申し訳ありません。応答生成中にエラーが発生しました。');
      }
    }

// ========== generatePromptSuggestion ==========
async function generatePromptSuggestion() {
      const instruction = document.getElementById('improve-instruction').value.trim();
      const currentContent = document.getElementById('edit-post-content').value;

      if (!instruction) {
        alert('改善指示を入力してください');
        return;
      }

      try {
        // 1. カスタムプロンプト提案を生成（メイン）
        const suggestionPrompt = `ユーザーの改善指示を、今後の投稿作成で使える簡潔なカスタムプロンプトに変換してください。

【現在の投稿（参考）】
${currentContent}

【ユーザーの改善指示】
${instruction}

【出力形式】
- 簡潔な指示文のみを出力（1-2行程度）
- 具体的で実行可能な指示にする
- 例: "カジュアルで親しみやすいトーンで作成"
- 例: "提案型の文章（「〜するといいよ」「〜がおすすめ」形式）で作成"
- 例: "絵文字を適度に使用し、読みやすく"

前置きや説明は不要です。プロンプトのみを出力してください。`;

        const suggestionResult = await aiServiceManager.generateText(suggestionPrompt, {
          maxTokens: 150,
          temperature: 0.5
        });

        if (!suggestionResult.success) {
          throw new Error(suggestionResult.error || 'プロンプト提案生成に失敗しました');
        }

        promptSuggestion = suggestionResult.content.trim();

        // 2. プロンプト提案と更新後のプロンプト全体を表示
        document.getElementById('prompt-suggestion-text').textContent = promptSuggestion;

        // 更新後のカスタムプロンプト全体を表示
        const updatedPrompt = currentCustomPrompt
          ? `${currentCustomPrompt}\n${promptSuggestion}`
          : promptSuggestion;
        document.getElementById('updated-custom-prompt').textContent = updatedPrompt;

        document.getElementById('prompt-suggestion-section').style.display = 'block';

        // 3. 投稿プレビューも生成（オプション）
        const improvePrompt = `以下の投稿を修正してください：

【現在の投稿】
${currentContent}

【修正指示】
${instruction}

【重要な出力形式】
- 修正後の投稿本文のみを出力してください
- 前置きや説明は不要です
- そのまま投稿できる形式で出力してください`;

        const improveResult = await aiServiceManager.generateText(improvePrompt, {
          maxTokens: 500,
          temperature: 0.7
        });

        if (improveResult.success) {
          improvedContent = improveResult.content.trim();
          document.getElementById('improved-post-content').textContent = improvedContent;
          document.getElementById('improved-preview-section').style.display = 'block';
        }

        // 提案を履歴に追加
        suggestionHistory.push({
          instruction: instruction,
          promptSuggestion: promptSuggestion,
          improvedContent: improvedContent
        });
        currentSuggestionIndex = suggestionHistory.length - 1;

        // ナビゲーションボタンを更新
        updateNavigationButtons();

        // 反復調整UIを表示
        const generateBtn = document.getElementById('generate-suggestion-btn');
        if (generateBtn) generateBtn.style.display = 'none';

        const regenerateBtn = document.getElementById('regenerate-suggestion-btn');
        if (regenerateBtn) regenerateBtn.style.display = 'inline-block';

        const hint = document.getElementById('refinement-hint');
        if (hint) hint.style.display = 'block';

      } catch (error) {
        console.error('❌ プロンプト提案生成エラー:', error);
        alert('プロンプト提案生成に失敗しました: ' + error.message);
      }
    }

// ========== generatePromptWithCustomPrompt ==========
async function generatePromptWithCustomPrompt(prompt) {
      try {
        const result = await aiServiceManager.generateText(prompt, {
          maxTokens: 1000,
          temperature: 0.7
        });

        if (result.success) {
          displayGeneratedPrompt(result.content.trim());
          addPromptAssistantMessage('修正した指示文を生成しました！');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('プロンプト修正エラー:', error);
        addPromptAssistantMessage('修正中にエラーが発生しました。もう一度お試しください。');
      }
    }

// ========== generateProviderConfigForm ==========
function generateProviderConfigForm(provider) {
      if (!aiServiceManager) return '';
      
      const config = aiServiceManager.config[provider];
      
      switch (provider) {
        case 'ollama':
          return `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0; color: var(--primary);">Ollama設定</h4>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">ベースURL</label>
                <input type="text" id="ollama-baseurl" value="${config.baseUrl}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">モデル</label>
                <input type="text" id="ollama-model" value="${config.model}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="color: var(--success); font-size: 14px;">✅ Ollamaはローカル環境で動作します</div>
            </div>
          `;
          
        case 'openai':
          return `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0; color: var(--primary);">OpenAI設定 💰</h4>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                <strong>⚠️ 有料サービス</strong><br>
                • <strong>アカウント作成:</strong><br>
                  <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-size: 12px; user-select: all; cursor: text;" title="クリックして選択、Ctrl+Cでコピー">https://platform.openai.com/signup</code><br>
                  <small style="color: #666;">💡 URLをコピーしてブラウザで開いてください</small><br>
                • APIキーの取得が必要<br>
                • 使用量に応じて課金されます
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">APIキー</label>
                <input type="password" id="openai-apikey" value="${config.apiKey || ''}" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">モデル</label>
                <select id="openai-model" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="gpt-3.5-turbo" ${config.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo ($0.001/1K tokens)</option>
                  <option value="gpt-4" ${config.model === 'gpt-4' ? 'selected' : ''}>GPT-4 ($0.03/1K tokens)</option>
                  <option value="gpt-4-turbo" ${config.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo ($0.01/1K tokens)</option>
                </select>
              </div>
              <div style="color: var(--success); font-size: 14px; margin-top: 10px;">
                ✅ 設定後すぐに利用可能です
              </div>
            </div>
          `;
          
        case 'claude':
          return `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0; color: var(--primary);">Claude設定 💰</h4>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                <strong>⚠️ 有料サービス</strong><br>
                • <strong>アカウント作成:</strong><br>
                  <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-size: 12px; user-select: all; cursor: text;" title="クリックして選択、Ctrl+Cでコピー">https://console.anthropic.com/</code><br>
                  <small style="color: #666;">💡 URLをコピーしてブラウザで開いてください</small><br>
                • APIキーの取得が必要<br>
                • 使用量に応じて課金されます
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">APIキー</label>
                <input type="password" id="claude-apikey" value="${config.apiKey || ''}" placeholder="sk-ant-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">モデル</label>
                <select id="claude-model" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="claude-3-haiku-20240307" ${config.model === 'claude-3-haiku-20240307' ? 'selected' : ''}>Claude 3 Haiku ($0.25/1M tokens)</option>
                  <option value="claude-3-sonnet-20240229" ${config.model === 'claude-3-sonnet-20240229' ? 'selected' : ''}>Claude 3 Sonnet ($3/1M tokens)</option>
                  <option value="claude-3-opus-20240229" ${config.model === 'claude-3-opus-20240229' ? 'selected' : ''}>Claude 3 Opus ($15/1M tokens)</option>
                </select>
              </div>
              <div style="color: var(--success); font-size: 14px; margin-top: 10px;">
                ✅ 設定後すぐに利用可能です
              </div>
            </div>
          `;
          
        case 'gemini':
          return `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0; color: var(--primary);">Gemini設定 💰</h4>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                <strong>⚠️ 有料サービス</strong><br>
                • <strong>APIキー取得:</strong><br>
                  <code style="background: #f1f3f4; padding: 2px 6px; border-radius: 3px; font-size: 12px; user-select: all; cursor: text;" title="クリックして選択、Ctrl+Cでコピー">https://aistudio.google.com/app/apikey</code><br>
                  <small style="color: #666;">💡 URLをコピーしてブラウザで開いてください</small><br>
                • 無料枠あり（月60リクエスト/分）<br>
                • 超過分は使用量に応じて課金
              </div>
              <div style="margin-bottom: 15px; padding: 12px; background: white; border: 2px solid ${config.enabled ? 'var(--success)' : '#6c757d'}; border-radius: 8px;">
                <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                  <input type="checkbox" id="gemini-enabled" ${config.enabled ? 'checked' : ''} style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;">
                  <span style="font-weight: bold; font-size: 16px;">このプロバイダーを有効にする</span>
                </label>
                <div style="margin-top: 8px; font-size: 13px; color: #666;">
                  ${config.enabled ? '✅ 有効 - このAIを使用できます' : '⚠️ 無効 - 一時的に使用を停止しています'}
                </div>
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">APIキー</label>
                <input type="password" id="gemini-apikey" value="${config.apiKey || ''}" placeholder="AIza..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">モデル</label>
                <select id="gemini-model" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="gemini-2.0-flash" ${config.model === 'gemini-2.0-flash' ? 'selected' : ''}>Gemini 2.0 Flash (安定版・推奨)</option>
                  <option value="gemini-2.5-flash-preview-09-2025" ${config.model === 'gemini-2.5-flash-preview-09-2025' ? 'selected' : ''}>Gemini 2.5 Flash Preview (最新プレビュー)</option>
                  <option value="gemini-1.5-flash-latest" ${config.model === 'gemini-1.5-flash-latest' ? 'selected' : ''}>Gemini 1.5 Flash Latest (非推奨)</option>
                  <option value="gemini-pro" ${config.model === 'gemini-pro' ? 'selected' : ''}>Gemini Pro (非推奨)</option>
                </select>
              </div>
              <div style="color: var(--success); font-size: 14px; margin-top: 10px;">
                ✅ 設定後すぐに利用可能です
              </div>
            </div>
          `;
          
        default:
          return '<div>未対応のプロバイダーです</div>';
      }
    }

// ========== generateResponseWithConfirmation ==========
async function generateResponseWithConfirmation(userInput, currentPostContent, currentPlanInfo) {
      try {
        console.log('🔮 確認付き応答生成開始:', userInput);

        // 1. まず意図解析
        const intentResult = await analyzeUserIntent(userInput, currentPostContent, currentPlanInfo);

        if (!intentResult.success) {
          throw new Error('意図解析に失敗しました');
        }

        const intent = intentResult.intent;

        // 2. 確認が必要かを判定
        const needsConfirmation = shouldRequestConfirmation(intent);

        if (!needsConfirmation) {
          // 確認不要 → 従来通り直接実行
          console.log('⚡ 確認不要 - 直接実行');
          return await executeIntentBasedActions(intentResult, editingPostId, editingPlanId);
        }

        // 3. まず投稿の修正を実行（確認前に結果を見せる）
        const postUpdateResult = await updatePostBasedOnIntent(editingPostId, intent);

        if (!postUpdateResult.success) {
          throw new Error('投稿修正に失敗しました');
        }

        // 4. 確認付きの応答を生成
        try {
          const confirmationResponse = await generateConfirmationMessage(intent, currentPostContent);
          console.log('📝 確認メッセージ生成結果:', confirmationResponse);

          // 5. 確認待ち状態にセット
          setPendingConfirmation(intentResult, userInput);

          // 6. プレビュー更新
          await refreshPostPreview();

          return {
            success: true,
            requiresConfirmation: true,
            response: confirmationResponse,
            intent: intent
          };
        } catch (confirmationError) {
          console.error('❌ 確認メッセージ生成失敗:', confirmationError);
          throw new Error(`確認メッセージの生成に失敗しました: ${confirmationError.message}`);
        }

      } catch (error) {
        console.error('❌ 確認付き応答生成エラー:', error);
        return {
          success: false,
          error: error.message,
          requiresConfirmation: false,
          isAPIError: error.message.includes('503') || error.message.includes('overloaded') || error.message.includes('AI') || error.message.includes('API')
        };
      }
    }

// ========== generateResultMessage ==========
function generateResultMessage(intentResult, executionResult) {
      // 安全性チェック
      if (!intentResult || !intentResult.intent) {
        return '処理が完了しました。';
      }

      const intent = intentResult.intent;
      let message = `✅ **処理完了！**\n\n`;

      message += `**解析結果:**\n`;
      message += `- 意図タイプ: ${intent.intent_type || '不明'}\n`;
      message += `- 対象範囲: ${intent.target_scope || '不明'}\n`;
      message += `- 変更点: ${Array.isArray(intent.specific_changes) ? intent.specific_changes.join(', ') : '内容調整'}\n`;
      message += `- 信頼度: ${typeof intent.confidence === 'number' ? Math.round(intent.confidence * 100) : '不明'}%\n\n`;

      message += `**実行結果:**\n`;
      if (executionResult && Array.isArray(executionResult.results)) {
        executionResult.results.forEach(result => {
          const status = result.success ? '✅' : '❌';
          let type = '';
          if (result.type === 'post_update') type = '投稿更新';
          else if (result.type === 'plan_update') type = 'プラン更新';
          else if (result.type === 'ai_summary_update') type = 'AI要約更新';

          message += `- ${status} ${type}\n`;
        });
      } else {
        message += '- ✅ 処理完了\n';
      }

      // 特別な通知メッセージ
      const hasAISummaryUpdate = executionResult && executionResult.results && executionResult.results.some(r => r.type === 'ai_summary_update' && r.success);
      const hasPlanUpdate = executionResult && executionResult.results && executionResult.results.some(r => r.type === 'plan_update' && r.success);

      if (hasAISummaryUpdate) {
        message += `\n🤖 **AI要約更新**: プロジェクト概要が会話内容を反映して自動更新されました`;
      }

      if (hasPlanUpdate) {
        message += `\n📚 **学習完了**: 今後の自動投稿にもこの調整内容が反映されます`;
      }

      return message;
    }

// ========== handleAIProviderChange ==========
async function handleAIProviderChange(event) {
      const newProvider = event.target.value;
      
      try {
        // 有料プロバイダーの場合は警告表示
        if (newProvider !== 'ollama') {
          // 設定済みかチェック
          if (!aiServiceManager.isProviderConfigured(newProvider)) {
            const confirmMessage = `${aiServiceManager.getProviderDisplayName(newProvider)}は有料のAIサービスです。\n\n` +
              `利用には以下が必要です:\n` +
              `• 各サービスへのアカウント登録\n` +
              `• APIキーの取得\n` +
              `• 従量課金での支払い\n\n` +
              `設定画面を開きますか？`;
              
            if (!confirm(confirmMessage)) {
              // キャンセルされた場合は元に戻す
              event.target.value = aiServiceManager.getCurrentProvider();
              return;
            }
            
            // 設定画面を開く
            try {
              openAIConfig(newProvider);
            } catch (error) {
              console.error('❌ 設定画面を開けませんでした:', error);
            }
            // 選択を元に戻す（設定完了後に変更される）
            event.target.value = aiServiceManager.getCurrentProvider();
            return;
          }
        }
        
        // プロバイダーを変更
        aiServiceManager.setProvider(newProvider);
        aiServiceManager.saveConfig();
        
        // メインプロセス設定同期は一旦削除
        
        // 通知表示
        showNotification(`🤖 AIプロバイダーを${aiServiceManager.getProviderDisplayName(newProvider)}に変更しました`, 'success');
        
        
      } catch (error) {
        console.error('❌ AI Provider change failed:', error);
        showNotification('AIプロバイダーの変更に失敗しました', 'error');
        // 選択を元に戻す
        event.target.value = aiServiceManager.getCurrentProvider();
      }
    }

// ========== initializeAIChat ==========
function initializeAIChat() {
      // Enterキーでメッセージ送信
      const aiInput = document.getElementById('aiInput');
      if (aiInput) {
        aiInput.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') {
            sendMessage();
          }
        });
      }
      
      // ツイート履歴を初期読み込み
      refreshTweetHistory();
    }

// ========== initializeAIManager ==========
async function initializeAIManager() {
      try {
        // スクリプトタグでAI Service Managerを読み込み
        if (typeof window.aiServiceManager === 'undefined') {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = './src/services/ai-service-manager.js';
          document.head.appendChild(script);
          
          // スクリプトの読み込み完了を待つ
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }
        
        // windowオブジェクトからAI Service Managerを取得
        aiServiceManager = window.aiServiceManager;
        
        if (!aiServiceManager) {
          throw new Error('AI Service Manager not found on window object');
        }
        
        // AI選択UIを初期化
        initializeAISelectors();

        console.log('🤖 AI Service Manager initialized:', aiServiceManager.getCurrentProvider());
      } catch (error) {
        console.error('❌ AI Service Manager initialization failed:', error);
        
        // フォールバック: グローバルスコープで直接AI Service Managerを作成
        try {
          await initializeAIManagerFallback();
        } catch (fallbackError) {
          console.error('❌ AI Service Manager fallback failed:', fallbackError);
        }
      }
    }

// ========== initializeAIManagerFallback ==========
async function initializeAIManagerFallback() {
      // AI Service Managerクラスを直接定義
      class AIServiceManager {
        constructor() {
          this.currentProvider = 'gemini'; // Cloud Functions対応のためデフォルトをGeminiに変更
          this.config = {
            ollama: { baseUrl: 'http://localhost:11434', model: 'qwen2.5:0.5b', enabled: true, cloudAvailable: false },
            openai: { apiKey: '', model: 'gpt-3.5-turbo', enabled: false, cloudAvailable: true },
            claude: { apiKey: '', model: 'claude-3-haiku-20240307', enabled: false, cloudAvailable: true },
            gemini: { apiKey: '', model: 'gemini-pro', enabled: false, cloudAvailable: true }
          };
          this.firebaseService = null;
          this.isFirestoreEnabled = false;
          this.userId = null;
          this.initializeFirestore();
        }
        
        getCurrentProvider() { return this.currentProvider; }
        getProviderDisplayName(provider) {
          const names = { ollama: 'Ollama', openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini' };
          return names[provider] || provider;
        }
        isProviderConfigured(provider) {
          const config = this.config[provider];
          return provider === 'ollama' ? true : (config.apiKey && config.apiKey.length > 0);
        }
        setProvider(provider) { if (this.config[provider]) this.currentProvider = provider; }
        updateConfig(provider, config) { if (this.config[provider]) this.config[provider] = { ...this.config[provider], ...config }; }

        // Firestore初期化
        async initializeFirestore() {
          try {
            // Firebaseサービスが利用可能かチェック
            if (typeof firebaseService !== 'undefined' && firebaseService) {
              this.firebaseService = firebaseService;
              this.isFirestoreEnabled = true;
              console.log('🔥 AIServiceManager: Firestore連携有効 - デフォルト使用');

              // ユーザーがログインしているかチェック
              if (firebaseService.currentUser) {
                this.userId = firebaseService.currentUser.uid;

                // まずLocalStorageからマイグレーション実行
                await this.migrateFromLocalStorage();

                // その後Firestoreから読み込み
                await this.loadConfigFromFirestore();
              } else {
                // ログインしていない場合でもFirestore優先設定を保持
                console.log('ℹ️ 未ログイン状態 - Firestore準備完了、ログイン後に設定同期');
                // デフォルト設定のまま（Gemini有効）
              }
            } else {
              console.log('⚠️ AIServiceManager: Firestore無効 - LocalStorageフォールバック');
              this.loadConfigFromLocalStorage();
            }
          } catch (error) {
            console.error('❌ Firestore初期化エラー:', error);
            this.loadConfigFromLocalStorage();
          }
        }

        // Firestore設定保存
        async saveConfigToFirestore() {
          if (!this.isFirestoreEnabled || !this.userId || !this.firebaseService) {
            console.log('⚠️ Firestore無効 - LocalStorageに保存');
            return this.saveConfigToLocalStorage();
          }

          try {
            const firestoreConfig = {
              defaultProvider: this.currentProvider,
              providers: this.config
            };

            const result = await this.firebaseService.saveUserAIConfig(this.userId, firestoreConfig);
            if (result.success) {
            } else {
              throw new Error(result.error);
            }
          } catch (error) {
            console.error('❌ Firestore保存エラー:', error);
            // フォールバック: LocalStorageに保存
            this.saveConfigToLocalStorage();
          }
        }

        // Firestore設定読み込み
        async loadConfigFromFirestore() {
          if (!this.isFirestoreEnabled || !this.userId || !this.firebaseService) {
            return this.loadConfigFromLocalStorage();
          }

          try {
            const result = await this.firebaseService.loadUserAIConfig(this.userId);
            if (result.success && result.config) {
              this.currentProvider = result.config.defaultProvider || 'gemini';
              this.config = { ...this.config, ...result.config.providers };
            } else {
              console.log('ℹ️ Firestore設定なし - デフォルト設定を使用');
            }
          } catch (error) {
            console.error('❌ Firestore読み込みエラー:', error);
            this.loadConfigFromLocalStorage();
          }
        }

        // LocalStorageからマイグレーション
        async migrateFromLocalStorage() {
          if (!this.isFirestoreEnabled || !this.userId || !this.firebaseService) {
            return;
          }

          try {
            const result = await this.firebaseService.migrateAIConfigFromLocalStorage(this.userId);
            if (result.success && result.migrated) {
              // LocalStorageの古い設定を削除
              localStorage.removeItem('ai-service-config');
            }
          } catch (error) {
            console.error('❌ マイグレーションエラー:', error);
          }
        }

        // LocalStorage保存（フォールバック）
        saveConfigToLocalStorage() {
          localStorage.setItem('ai-service-config', JSON.stringify({
            currentProvider: this.currentProvider,
            config: this.config
          }));
          console.log('💾 AI設定をLocalStorageに保存しました');
        }

        // LocalStorage読み込み（フォールバック）
        loadConfigFromLocalStorage() {
          try {
            const saved = localStorage.getItem('ai-service-config');
            if (saved) {
              const data = JSON.parse(saved);
              this.currentProvider = data.currentProvider || 'gemini';
              this.config = { ...this.config, ...data.config };
              console.log('💾 AI設定をLocalStorageから読み込みました');
            }
          } catch (error) {
            console.error('❌ LocalStorage読み込みエラー:', error);
          }
        }

        // 統一設定保存メソッド
        async saveConfig() {
          if (this.isFirestoreEnabled && this.userId) {
            await this.saveConfigToFirestore();
          } else {
            this.saveConfigToLocalStorage();
          }
        }

        // ユーザーログイン時の設定更新
        async onUserLogin(userId) {
          this.userId = userId;
          if (this.isFirestoreEnabled) {
            console.log('👤 ユーザーログイン - AI設定を同期開始');

            // まずLocalStorageからマイグレーション
            await this.migrateFromLocalStorage();

            // その後Firestoreから読み込み
            await this.loadConfigFromFirestore();

            // UIを更新
            this.updateProviderSelect();
          }
        }

        // プロバイダー選択UIを更新
        updateProviderSelect() {
          const selectElement = document.getElementById('ai-provider-select');
          if (selectElement) {
            selectElement.value = this.currentProvider;
            console.log(`🔄 AI選択UI更新: ${this.currentProvider}`);
          }
        }

        // ユーザーログアウト時の設定クリア
        onUserLogout() {
          this.userId = null;
          // デフォルト設定にリセット
          this.currentProvider = 'gemini';
          this.config = {
            ollama: { baseUrl: 'http://localhost:11434', model: 'qwen2.5:0.5b', enabled: true, cloudAvailable: false },
            openai: { apiKey: '', model: 'gpt-3.5-turbo', enabled: false, cloudAvailable: true },
            claude: { apiKey: '', model: 'claude-3-haiku-20240307', enabled: false, cloudAvailable: true },
            gemini: { apiKey: '', model: 'gemini-pro', enabled: false, cloudAvailable: true }
          };
        }
        getAvailableProviders() {
          return Object.keys(this.config).map(provider => ({
            id: provider, name: this.getProviderDisplayName(provider), configured: this.isProviderConfigured(provider)
          }));
        }
        
        async generateText(prompt, options = {}) {
          try {
            // 現在の設定をJSON形式で準備
            const currentConfig = {
              currentProvider: this.currentProvider,
              config: this.config
            };

            const result = await window.electronAPI.invoke('ai-generate-text', prompt, {
              ...options,
              provider: this.currentProvider,
              config: JSON.stringify(currentConfig)
            });
            return result;
          } catch (error) {
            return {
              success: false,
              error: error.message || 'AI生成エラー'
            };
          }
        }

        // 現在の設定情報を取得（Cloud Functions用）
        getCurrentConfigForCloudFunctions() {
          return {
            defaultProvider: this.currentProvider,
            providers: this.config,
            userId: this.userId
          };
        }

        // ユーザーログイン時の処理（フォールバック版）
        async onUserLogin(userId) {
          console.log('👤 フォールバック版 - ユーザーログイン:', userId);
          this.userId = userId;

          // フォールバック版でもFirestore連携を試行
          try {
            // LocalStorageからマイグレーション（フォールバック版）
            const localConfig = localStorage.getItem('ai-service-config');
            if (localConfig) {
              console.log('📦 フォールバック版 - LocalStorage設定発見、削除実行');
              localStorage.removeItem('ai-service-config');
            }

            // 基本的なProviderをGeminiに設定
            this.currentProvider = 'gemini';
            this.updateProviderSelect();

          } catch (error) {
            console.error('❌ フォールバック版 - ログイン処理エラー:', error);
          }
        }

        // ユーザーログアウト時の処理（フォールバック版）
        onUserLogout() {
          console.log('👤 フォールバック版 - ユーザーログアウト');
          this.userId = null;
          // デフォルト設定にリセット
          this.currentProvider = 'gemini';
          this.config = {
            ollama: { baseUrl: 'http://localhost:11434', model: 'qwen2.5:0.5b', enabled: true, cloudAvailable: false },
            openai: { apiKey: '', model: 'gpt-3.5-turbo', enabled: false, cloudAvailable: true },
            claude: { apiKey: '', model: 'claude-3-haiku-20240307', enabled: false, cloudAvailable: true },
            gemini: { apiKey: '', model: 'gemini-pro', enabled: false, cloudAvailable: true }
          };
        }

        // プロバイダー選択UIを更新（フォールバック版）
        updateProviderSelect() {
          const selectElement = document.getElementById('ai-provider-select');
          if (selectElement) {
            selectElement.value = this.currentProvider;
            console.log(`🔄 AI選択UI更新 (フォールバック版): ${this.currentProvider}`);
          }
        }
      }
      
      aiServiceManager = new AIServiceManager();
      window.aiServiceManager = aiServiceManager;

      // AI選択UIを初期化
      initializeAISelectors();

      console.log('🤖 AI Service Manager fallback initialized:', aiServiceManager.getCurrentProvider());
    }

// ========== initializeAISelectors ==========
function initializeAISelectors() {
      const mainSelect = document.getElementById('ai-provider-select-main');

      // プロジェクト管理画面のセレクター
      if (mainSelect) {
        mainSelect.addEventListener('change', async (event) => {
          await handleAIProviderChange(event);
          syncAIProviderSelectors();
        });
      }

      // 初期同期
      syncAIProviderSelectors();
    }

// ========== loadProjectDetailData ==========
async function loadProjectDetailData(projectId) {
      try {
        // プランと投稿を並行して読み込み
        const [plansResult, postsResult] = await Promise.all([
          loadProjectPlans(projectId),
          loadProjectPosts(projectId)
        ]);

        console.log('📊 プロジェクト詳細データ読み込み完了');
        return { success: true };
        
      } catch (error) {
        console.error('❌ プロジェクト詳細データ読み込みエラー:', error);
        return { success: false, error: error.message };
      }
    }

// ========== openAIConfig ==========
function openAIConfig(targetProvider = null) {
      
      if (!aiServiceManager) {
        console.error('❌ aiServiceManager が初期化されていません');
        showNotification('AI設定の初期化に失敗しました', 'error');
        return;
      }
      
      const modal = document.getElementById('ai-config-modal');
      
      if (!modal) {
        createAIConfigModal();
        // モーダル作成後に再帰的に呼び出し
        setTimeout(() => {
          openAIConfig(targetProvider);
        }, 100);
        return;
      }
      
      // 現在の設定を表示
      updateAIConfigModal(targetProvider);
      
      // モーダルを表示
      modal.style.display = 'block';
    }

// ========== postGeneratedTweetNow ==========
async function postGeneratedTweetNow() {
      const content = document.getElementById('tweet-preview-content').textContent;
      if (!content) return;
      
      const confirmed = confirm(`以下の内容をTwitterに投稿しますか？\n\n${content}`);
      if (confirmed) {
        try {
          // Twitter APIで投稿（実装が必要）
          alert('🚀 投稿機能は開発中です。\n\nTwitter API連携完了後に実装予定です。');
        } catch (error) {
          alert('❌ 投稿に失敗しました: ' + error.message);
        }
      }
    }

// ========== refreshCampaigns ==========
function refreshCampaigns() { alert('キャンペーン一覧を更新します'); }

// ========== regeneratePrompt ==========
async function regeneratePrompt() {
      const lastUserMessage = promptChatHistory.filter(msg => msg.role === 'user').pop();
      if (lastUserMessage) {
        addPromptAssistantMessage('別のバージョンの指示文を生成しています...');
        await generatePromptContent(lastUserMessage.content + '（別のアプローチで）');
      }
    }

// ========== regeneratePromptSuggestion ==========
function regeneratePromptSuggestion() {
      // 入力フォームをリセット
      const instructionInput = document.getElementById('improve-instruction');
      if (instructionInput) {
        instructionInput.value = '';
        instructionInput.focus();
      }

      // ボタン状態を初期化
      const genButton = document.getElementById('generate-suggestion-btn');
      if (genButton) genButton.style.display = 'inline-block';

      const regenButton = document.getElementById('regenerate-suggestion-btn');
      if (regenButton) regenButton.style.display = 'none';

      const hintElement = document.getElementById('refinement-hint');
      if (hintElement) hintElement.style.display = 'none';

      // データをクリア（現在の提案のみ）
      improvedContent = null;
      promptSuggestion = null;

      // 履歴がある場合は差分表示を維持（ナビゲーション可能）
      if (suggestionHistory.length > 0) {
        // 新規提案入力モードに設定（履歴の末尾 + 1）
        currentSuggestionIndex = suggestionHistory.length;

        // 差分表示エリアは表示したまま、内容だけクリア
        document.getElementById('prompt-suggestion-text').textContent = '← 前の提案を確認するか、新しい改善指示を入力してください';
        document.getElementById('updated-custom-prompt').textContent = '新しい提案を生成すると表示されます';
        document.getElementById('improved-preview-section').style.display = 'none';
        document.getElementById('prompt-suggestion-section').style.display = 'block';

        // ナビゲーションボタンを更新（「← 前の提案」が有効に）
        updateNavigationButtons();
      } else {
        // 履歴がない場合は完全に非表示
        document.getElementById('prompt-suggestion-section').style.display = 'none';
        document.getElementById('improved-preview-section').style.display = 'none';
        currentSuggestionIndex = -1;
      }
    }

// ========== saveAIConfig ==========
function saveAIConfig() {
      if (!aiServiceManager) return;
      
      const provider = document.getElementById('config-provider-select').value;
      const config = {};
      
      switch (provider) {
        case 'ollama':
          config.baseUrl = document.getElementById('ollama-baseurl').value;
          config.model = document.getElementById('ollama-model').value;
          break;
          
        case 'openai':
          config.apiKey = document.getElementById('openai-apikey').value;
          config.model = document.getElementById('openai-model').value;
          break;
          
        case 'claude':
          config.apiKey = document.getElementById('claude-apikey').value;
          config.model = document.getElementById('claude-model').value;
          break;
          
        case 'gemini':
          config.apiKey = document.getElementById('gemini-apikey').value;
          config.model = document.getElementById('gemini-model').value;
          config.enabled = document.getElementById('gemini-enabled').checked;
          break;
      }
      
      // 設定を更新
      aiServiceManager.updateConfig(provider, config);
      aiServiceManager.saveConfig();
      
      // プロバイダーを変更（設定済みの場合）
      if (aiServiceManager.isProviderConfigured(provider)) {
        aiServiceManager.setProvider(provider);
        aiServiceManager.saveConfig();
        
        // メインプロセス設定同期は一旦削除
        
        // UI更新
        const selectElement = document.getElementById('ai-provider-select');
        if (selectElement) {
          selectElement.value = provider;
        }
        
        showNotification(`🤖 ${aiServiceManager.getProviderDisplayName(provider)}の設定を保存しました`, 'success');
      } else {
        showNotification('設定を保存しました', 'success');
      }
      
      closeAIConfig();
    }

// ========== scheduleGeneratedTweet ==========
function scheduleGeneratedTweet() {
      const content = document.getElementById('tweet-preview-content').textContent;
      if (!content) return;
      
      const datetime = prompt('投稿日時を入力してください（例: 2024-08-15 14:00）:', '');
      if (datetime && datetime.trim()) {
        alert(`📅 予約投稿を設定しました\n\n内容: ${content.substring(0, 50)}...\n日時: ${datetime}\n\n※現在は表示のみです。実際の予約機能は開発中です。`);
        
        // 予約投稿リストに追加（仮の実装）
        updateScheduledPostsList([{
          content: content,
          datetime: datetime,
          platform: 'Twitter'
        }]);
      }
    }

// ========== shouldUpdateProjectAISummary ==========
function shouldUpdateProjectAISummary(intent, executionResults) {
      // 以下の条件でAI要約の更新を実行
      const updateTriggers = [
        // プロジェクト全体に関わる意図の場合
        intent.target_scope === 'project_level',
        // プラン設定が更新された場合
        executionResults.some(result => result.type === 'plan_update' && result.success),
        // ブランド調整や大きな方向性変更の場合
        intent.intent_type === 'brand_adjustment',
        // 複数回の会話で同様の修正が行われている場合（学習蓄積）
        chatHistory.length >= 3 && intent.confidence >= 0.8
      ];

      const shouldUpdate = updateTriggers.some(trigger => trigger);

      console.log('🤔 AI要約更新判定:', {
        intent_type: intent.intent_type,
        target_scope: intent.target_scope,
        confidence: intent.confidence,
        chatHistoryLength: chatHistory.length,
        shouldUpdate: shouldUpdate
      });

      return shouldUpdate;
    }

// ========== showCreateCampaignModal ==========
function showCreateCampaignModal() { alert('キャンペーン作成モーダルを表示します'); }

// ========== showXConnectionDetails ==========
function showXConnectionDetails(projectId, twitterAuth) {
      const message = `X (Twitter) 連携情報\n\n` +
        `ユーザー名: @${twitterAuth.username}\n` +
        `連携日: ${new Date(twitterAuth.connectedAt).toLocaleDateString('ja-JP')}\n\n` +
        `連携を解除しますか？`;

      if (confirm(message)) {
        disconnectTwitter(projectId);
      }
    }

// ========== syncAIProviderSelectors ==========
function syncAIProviderSelectors() {
      const mainSelect = document.getElementById('ai-provider-select-main');

      if (mainSelect && aiServiceManager) {
        const currentProvider = aiServiceManager.getCurrentProvider();
        mainSelect.value = currentProvider;

        // ステータス表示も更新
        updateAIStatus();
      }
    }

// ========== testAIConnection ==========
async function testAIConnection() {
      if (!aiServiceManager) {
        showNotification('AI Service Managerが初期化されていません', 'error');
        return;
      }

      const statusElement = document.getElementById('ai-connection-status');
      const currentProvider = aiServiceManager.getCurrentProvider();
      const displayName = aiServiceManager.getProviderDisplayName(currentProvider);

      try {
        // テスト中表示
        if (statusElement) {
          statusElement.textContent = '🔄 テスト中...';
          statusElement.style.color = '#F59E0B';
        }

        // シンプルなテストプロンプト
        const testPrompt = 'Hello, please respond with "OK" to confirm connection.';
        const result = await aiServiceManager.generateText(testPrompt, {
          maxTokens: 50,
          temperature: 0.1
        });

        if (result.success) {
          // 成功
          if (statusElement) {
            statusElement.textContent = '✅ 接続成功';
            statusElement.style.color = '#10B981';
          }
          showNotification(`${displayName}への接続に成功しました`, 'success');
        } else {
          // 失敗（エラー内容を表示）
          if (statusElement) {
            statusElement.textContent = '❌ 接続失敗';
            statusElement.style.color = '#EF4444';
          }

          // Ollama固有のエラーメッセージ
          if (currentProvider === 'ollama') {
            const errorMsg = `Ollamaサーバーに接続できません。\n\n` +
              `以下をご確認ください：\n` +
              `• Ollamaが起動しているか\n` +
              `• http://localhost:11434 にアクセス可能か\n\n` +
              `または、他のAIプロバイダー（Gemini、OpenAI、Claude）を\n` +
              `ヘッダーから選択してください。`;
            showNotification(errorMsg, 'error');
          } else {
            showNotification(`${displayName}への接続に失敗しました: ${result.error}`, 'error');
          }
        }
      } catch (error) {
        console.error('❌ AI接続テストエラー:', error);
        if (statusElement) {
          statusElement.textContent = '❌ エラー';
          statusElement.style.color = '#EF4444';
        }
        showNotification(`接続テストでエラーが発生しました: ${error.message}`, 'error');
      }
    }

// ========== testAllConnections ==========
function testAllConnections() { alert('全接続をテストします'); }

// ========== testAutoPostProcessor ==========
async function testAutoPostProcessor() {
      try {
        console.log('🚀 Cloud Function手動実行中...');
        
        // 手動実行用のCloud Function URLを呼び出し
        const result = await window.electronAPI.invoke('test-cloud-function', 'processAutoPostsManual');
        
        if (result.success) {
        } else {
          console.log('❌ Cloud Function実行失敗:', result);
        }
      } catch (error) {
        console.error('❌ Cloud Function実行エラー:', error);
      }
    }

// ========== testWithCurrentTime ==========
async function testWithCurrentTime() {
      if (!currentProjectId) {
        console.log('❌ プロジェクトが選択されていません');
        return;
      }

      try {
        // 現在時刻の5分後を計算
        const now = new Date();
        const testHour = now.getHours();
        const testMinute = now.getMinutes() + 5;
        const testTime = `${testHour}:${String(testMinute % 60).padStart(2, '0')}`;
        
        console.log(`🕐 現在時刻: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
        console.log(`🎯 テスト時刻: ${testTime} に設定します`);

        // planの時刻を更新
        const updateResult = await window.electronAPI.invoke('firebase-update-plan', currentProjectId, 'j1O5jhnNYAHx2QUSwAVq', {
          schedule: { 
            time: testTime,
            timeSlots: [testTime],
            timezone: 'Asia/Tokyo',
            weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          }
        });

        if (updateResult.success) {
          
          // 5分待つか、手動でCloud Functionを再実行してもらう
          console.log('⏰ 5分後にCloud Functionが自動実行されるか、手動で testAutoPostProcessor() を実行してください');
        } else {
          console.log('❌ plan時刻更新失敗:', updateResult.error);
        }
      } catch (error) {
        console.error('❌ テスト準備エラー:', error);
      }
    }

// ========== toggleAISection ==========
function toggleAISection() {
      const section = document.getElementById('ai-improvement-section');
      const toggle = document.getElementById('ai-section-toggle');

      if (section.style.display === 'none') {
        section.style.display = 'block';
        toggle.textContent = '▲';
      } else {
        section.style.display = 'none';
        toggle.textContent = '▼';
      }
    }

// ========== updateAIConfigModal ==========
function updateAIConfigModal(targetProvider = null) {
      if (!aiServiceManager) return;
      
      const providers = aiServiceManager.getAvailableProviders();
      const currentProvider = targetProvider || aiServiceManager.getCurrentProvider();
      
      const configContent = document.getElementById('ai-config-content');
      configContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">AIプロバイダー</label>
          <select id="config-provider-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            ${providers.map(p => `<option value="${p.id}" ${p.id === currentProvider ? 'selected' : ''}>${p.name} ${p.configured ? '✅' : '⚠️'}</option>`).join('')}
          </select>
        </div>
        <div id="provider-config">
          ${generateProviderConfigForm(currentProvider)}
        </div>
      `;
      
      // プロバイダー選択変更時のイベントリスナー
      document.getElementById('config-provider-select').addEventListener('change', (e) => {
        const newProvider = e.target.value;
        document.getElementById('provider-config').innerHTML = generateProviderConfigForm(newProvider);
      });
    }

// ========== updateAIStatus ==========
function updateAIStatus() {
      const providerNameElement = document.getElementById('current-ai-provider');
      const statusElement = document.getElementById('ai-connection-status');

      if (providerNameElement && aiServiceManager) {
        const currentProvider = aiServiceManager.getCurrentProvider();
        const displayName = aiServiceManager.getProviderDisplayName(currentProvider);
        providerNameElement.textContent = displayName;
      }

      // 接続状態は未確認としておく
      if (statusElement) {
        statusElement.textContent = '❌ 未確認';
        statusElement.style.color = '#657786';
      }
    }

// ========== updateProjectAISummaryFromConversation ==========
async function updateProjectAISummaryFromConversation(intent) {
      try {
        console.log('🤖 AI要約自動更新開始');

        // 現在のプロジェクト情報を取得
        const projectResult = await window.electronAPI.invoke('get-project-details', currentProjectId);
        if (!projectResult.success) {
          throw new Error('プロジェクト情報取得失敗');
        }

        const project = projectResult.project;
        const currentSummary = project.aiSummary || project.description || '';

        // 会話履歴から学習した情報を抽出
        const conversationInsights = extractConversationInsights();

        // AI要約更新用プロンプトを構築
        const updatePrompt = `
以下のプロジェクトのAI要約を、ユーザーとの会話内容を反映して改善してください：

【現在のプロジェクト要約】
${currentSummary}

【プロジェクト基本情報】
名前: ${project.name}
カテゴリ: ${project.category}

【会話から得られた新しい情報】
- 意図タイプ: ${intent.intent_type}
- 対象範囲: ${intent.target_scope}
- 具体的変更: ${intent.specific_changes.join(', ')}
- 推奨プラン設定: ${intent.suggested_plan_prompt}

【会話から学習した要素】
${conversationInsights.length > 0 ? conversationInsights.join('\n') : '特になし'}

上記の情報を統合して、より正確で実用的なプロジェクト要約を生成してください。
技術的詳細、ユーザー価値、開発方針を簡潔に含めてください。
`;

        // AI要約を生成
        const result = await aiServiceManager.generateText(updatePrompt, {
          maxTokens: 600,
          temperature: 0.6
        });

        if (!result.success) {
          throw new Error(`AI要約生成失敗: ${result.error}`);
        }

        // 生成された要約を保存
        const updateResult = await window.electronAPI.invoke('update-project-ai-summary',
          currentProjectId, result.text);

        if (updateResult.success) {

          // UI上の表示も更新（編集モーダルが開いている場合）
          const aiSummaryDisplay = document.getElementById('aiSummaryDisplay');
          if (aiSummaryDisplay && document.getElementById('edit-project-modal').style.display !== 'none') {
            aiSummaryDisplay.innerHTML = result.text;
            aiSummaryDisplay.style.fontStyle = 'normal';
            aiSummaryDisplay.style.color = '#495057';
          }

          return {
            success: true,
            updatedSummary: result.text,
            previousSummary: currentSummary
          };
        } else {
          throw new Error(`AI要約保存失敗: ${updateResult.error}`);
        }

      } catch (error) {
        console.error('❌ AI要約自動更新エラー:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
