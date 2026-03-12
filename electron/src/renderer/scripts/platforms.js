/**
 * platforms.js
 * Platform OAuth and Connection Management
 * Handles Twitter, Instagram, LinkedIn, Google Ads, and YouTube authentication
 * 
 * Total functions: 24
 * Extracted from: index.html
 */

// ========== analyzeChannel ==========
function analyzeChannel() { alert('チャンネルを分析します'); }

// ========== checkGoogleAdsStatus ==========
async function checkGoogleAdsStatus() {
      const statusEl = document.getElementById('google-ads-status');
      try {
        statusEl.innerHTML = '⏳ 確認中...';
        statusEl.style.color = 'var(--warning)';
        
        const result = await window.electronAPI.invoke('google-ads-test-connection');
        if (result.success) {
          statusEl.innerHTML = '✅ 接続済み';
          statusEl.style.color = 'var(--success)';
        } else {
          statusEl.innerHTML = '❌ 未設定';
          statusEl.style.color = 'var(--danger)';
        }
      } catch (error) {
        statusEl.innerHTML = '❌ 未設定';
        statusEl.style.color = 'var(--danger)';
      }
    }

// ========== checkTwitterStatus ==========
async function checkTwitterStatus() {
      const statusEl = document.getElementById('twitter-status');
      try {
        statusEl.innerHTML = '⏳ 確認中...';
        statusEl.style.color = 'var(--warning)';
        
        const result = await window.electronAPI.invoke('twitter-test-connection');
        if (result.success) {
          statusEl.innerHTML = '✅ 接続済み';
          statusEl.style.color = 'var(--success)';
        } else {
          statusEl.innerHTML = '❌ 未設定';
          statusEl.style.color = 'var(--danger)';
        }
      } catch (error) {
        statusEl.innerHTML = '❌ 未設定';
        statusEl.style.color = 'var(--danger)';
      }
    }

// ========== clearGoogleAdsCredentials ==========
function clearGoogleAdsCredentials() { alert('Google Ads認証情報をクリアします'); }

