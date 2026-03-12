/**
 * firebase-utils.js
 * Firebase Utilities
 * Firebase connection, migration, and synchronization utilities
 * 
 * Total functions: 11
 * Extracted from: index.html
 */

// ========== checkFirebaseConnection ==========
async function checkFirebaseConnection() {
      const statusElement = document.getElementById('firebaseConnectionStatus');
      
      if (statusElement) {
        statusElement.innerHTML = '<span style="color: var(--warning);">⏳ 接続確認中...</span>';
      }
      
      try {
        const result = await window.electronAPI.invoke('firebase-check-connection');
        
        if (result.success) {
          if (statusElement) {
            statusElement.innerHTML = '<span style="color: var(--success);">✅ 接続成功</span>';
          }
        } else {
          if (statusElement) {
            statusElement.innerHTML = '<span style="color: var(--danger);">❌ 接続失敗</span>';
          }
          console.error('❌ Firebase 接続確認失敗:', result.error);
        }
      } catch (error) {
        if (statusElement) {
          statusElement.innerHTML = '<span style="color: var(--danger);">❌ 接続エラー</span>';
        }
        console.error('❌ Firebase 接続確認エラー:', error);
      }
    }

// ========== checkFirebaseStatus ==========
async function checkFirebaseStatus() {
      const statusEl = document.getElementById('firebase-status');
      try {
        statusEl.innerHTML = '⏳ 確認中...';
        statusEl.style.color = 'var(--warning)';
        
        const result = await window.electronAPI.invoke('firebase-check-connection');
        if (result.success) {
          statusEl.innerHTML = '✅ 接続済み';
          statusEl.style.color = 'var(--success)';
        } else {
          statusEl.innerHTML = '❌ 未確認';
          statusEl.style.color = 'var(--danger)';
        }
      } catch (error) {
        statusEl.innerHTML = '❌ 未確認';
        statusEl.style.color = 'var(--danger)';
      }
    }

// ========== checkMigrationStatus ==========
async function checkMigrationStatus() {
      const statusElement = document.getElementById('migrationStatus');
      
      if (!currentUser) {
        if (statusElement) {
          statusElement.innerHTML = '<div style="color: var(--danger);">❌ ログインが必要です</div>';
        }
        return;
      }

      if (statusElement) {
        statusElement.innerHTML = '<div style="color: var(--warning);">⏳ 移行状態確認中...</div>';
      }

      try {
        const result = await window.electronAPI.invoke('check-migration-status');
        
        if (result.success) {
          const status = `
            <div style="color: #495057;">
              📊 <strong>移行状態</strong><br>
              ローカルプロジェクト: ${result.localProjects}件<br>
              Firestoreプロジェクト: ${result.firestoreProjects}件<br>
              ${result.migrationRecommended ? 
                '<span style="color: #856404;">⚠️ 移行推奨: ローカルデータをFirestoreに移行することをお勧めします</span>' : 
                '<span style="color: var(--success);">✅ データ同期済み</span>'
              }
            </div>
          `;
          if (statusElement) {
            statusElement.innerHTML = status;
          }
        } else {
          if (statusElement) {
            statusElement.innerHTML = `<div style="color: var(--danger);">❌ 状態確認失敗: ${result.error}</div>`;
          }
        }
      } catch (error) {
        console.error('❌ 移行状態確認エラー:', error);
        if (statusElement) {
          statusElement.innerHTML = '<div style="color: var(--danger);">❌ 状態確認エラー</div>';
        }
      }
    }