// ========== clearTwitterCredentials ==========
async function clearTwitterCredentials() {
      try {
        if (!confirm('Twitter認証情報をクリアしますか？')) {
          return;
        }
        
        console.log('🗑️ Twitter認証情報クリア開始');
        const result = await window.electronAPI.invoke('twitter-clear-credentials');
        
        if (result.success) {
          // フォームをクリア
          document.getElementById('twitterApiKey').value = '';
          document.getElementById('twitterApiSecret').value = '';
          document.getElementById('twitterAccessToken').value = '';
          document.getElementById('twitterAccessTokenSecret').value = '';
          
          updateTwitterStatus(false);
          alert('✅ Twitter認証情報をクリアしました！');
        } else {
          alert(`❌ クリアエラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Twitter認証情報クリアエラー:', error);
        alert(`❌ クリアエラー: ${error.message}`);
      }
    }

// ========== clearYouTubeCredentials ==========
function clearYouTubeCredentials() { alert('YouTube認証情報をクリアします'); }

// ========== closeTwitterApiModal ==========
function closeTwitterApiModal() {
      document.getElementById('twitter-api-modal').style.display = 'none';
      twitterOAuthProjectId = null;
    }

// ========== disconnectTwitter ==========
async function disconnectTwitter(projectId) {
      if (!confirm('X (Twitter) 連携を解除しますか？\n\n解除すると、自動投稿機能が使用できなくなります。')) {
        return;
      }

      try {
        const result = await window.electronAPI.invoke('remove-project-twitter-auth', { projectId });

        if (result.success) {
          alert('✅ X (Twitter) 連携を解除しました');
          displayTwitterAuthStatus(projectId);
        } else {
          alert('❌ 連携解除エラー: ' + result.error);
        }
      } catch (error) {
        console.error('❌ X (Twitter) 連携解除エラー:', error);
        alert('❌ エラーが発生しました: ' + error.message);
      }
    }

// ========== displayTwitterAuthStatus ==========
async function displayTwitterAuthStatus(projectId) {
      const badgeElement = document.getElementById('x-connection-badge');
      const statusElement = document.getElementById('sns-x-status');

      if (!badgeElement || !statusElement) return;

      try {
        // ElectronAPI経由でX (Twitter)認証情報を取得
        const result = await window.electronAPI.invoke('get-project-twitter-auth', { projectId });

        if (result.success && result.isConnected) {
          // 連携済み
          const twitterAuth = result.twitterAuth;
          badgeElement.textContent = '✅ 連携済み';
          badgeElement.style.background = '#d1fae5';
          badgeElement.style.color = '#065f46';

          // クリック可能にして詳細表示
          statusElement.style.cursor = 'pointer';
          statusElement.onclick = () => showXConnectionDetails(projectId, twitterAuth);
          statusElement.style.border = '1px solid #10b981';
          statusElement.style.background = '#ecfdf5';
        } else {
          // 未連携
          badgeElement.textContent = '未連携';
          badgeElement.style.background = '#fee2e2';
          badgeElement.style.color = '#991b1b';

          // クリック可能にして連携開始
          statusElement.style.cursor = 'pointer';
          statusElement.onclick = () => startTwitterOAuth(projectId);
          statusElement.style.border = '1px solid #e5e7eb';
          statusElement.style.background = '#f9fafb';
        }
      } catch (error) {
        console.error('❌ X (Twitter)連携状態表示エラー:', error);
        badgeElement.textContent = 'エラー';
        badgeElement.style.background = '#fee2e2';
        badgeElement.style.color = '#991b1b';
      }
    }

// ========== firebaseGoogleLogin ==========
async function firebaseGoogleLogin() {
      try {
        const result = await window.electronAPI.invoke('firebase-google-login');
        
        if (result.success) {
          alert('✅ Googleアカウントでログインしました！');
          showFirebaseFunctions();
        } else {
          alert(`❌ Google ログインエラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Firebase Google ログインエラー:', error);
        alert(`❌ Google ログインエラー: ${error.message}`);
      }
    }

// ========== getPlatformDefaultType ==========
function getPlatformDefaultType(platform) {
      const defaults = {
        twitter: 'regular',        // 定期投稿が最適
        instagram: 'campaign',     // キャンペーン的な投稿が効果的
        linkedin: 'announcement',  // お知らせ・業界情報中心
        facebook: 'campaign'       // コミュニティ・エンゲージメント
      };
      return defaults[platform] || 'regular';
    }

// ========== getPlatformDefaultWeekdays ==========
function getPlatformDefaultWeekdays(platform) {
      const defaults = {
        twitter: ['1', '2', '3', '4', '5'],        // 平日毎日
        instagram: ['1', '3', '5'],                // 月水金
        linkedin: ['2', '4'],                      // 火木
        facebook: ['6', '0']                       // 土日
      };
      return defaults[platform] || ['1', '2', '3', '4', '5'];
    }

// ========== openTwitterSettings ==========
function openTwitterSettings() {
      // プロジェクト一覧に戻る（Twitter設定は後で別途実装）
      backToProjectList();
      alert('Twitter設定機能は今後実装予定です');
    }

// ========== postTestTweet ==========
async function postTestTweet() {
      try {
        const tweetText = document.getElementById('testTweetText').value.trim();
        
        if (!tweetText) {
          alert('❌ 投稿内容を入力してください');
          return;
        }
        
        if (tweetText.length > 280) {
          alert(`❌ ツイートが280文字を超えています（現在: ${tweetText.length}文字）`);
          return;
        }
        
        if (!confirm(`以下の内容を投稿しますか？\n\n「${tweetText}」`)) {
          return;
        }
        
        console.log('📤 テストツイート投稿開始');
        const result = await window.electronAPI.invoke('twitter-post-tweet', { content: tweetText });
        
        if (result.success) {
          alert('✅ テストツイートを投稿しました！');
          document.getElementById('testTweetText').value = '';
          updateTestTweetCharCount();
        } else {
          alert(`❌ 投稿エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ テストツイート投稿エラー:', error);
        alert(`❌ 投稿エラー: ${error.message}`);
      }
    }

// ========== saveGoogleAdsCredentials ==========
function saveGoogleAdsCredentials() { alert('Google Ads認証情報を保存します'); }

// ========== saveTwitterCredentials ==========
async function saveTwitterCredentials() {
      try {
        const apiKey = document.getElementById('twitterApiKey').value.trim();
        const apiSecret = document.getElementById('twitterApiSecret').value.trim();
        const accessToken = document.getElementById('twitterAccessToken').value.trim();
        const accessTokenSecret = document.getElementById('twitterAccessTokenSecret').value.trim();
        
        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
          alert('❌ すべての認証情報を入力してください');
          return;
        }
        
        const credentials = {
          apiKey,
          apiSecret,
          accessToken,
          accessTokenSecret
        };
        
        console.log('💾 Twitter認証情報保存開始');
        const result = await window.electronAPI.invoke('twitter-save-credentials', credentials);
        
        if (result.success) {
          alert('✅ Twitter認証情報を保存しました！');
          updateTwitterStatus(true);
        } else {
          alert(`❌ 保存エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Twitter認証情報保存エラー:', error);
        alert(`❌ 保存エラー: ${error.message}`);
      }
    }

// ========== saveYouTubeCredentials ==========
function saveYouTubeCredentials() { alert('YouTube認証情報を保存します'); }

// ========== searchVideos ==========
function searchVideos() { alert('動画を検索します'); }

// ========== startTwitterOAuth ==========
async function startTwitterOAuth(projectId) {
      twitterOAuthProjectId = projectId;

      // モーダルを表示
      document.getElementById('twitter-api-modal').style.display = 'block';

      // フォームをクリア
      document.getElementById('twitter-consumer-key').value = '';
      document.getElementById('twitter-consumer-secret').value = '';
    }

// ========== submitTwitterApiKeys ==========
async function submitTwitterApiKeys(event) {
      event.preventDefault();

      const consumerKey = document.getElementById('twitter-consumer-key').value.trim();
      const consumerSecret = document.getElementById('twitter-consumer-secret').value.trim();

      if (!consumerKey || !consumerSecret) {
        alert('❌ API KeyとSecretの両方を入力してください');
        return;
      }

      try {
        // OAuth認証開始
        const result = await window.electronAPI.invoke('twitter-oauth-start', {
          projectId: twitterOAuthProjectId,
          consumerKey,
          consumerSecret
        });

        if (result.success) {
          closeTwitterApiModal();
          alert('✅ ' + result.message);

          // 認証完了後、状態を更新（数秒待ってから）
          setTimeout(() => {
            displayTwitterAuthStatus(twitterOAuthProjectId);
          }, 3000);
        } else {
          alert('❌ Twitter認証開始エラー: ' + result.error);
        }
      } catch (error) {
        console.error('❌ Twitter OAuth開始エラー:', error);
        alert('❌ エラーが発生しました: ' + error.message);
      }
    }

// ========== testGoogleAdsConnection ==========
function testGoogleAdsConnection() { alert('Google Ads接続をテストします'); }

// ========== testTwitterConnection ==========
async function testTwitterConnection() {
      try {
        console.log('🔌 Twitter接続テスト開始');
        const result = await window.electronAPI.invoke('twitter-test-connection');
        
        if (result.success) {
          alert('✅ Twitter接続テスト成功！');
          updateTwitterStatus(true);
        } else {
          alert(`❌ 接続テストエラー: ${result.error}`);
          updateTwitterStatus(false);
        }
      } catch (error) {
        console.error('❌ Twitter接続テストエラー:', error);
        alert(`❌ 接続テストエラー: ${error.message}`);
      }
    }

// ========== testYouTubeConnection ==========
function testYouTubeConnection() { alert('YouTube接続をテストします'); }

// ========== updateTwitterStatus ==========
function updateTwitterStatus(isConnected) {
      const statusIndicator = document.getElementById('twitterStatusIndicator');
      const testBtn = document.getElementById('testTwitterConnectionBtn');
      const clearBtn = document.getElementById('clearTwitterCredentialsBtn');
      const postBtn = document.getElementById('testTweetBtn');
      
      if (isConnected) {
        statusIndicator.innerHTML = '<span style="color: #1d9bf0;">✅ 設定済み</span>';
        if (testBtn) testBtn.disabled = false;
        if (clearBtn) clearBtn.disabled = false;
        if (postBtn) postBtn.disabled = document.getElementById('testTweetText').value.trim() === '';
      } else {
        statusIndicator.innerHTML = '<span style="color: #657786;">❌ 未設定</span>';
        if (testBtn) testBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        if (postBtn) postBtn.disabled = true;
      }
    }