// ========== firebaseCreateAccount ==========
async function firebaseCreateAccount() {
      const email = document.getElementById('firebaseEmail').value.trim();
      const password = document.getElementById('firebasePassword').value.trim();
      
      if (!email || !password) {
        alert('メールアドレスとパスワードを入力してください');
        return;
      }
      
      if (password.length < 6) {
        alert('パスワードは6文字以上で入力してください');
        return;
      }
      
      try {
        const result = await window.electronAPI.invoke('firebase-create-account', { email, password });
        
        if (result.success) {
          alert('✅ アカウントを作成し、ログインしました！');
          showFirebaseFunctions();
          clearLoginForm();
        } else {
          alert(`❌ アカウント作成エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Firebase アカウント作成エラー:', error);
        alert(`❌ アカウント作成エラー: ${error.message}`);
      }
    }

// ========== firebaseLogin ==========
async function firebaseLogin() {
      const email = document.getElementById('firebaseEmail').value.trim();
      const password = document.getElementById('firebasePassword').value.trim();
      
      if (!email || !password) {
        alert('メールアドレスとパスワードを入力してください');
        return;
      }
      
      try {
        const result = await window.electronAPI.invoke('firebase-email-login', { email, password });
        
        if (result.success) {
          alert('✅ ログインしました！');
          showFirebaseFunctions();
          clearLoginForm();
        } else {
          alert(`❌ ログインエラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Firebase ログインエラー:', error);
        alert(`❌ ログインエラー: ${error.message}`);
      }
    }

// ========== initializeFirebaseUI ==========
function initializeFirebaseUI() {
      console.log('🔥 Firebase UI 初期化');
      checkFirebaseConnection();
      
      // 認証済みの場合、移行状態をチェック
      if (currentUser) {
        checkMigrationStatus();
      }
    }

// ========== migrateLocalToFirestore ==========
async function migrateLocalToFirestore() {
      if (!currentUser) {
        alert('❌ 移行にはログインが必要です');
        return;
      }

      const confirmMsg = 'ローカルプロジェクトデータをFirestoreに移行します。\n' +
                        'この操作により、プロジェクトがクラウドに保存されます。\n\n' +
                        '続行しますか？';
      
      if (!confirm(confirmMsg)) {
        return;
      }

      const resultElement = document.getElementById('migrationResult');
      if (resultElement) {
        resultElement.style.display = 'block';
        resultElement.innerHTML = '<div style="color: var(--warning);">⏳ 移行処理中...</div>';
      }

      try {
        const result = await window.electronAPI.invoke('migrate-local-to-firestore');
        
        if (result.success) {
          const successMsg = `
            <div style="color: #155724;">
              <h4 style="margin: 0 0 10px 0;">✅ 移行完了</h4>
              <p style="margin: 0 0 10px 0;">
                ${result.migrated}/${result.total} 件のプロジェクトを正常に移行しました。
              </p>
              <p style="margin: 0; font-size: 14px;">
                ${result.message}
              </p>
            </div>
          `;
          if (resultElement) {
            resultElement.innerHTML = successMsg;
          }
          
          // プロジェクト一覧を更新
          refreshProjectList();
          // 移行状態を再確認
          checkMigrationStatus();
          
        } else {
          if (resultElement) {
            resultElement.innerHTML = `
              <div style="color: #721c24;">
                <h4 style="margin: 0 0 10px 0;">❌ 移行失敗</h4>
                <p style="margin: 0;">${result.error}</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ 移行処理エラー:', error);
        if (resultElement) {
          resultElement.innerHTML = `
            <div style="color: #721c24;">
              <h4 style="margin: 0 0 10px 0;">❌ 移行エラー</h4>
              <p style="margin: 0;">${error.message}</p>
            </div>
          `;
        }
      }
    }

// ========== showFirebaseFunctions ==========
function showFirebaseFunctions() {
      document.getElementById('firebaseLoginSection').style.display = 'none';
      document.getElementById('firebaseFunctions').style.display = 'block';
    }

// ========== showFirebaseHistory ==========
async function showFirebaseHistory() {
      try {
        const result = await window.electronAPI.invoke('firebase-get-history');
        
        if (result.success) {
          if (result.history && result.history.length > 0) {
            const displayArea = document.getElementById('firebaseDataDisplay');
            let html = '<h4>📊 投稿履歴</h4>';
            
            result.history.forEach(item => {
              html += `
                <div style="background: #fff; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e1e8ed;">
                  <div style="font-weight: bold;">${item.project || '不明'}</div>
                  <div style="color: #666; font-size: 14px;">${item.content || 'データなし'}</div>
                  <div style="color: #999; font-size: 12px; margin-top: 5px;">${item.date || '日時不明'}</div>
                </div>
              `;
            });
            
            displayArea.innerHTML = html;
          } else {
            alert('📝 投稿履歴がまだありません');
          }
        } else {
          alert(`❌ 履歴取得エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ 履歴取得エラー:', error);
        alert('📊 投稿履歴機能は近日実装予定です');
      }
    }

// ========== syncAllProjectsToFirebase ==========
async function syncAllProjectsToFirebase() {
      try {
        console.log('🔄 全プロジェクト同期開始');
        
        const result = await window.electronAPI.invoke('firebase-sync-projects');
        
        if (result.success) {
          alert(`✅ ${result.syncCount || 0} 件のプロジェクトを同期しました`);
        } else {
          alert(`❌ 同期エラー: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ プロジェクト同期エラー:', error);
        alert(`❌ 同期エラー: ${error.message}`);
      }
    }

// ========== syncFirestoreToLocal ==========
async function syncFirestoreToLocal() {
      if (!currentUser) {
        alert('❌ 同期にはログインが必要です');
        return;
      }

      const confirmMsg = 'Firestoreからローカルにプロジェクトデータを同期します。\n' +
                        'ローカルデータが上書きされます。\n\n' +
                        '続行しますか？';
      
      if (!confirm(confirmMsg)) {
        return;
      }

      const resultElement = document.getElementById('migrationResult');
      if (resultElement) {
        resultElement.style.display = 'block';
        resultElement.innerHTML = '<div style="color: var(--warning);">⏳ 同期処理中...</div>';
      }

      try {
        const result = await window.electronAPI.invoke('sync-firestore-to-local');
        
        if (result.success) {
          const successMsg = `
            <div style="color: #155724;">
              <h4 style="margin: 0 0 10px 0;">✅ 同期完了</h4>
              <p style="margin: 0 0 10px 0;">
                ${result.synced} 件のプロジェクトをローカルに同期しました。
              </p>
            </div>
          `;
          if (resultElement) {
            resultElement.innerHTML = successMsg;
          }
          
          // プロジェクト一覧を更新
          refreshProjectList();
          // 移行状態を再確認
          checkMigrationStatus();
          
        } else {
          if (resultElement) {
            resultElement.innerHTML = `
              <div style="color: #721c24;">
                <h4 style="margin: 0 0 10px 0;">❌ 同期失敗</h4>
                <p style="margin: 0;">${result.error}</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('❌ 同期処理エラー:', error);
        if (resultElement) {
          resultElement.innerHTML = `
            <div style="color: #721c24;">
              <h4 style="margin: 0 0 10px 0;">❌ 同期エラー</h4>
              <p style="margin: 0;">${error.message}</p>
            </div>
          `;
        }
      }
    }
