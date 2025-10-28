// Firebase サービス管理クラス（テスト版）
const { getFirebaseConfig } = require('../../config/firebase-config');

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.functions = null;
    this.currentUser = null;
    this.isInitialized = false;
  }

  // 安全なコンソール出力ヘルパー
  _safeLog(message, data = null) {
    try {
      if (data === null) {
        console.log(message);
      } else if (typeof data === 'string' || typeof data === 'number') {
        console.log(message, data);
      } else if (Array.isArray(data)) {
        console.log(message, `配列(${data.length}件)`);
      } else if (typeof data === 'object') {
        // オブジェクトの場合は基本的な情報のみ出力
        const keys = Object.keys(data).slice(0, 3);
        console.log(message, `オブジェクト(${keys.join(', ')}${Object.keys(data).length > 3 ? '...' : ''})`);
      } else {
        console.log(message, typeof data);
      }
    } catch (error) {
      console.log(message, '[出力エラー]');
    }
  }

  /**
   * Firebase を初期化
   */
  async initialize() {
    try {
      console.log('🔥 Firebase 初期化開始...');
      
      // Firebase SDK を動的に読み込み
      const firebase = await import('firebase/app');
      const firebaseAuth = await import('firebase/auth');
      const firebaseFirestore = await import('firebase/firestore');
      const firebaseFunctions = await import('firebase/functions');
      
      // Firebase設定を取得
      const firebaseConfig = getFirebaseConfig();
      
      // Firebase アプリを初期化
      this.app = firebase.initializeApp(firebaseConfig);
      this.auth = firebaseAuth.getAuth(this.app);
      this.db = firebaseFirestore.getFirestore(this.app);
      this.functions = firebaseFunctions.getFunctions(this.app, 'asia-northeast1'); // 東京リージョン
      
      // Firebase Auth モジュールを保存（後で使用するため）
      this.firebaseAuth = firebaseAuth;
      this.firebaseFirestore = firebaseFirestore;
      this.firebaseFunctions = firebaseFunctions;
      
      // 認証状態監視
      firebaseAuth.onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        console.log('👤 認証状態変更:', user ? `${user.email} でログイン` : 'ログアウト');
      });

      this.isInitialized = true;
      console.log('✅ Firebase 初期化完了');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Firebase 初期化失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 初期化チェック
   */
  _checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Firebase が初期化されていません。initialize() を先に実行してください。');
    }
  }

  /**
   * 認証状態チェック
   */
  _checkAuthenticated() {
    this._checkInitialized();
    if (!this.currentUser) {
      throw new Error('ログインが必要です');
    }
  }

  // ==========================================
  // 認証関連メソッド
  // ==========================================

  /**
   * メール・パスワードでログイン
   */
  async signInWithEmail(email, password) {
    try {
      this._checkInitialized();
      
      const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ ログイン成功:', user.email);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }
      };
      
    } catch (error) {
      console.error('❌ ログイン失敗:', error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * メール・パスワードでアカウント作成
   */
  async createUserWithEmail(email, password) {
    try {
      this._checkInitialized();
      
      const userCredential = await this.firebaseAuth.createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ アカウント作成成功:', user.email);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }
      };
      
    } catch (error) {
      console.error('❌ アカウント作成失敗:', error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * Googleアカウントでログイン（Electron用リダイレクト方式）
   */
  async signInWithGoogle() {
    try {
      this._checkInitialized();
      
      const provider = new this.firebaseAuth.GoogleAuthProvider();
      // Electronではリダイレクト方式を使用
      await this.firebaseAuth.signInWithRedirect(this.auth, provider);
      
      // リダイレクト後の結果を取得
      const result = await this.firebaseAuth.getRedirectResult(this.auth);
      
      if (result && result.user) {
        const user = result.user;
        console.log('✅ Google ログイン成功:', user.email);
        
        return {
          success: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        };
      } else {
        // リダイレクト開始（結果は後で取得）
        return {
          success: true,
          redirect: true,
          message: 'Googleログインページにリダイレクトしています...'
        };
      }
      
    } catch (error) {
      console.error('❌ Google ログイン失敗:', error);
      return { success: false, error: error.message, code: error.code };
    }
  }

  /**
   * ログアウト
   */
  async signOut() {
    try {
      this._checkInitialized();
      
      await this.firebaseAuth.signOut(this.auth);
      console.log('✅ ログアウト成功');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ ログアウト失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 現在のユーザー情報を取得
   */
  getCurrentUser() {
    return this.currentUser ? {
      uid: this.currentUser.uid,
      email: this.currentUser.email,
      displayName: this.currentUser.displayName,
      photoURL: this.currentUser.photoURL
    } : null;
  }

  /**
   * ログイン状態チェック
   */
  isLoggedIn() {
    return !!this.currentUser;
  }

  // ==========================================
  // Functions 呼び出しメソッド
  // ==========================================

  /**
   * プロジェクトをFirebaseに同期
   */
  async syncProject(action, projectData) {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const syncFromElectron = this.firebaseFunctions.httpsCallable(this.functions, 'syncFromElectron');
      const result = await syncFromElectron({
        action: action, // 'create', 'update', 'delete', 'sync'
        projectData: projectData
      });

      this._safeLog(`✅ プロジェクト同期成功 (${action}):`, result.data);
      return { success: true, data: result.data };
      
    } catch (error) {
      console.error(`❌ プロジェクト同期失敗 (${action}):`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ユーザーのプロジェクト一覧を取得
   */
  async getUserProjects() {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const getUserProjects = this.firebaseFunctions.httpsCallable(this.functions, 'getUserProjects');
      const result = await getUserProjects();

      console.log('✅ プロジェクト一覧取得成功:', result.data.projects.length + '件');
      return { success: true, projects: result.data.projects };
      
    } catch (error) {
      console.error('❌ プロジェクト一覧取得失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ユーザーのプロジェクト一覧を取得（シンプル版）
   */
  async getUserProjectsSimple() {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const getUserProjectsSimple = this.firebaseFunctions.httpsCallable(this.functions, 'getUserProjectsSimple');
      const result = await getUserProjectsSimple();

      console.log('✅ プロジェクト一覧取得成功（シンプル版）:', result.data.projects.length + '件');
      return { success: true, projects: result.data.projects };
      
    } catch (error) {
      console.error('❌ プロジェクト一覧取得失敗（シンプル版）:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトスケジュールを更新
   */
  async updateProjectSchedule(projectId, scheduleData) {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const updateProjectSchedule = this.firebaseFunctions.httpsCallable(this.functions, 'updateProjectSchedule');
      const result = await updateProjectSchedule({
        projectId: projectId,
        scheduleData: scheduleData
      });

      console.log('✅ スケジュール更新成功:', result.data);
      return { success: true, data: result.data };
      
    } catch (error) {
      console.error('❌ スケジュール更新失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトの投稿履歴を取得
   */
  async getProjectHistory(projectId, limit = 50) {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const getProjectHistory = this.firebaseFunctions.httpsCallable(this.functions, 'getProjectHistory');
      const result = await getProjectHistory({
        projectId: projectId,
        limit: limit
      });

      console.log('✅ 投稿履歴取得成功:', result.data.history.length + '件');
      return { success: true, history: result.data.history };
      
    } catch (error) {
      console.error('❌ 投稿履歴取得失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 失敗したツイートを再試行
   */
  async retryTweet(tweetId) {
    try {
      this._checkInitialized();
      
      if (!this.currentUser) {
        throw new Error('ログインが必要です');
      }

      const retrySpecificTweet = this.firebaseFunctions.httpsCallable(this.functions, 'retrySpecificTweet');
      const result = await retrySpecificTweet({
        tweetId: tweetId
      });

      console.log('✅ ツイート再試行成功:', result.data);
      return { success: true, data: result.data };
      
    } catch (error) {
      console.error('❌ ツイート再試行失敗:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // プロジェクト管理（階層構造）
  // ==========================================

  /**
   * ユーザーのプロジェクト一覧を取得（階層構造）
   */
  async getUserProjectsHierarchical() {
    try {
      this._checkInitialized();
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.log('ℹ️ ユーザー未認証のため、プロジェクト一覧を空で返します');
        return { success: true, projects: [] };
      }

      // 階層構造: users/{userId}/projects
      const projectsRef = this.firebaseFirestore.collection(
        this.db, 
        'users', 
        currentUser.uid, 
        'projects'
      );
      
      const projectsQuery = this.firebaseFirestore.query(
        projectsRef,
        this.firebaseFirestore.orderBy('lastModified', 'desc')
      );

      const snapshot = await this.firebaseFirestore.getDocs(projectsQuery);
      const projects = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        projects.push({
          id: doc.id,
          ...data
        });
      });

      console.log(`✅ プロジェクト一覧取得成功（階層構造）: ${projects.length}件`);

      // 巨大なオブジェクトのコンソール出力を避けるため、プロジェクト名のみログ出力
      if (projects.length > 0) {
        const projectNames = projects.map(p => p.name || 'Unnamed').join(', ');
        if (projectNames.length < 200) { // 200文字以下の場合のみ出力
          console.log(`📋 プロジェクト: ${projectNames}`);
        }
      }

      return { success: true, projects };

    } catch (error) {
      console.error('❌ プロジェクト一覧取得エラー（階層構造）:', error);
      if (error.code === 'permission-denied' || error.code === 'not-found' || error.code === 'unauthenticated') {
        console.log('ℹ️ 認証/権限エラー - 空のプロジェクト一覧を返します');
        return { success: true, projects: [] };
      }
      return { success: false, error: error.message, projects: [] };
    }
  }

  /**
   * プロジェクト作成（階層構造）
   */
  async createProjectHierarchical(projectData) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // プロジェクトデータの準備
      const firestoreProject = {
        userId: currentUser.uid,
        name: projectData.name,
        description: projectData.description || '',
        category: projectData.category || 'web',
        localPath: projectData.localPath || projectData.path || '',
        settings: {
          autoSync: projectData.settings?.autoSync ?? true,
          aiModel: projectData.settings?.aiModel || 'qwen2.5:0.5b',
          defaultTimezone: projectData.settings?.defaultTimezone || 'Asia/Tokyo'
        },
        stats: {
          totalPosts: 0,
          activePlans: 0,
          lastActivity: null
        },
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // 階層構造: users/{userId}/projects
      const projectsRef = this.firebaseFirestore.collection(
        this.db,
        'users',
        currentUser.uid,
        'projects'
      );

      const docRef = await this.firebaseFirestore.addDoc(projectsRef, firestoreProject);
      
      console.log('✅ プロジェクト作成成功（階層構造）:', docRef.id);
      return { 
        success: true, 
        id: docRef.id, 
        project: { id: docRef.id, ...firestoreProject } 
      };

    } catch (error) {
      console.error('❌ プロジェクト作成エラー（階層構造）:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクト取得（階層構造）
   */
  async getProjectHierarchical(projectId) {
    try {
      this._checkInitialized();
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'ログインが必要です' };
      }

      // 階層構造: users/{userId}/projects/{projectId}
      const projectRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId
      );

      const doc = await this.firebaseFirestore.getDoc(projectRef);
      
      if (!doc.exists()) {
        return { success: false, error: 'プロジェクトが見つかりません' };
      }

      const project = {
        id: doc.id,
        ...doc.data()
      };

      console.log('✅ プロジェクト取得成功（階層構造）:', projectId);
      return { success: true, project };

    } catch (error) {
      console.error('❌ プロジェクト取得エラー（階層構造）:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクト更新（階層構造）
   */
  async updateProjectHierarchical(projectId, updateData) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}
      const projectRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId
      );
      
      await this.firebaseFirestore.updateDoc(projectRef, {
        ...updateData,
        lastModified: new Date().toISOString()
      });
      
      console.log('✅ プロジェクト更新成功（階層構造）:', projectId);
      return { success: true, id: projectId };

    } catch (error) {
      console.error('❌ プロジェクト更新エラー（階層構造）:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクト削除（階層構造）
   */
  async deleteProjectHierarchical(projectId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}
      const projectRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId
      );
      
      await this.firebaseFirestore.deleteDoc(projectRef);
      
      console.log('✅ プロジェクト削除成功（階層構造）:', projectId);
      return { success: true, id: projectId };

    } catch (error) {
      console.error('❌ プロジェクト削除エラー（階層構造）:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // プラン管理
  // ==========================================

  /**
   * プロジェクトのプラン一覧を取得（階層構造）
   */
  async getProjectPlans(projectId) {
    try {
      this._checkInitialized();
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.log('ℹ️ ユーザー未認証のため、プラン一覧を空で返します');
        return { success: true, plans: [] };
      }

      // 階層構造: users/{userId}/projects/{projectId}/plans
      const plansRef = this.firebaseFirestore.collection(
        this.db, 
        'users', 
        currentUser.uid, 
        'projects', 
        projectId, 
        'plans'
      );
      
      const plansQuery = this.firebaseFirestore.query(
        plansRef,
        this.firebaseFirestore.orderBy('createdAt', 'desc')
      );

      const snapshot = await this.firebaseFirestore.getDocs(plansQuery);
      const plans = [];

      snapshot.forEach(doc => {
        plans.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ プラン一覧取得成功: ${plans.length}件`);
      return { success: true, plans };

    } catch (error) {
      console.error('❌ プラン一覧取得エラー:', error);
      // 認証エラーや not-found エラーの場合は空の配列を返す
      if (error.code === 'permission-denied' || error.code === 'not-found' || error.code === 'unauthenticated') {
        console.log('ℹ️ 認証/権限エラー - 空のプラン一覧を返します');
        return { success: true, plans: [] };
      }
      return { success: false, error: error.message, plans: [] };
    }
  }

  /**
   * プラン作成（階層構造）
   */
  async createPlan(projectId, planData) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      console.log('🔍 プラン作成開始:');
      console.log('- ユーザーID:', currentUser?.uid);
      console.log('- プロジェクトID:', projectId);
      console.log('- プラン名:', planData.name || 'Unnamed');
      console.log('- 投稿頻度:', planData.frequency || 'unknown');

      // 階層構造: users/{userId}/projects/{projectId}/plans
      const plansRef = this.firebaseFirestore.collection(
        this.db, 
        'users', 
        currentUser.uid, 
        'projects', 
        projectId, 
        'plans'
      );

      const docRef = await this.firebaseFirestore.addDoc(plansRef, planData);
      
      console.log('✅ プラン作成成功:', docRef.id);
      return { success: true, id: docRef.id, plan: { id: docRef.id, ...planData } };

    } catch (error) {
      console.error('❌ プラン作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラン更新（階層構造対応）
   */
  async updatePlan(projectId, planId, updateData) {
    try {
      this._checkInitialized();
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('ユーザー認証が必要です');
      }

      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}
      const planRef = this.firebaseFirestore.doc(
        this.db, 
        'users', 
        currentUser.uid, 
        'projects', 
        projectId, 
        'plans', 
        planId
      );
      
      await this.firebaseFirestore.updateDoc(planRef, updateData);
      
      console.log('✅ プラン更新成功:', planId);
      return { success: true, id: planId };

    } catch (error) {
      console.error('❌ プラン更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラン削除
   */
  async deletePlan(projectId, planId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('ユーザー認証が必要です');
      }

      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}
      const planRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId
      );

      await this.firebaseFirestore.deleteDoc(planRef);

      console.log('✅ プラン削除成功:', planId);
      return { success: true, id: planId };

    } catch (error) {
      console.error('❌ プラン削除エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // 投稿管理
  // ==========================================

  /**
   * プロジェクトの投稿一覧を取得（階層構造・全プランの投稿を含む）
   */
  async getProjectPosts(projectId) {
    try {
      this._checkInitialized();
      
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.log('ℹ️ ユーザー未認証のため、投稿一覧を空で返します');
        return { success: true, posts: [] };
      }

      // 1. まずプロジェクトのプラン一覧を取得
      const plansResult = await this.getProjectPlans(projectId);
      if (!plansResult.success || !plansResult.plans) {
        return { success: true, posts: [] };
      }

      // 2. 各プランの投稿を取得して結合
      const allPosts = [];
      
      for (const plan of plansResult.plans) {
        const postsRef = this.firebaseFirestore.collection(
          this.db, 
          'users', 
          currentUser.uid, 
          'projects', 
          projectId, 
          'plans',
          plan.id,
          'posts'
        );
        
        const postsQuery = this.firebaseFirestore.query(
          postsRef,
          this.firebaseFirestore.orderBy('createdAt', 'desc')
        );

        const snapshot = await this.firebaseFirestore.getDocs(postsQuery);
        
        snapshot.forEach(doc => {
          allPosts.push({
            id: doc.id,
            planId: plan.id,
            planName: plan.name,
            ...doc.data()
          });
        });
      }

      // 3. 作成日時でソート
      allPosts.sort((a, b) => {
        const aTime = a.scheduledAt || a.createdAt;
        const bTime = b.scheduledAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });

      console.log(`✅ 投稿一覧取得成功: ${allPosts.length}件`);
      return { success: true, posts: allPosts };

    } catch (error) {
      console.error('❌ 投稿一覧取得エラー:', error);
      if (error.code === 'permission-denied' || error.code === 'not-found' || error.code === 'unauthenticated') {
        console.log('ℹ️ 認証/権限エラー - 空の投稿一覧を返します');
        return { success: true, posts: [] };
      }
      return { success: false, error: error.message, posts: [] };
    }
  }

  /**
   * 投稿作成（階層構造）
   */
  async createPost(projectId, planId, postData) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}/posts
      const postsRef = this.firebaseFirestore.collection(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId,
        'posts'
      );

      const docRef = await this.firebaseFirestore.addDoc(postsRef, postData);
      
      console.log('✅ 投稿作成成功:', docRef.id);
      return { success: true, id: docRef.id, post: { id: docRef.id, ...postData } };

    } catch (error) {
      console.error('❌ 投稿作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 個別投稿を取得
   * @param {string} projectId - プロジェクトID
   * @param {string} planId - プランID
   * @param {string} postId - 投稿ID
   * @returns {Object} 投稿データ
   */
  async getPost(projectId, planId, postId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}
      const postRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId,
        'posts',
        postId
      );

      const postDoc = await this.firebaseFirestore.getDoc(postRef);
      
      if (!postDoc.exists()) {
        return { success: false, error: '投稿が見つかりません' };
      }

      const postData = postDoc.data();
      
      return { 
        success: true, 
        post: {
          id: postDoc.id,
          ...postData
        }
      };

    } catch (error) {
      console.error('❌ 投稿取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 投稿更新（階層構造）
   */
  async updatePost(projectId, planId, postId, updateData) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}
      const postRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId,
        'posts',
        postId
      );
      
      await this.firebaseFirestore.updateDoc(postRef, {
        ...updateData,
        lastModified: new Date().toISOString()
      });
      
      console.log('✅ 投稿更新成功:', postId);
      return { success: true, id: postId };

    } catch (error) {
      console.error('❌ 投稿更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 投稿削除（階層構造）
   */
  async deletePost(projectId, planId, postId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // 階層構造: users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}
      const postRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId,
        'posts',
        postId
      );
      
      await this.firebaseFirestore.deleteDoc(postRef);
      
      console.log('✅ 投稿削除成功:', postId);
      return { success: true, id: postId };

    } catch (error) {
      console.error('❌ 投稿削除エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // 自動投稿管理
  // ==========================================

  /**
   * プロジェクトの自動投稿を実行
   * @param {string} projectId - プロジェクトID
   * @returns {Object} 実行結果
   */
  async executeAutoPostsForProject(projectId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const AutoPostManager = require('./auto-post-manager');
      const autoPostManager = new AutoPostManager(this);

      console.log(`🤖 プロジェクト自動投稿実行開始: ${projectId}`);
      const result = await autoPostManager.processProjectAutoPosts(projectId);

      console.log(`✅ プロジェクト自動投稿実行完了: ${result.generated}件生成`);
      return result;

    } catch (error) {
      console.error('❌ プロジェクト自動投稿実行エラー:', error);
      return {
        success: false,
        error: error.message,
        processed: 0,
        generated: 0
      };
    }
  }

  /**
   * 全プロジェクトの自動投稿を実行
   * @returns {Object} 実行結果
   */
  async executeAutoPostsForAllProjects() {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const AutoPostManager = require('./auto-post-manager');
      const autoPostManager = new AutoPostManager(this);

      console.log('🌐 全プロジェクト自動投稿実行開始');
      const result = await autoPostManager.processAllProjectsAutoPosts();

      console.log(`✅ 全プロジェクト自動投稿実行完了: ${result.totalGenerated}件生成`);
      return result;

    } catch (error) {
      console.error('❌ 全プロジェクト自動投稿実行エラー:', error);
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
   * プロジェクトの次回投稿予定を取得
   * @param {string} projectId - プロジェクトID
   * @returns {Object} 次回投稿予定
   */
  async getUpcomingAutoPosts(projectId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const AutoPostManager = require('./auto-post-manager');
      const autoPostManager = new AutoPostManager(this);

      console.log(`📅 次回投稿予定取得: ${projectId}`);
      const result = await autoPostManager.getUpcomingPosts(projectId);

      console.log(`✅ 次回投稿予定取得完了: ${result.upcomingPosts?.length || 0}件`);
      return result;

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
   * プランの自動投稿機能を有効/無効にする
   * @param {string} projectId - プロジェクトID
   * @param {string} planId - プランID
   * @param {boolean} isActive - 有効/無効
   * @returns {Object} 更新結果
   */
  async updatePlanAutoPostStatus(projectId, planId, isActive) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const currentUser = this.getCurrentUser();
      
      // プランのisActiveフラグを更新
      const planRef = this.firebaseFirestore.doc(
        this.db,
        'users',
        currentUser.uid,
        'projects',
        projectId,
        'plans',
        planId
      );
      
      await this.firebaseFirestore.updateDoc(planRef, {
        isActive: isActive,
        lastModified: new Date().toISOString()
      });
      
      console.log(`✅ プラン自動投稿ステータス更新: ${planId} → ${isActive ? '有効' : '無効'}`);
      return { success: true, planId, isActive };

    } catch (error) {
      console.error('❌ プラン自動投稿ステータス更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 手動で特定プランの投稿を生成
   * @param {string} projectId - プロジェクトID
   * @param {string} planId - プランID
   * @returns {Object} 生成結果
   */
  async generateManualAutoPost(projectId, planId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      // プロジェクト情報を取得
      const projectResult = await this.getProjectHierarchical(projectId);
      if (!projectResult.success) {
        throw new Error(`プロジェクト取得失敗: ${projectResult.error}`);
      }

      // プラン情報を取得
      const plansResult = await this.getProjectPlans(projectId);
      if (!plansResult.success) {
        throw new Error(`プラン取得失敗: ${plansResult.error}`);
      }

      const plan = plansResult.plans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('指定されたプランが見つかりません');
      }

      const AutoPostManager = require('./auto-post-manager');
      const autoPostManager = new AutoPostManager(this);

      console.log(`🎯 手動自動投稿生成: ${plan.name}`);
      const result = await autoPostManager.generateAutoPost(projectResult.project, plan);

      console.log(`✅ 手動自動投稿生成完了: ${result.success ? '成功' : '失敗'}`);
      return result;

    } catch (error) {
      console.error('❌ 手動自動投稿生成エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // ヘルスチェック
  // ==========================================

  /**
   * Firebase接続状況をチェック
   */
  async checkConnection() {
    try {
      this._checkInitialized();
      
      // Health Check Function を呼び出し
      const response = await fetch(
        `https://asia-northeast1-${firebaseConfig.projectId}.cloudfunctions.net/healthCheck`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Firebase接続確認:', data);
        return { success: true, data };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Firebase接続確認失敗:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // 会話記録管理機能
  // ==========================================

  /**
   * 会話記録を保存
   */
  async saveConversation(projectId, planId, postId, conversationData) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      // 会話記録のパス: /users/{userId}/projects/{projectId}/plans/{planId}/posts/{postId}/conversations/
      const conversationsRef = firestore.collection(this.db,
        'users', userId,
        'projects', projectId,
        'plans', planId,
        'posts', postId,
        'conversations'
      );

      const docRef = await firestore.addDoc(conversationsRef, conversationData);

      console.log('✅ 会話記録保存成功:', docRef.id);
      return {
        success: true,
        conversationId: docRef.id,
        message: '会話記録を保存しました'
      };

    } catch (error) {
      console.error('❌ 会話記録保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 投稿の会話記録を取得
   */
  async getPostConversations(projectId, planId, postId) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const conversationsRef = firestore.collection(this.db,
        'users', userId,
        'projects', projectId,
        'plans', planId,
        'posts', postId,
        'conversations'
      );

      const q = firestore.query(
        conversationsRef,
        firestore.orderBy('createdAt', 'desc')
      );

      const querySnapshot = await firestore.getDocs(q);
      const conversations = [];

      querySnapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ 投稿会話記録取得: ${conversations.length}件`);
      return {
        success: true,
        conversations,
        count: conversations.length
      };

    } catch (error) {
      console.error('❌ 投稿会話記録取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラン全体の会話記録を取得（collectionGroup使用）
   */
  async getPlanConversations(planId, limit = 20) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const firestore = await import('firebase/firestore');

      // collectionGroupを使用してプラン内の全投稿の会話記録を取得
      const conversationsRef = firestore.collectionGroup(this.db, 'conversations');

      const q = firestore.query(
        conversationsRef,
        firestore.where('planId', '==', planId),
        firestore.orderBy('createdAt', 'desc'),
        firestore.limit(limit)
      );

      const querySnapshot = await firestore.getDocs(q);
      const conversations = [];

      querySnapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          path: doc.ref.path, // パス情報も含める
          ...doc.data()
        });
      });

      console.log(`✅ プラン会話記録取得: ${conversations.length}件`);
      return {
        success: true,
        conversations,
        count: conversations.length
      };

    } catch (error) {
      console.error('❌ プラン会話記録取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 会話記録を更新
   */
  async updateConversation(projectId, planId, postId, conversationId, updateData) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const conversationRef = firestore.doc(this.db,
        'users', userId,
        'projects', projectId,
        'plans', planId,
        'posts', postId,
        'conversations', conversationId
      );

      await firestore.updateDoc(conversationRef, updateData);

      console.log('✅ 会話記録更新成功:', conversationId);
      return {
        success: true,
        message: '会話記録を更新しました'
      };

    } catch (error) {
      console.error('❌ 会話記録更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 会話記録から学習データを抽出
   */
  async extractLearningFromConversations(conversations) {
    try {
      const learningPatterns = {
        tonePreferences: [],
        styleElements: [],
        contentTypes: [],
        userPatterns: []
      };

      conversations.forEach(conversation => {
        if (conversation.summary && conversation.summary.userPreferences) {
          learningPatterns.tonePreferences.push(...conversation.summary.userPreferences);
        }

        // メッセージから学習パターンを抽出
        conversation.messages?.forEach(message => {
          if (message.role === 'user') {
            // ユーザーの指示パターンを分析
            const content = message.content.toLowerCase();

            if (content.includes('カジュアル') || content.includes('親しみ')) {
              learningPatterns.tonePreferences.push('casual');
            }
            if (content.includes('絵文字') || content.includes('emoji')) {
              learningPatterns.styleElements.push('emoji');
            }
            if (content.includes('短く') || content.includes('簡潔')) {
              learningPatterns.styleElements.push('concise');
            }
          }
        });
      });

      // 重複除去と頻度計算
      const preferences = this.analyzeFrequency(learningPatterns);

      return {
        success: true,
        learningData: preferences,
        conversationCount: conversations.length
      };

    } catch (error) {
      console.error('❌ 学習データ抽出エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 頻度分析ヘルパー
   */
  analyzeFrequency(patterns) {
    const frequency = {};

    Object.keys(patterns).forEach(key => {
      const items = patterns[key];
      const counts = {};

      items.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });

      // 頻度順にソート
      frequency[key] = Object.entries(counts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5) // 上位5つ
        .map(([item, count]) => ({ item, count }));
    });

    return frequency;
  }

  // ==========================================
  // AI概要生成・管理機能
  // ==========================================

  /**
   * プロジェクトのAI概要を更新・保存
   */
  async updateProjectAISummary(projectId, summaryData) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const projectRef = firestore.doc(this.db,
        'users', userId,
        'projects', projectId
      );

      // 既存のプロジェクトデータを取得
      const projectDoc = await firestore.getDoc(projectRef);
      if (!projectDoc.exists()) {
        return { success: false, error: 'プロジェクトが見つかりません' };
      }

      const projectData = projectDoc.data();
      const currentHistory = projectData.summaryHistory || [];

      // 新しい履歴エントリを作成（AI生成の場合のみ）
      let newHistory = [...currentHistory];
      if (summaryData.aiSummary && summaryData.generatedAt) {
        newHistory.push({
          version: currentHistory.length + 1,
          content: summaryData.aiSummary,
          createdAt: summaryData.generatedAt,
          prompt: summaryData.prompt || null,
          provider: summaryData.provider || null,
          manuallyEdited: summaryData.manuallyEdited || false
        });

        // 履歴は最大10件まで保持
        if (newHistory.length > 10) {
          newHistory = newHistory.slice(-10);
        }
      }

      // プロジェクトを更新
      const updateData = {
        ...summaryData,
        summaryHistory: newHistory,
        updatedAt: new Date().toISOString()
      };

      await firestore.updateDoc(projectRef, updateData);

      console.log('✅ プロジェクトAI概要更新成功:', projectId);
      return {
        success: true,
        message: 'AI概要を更新しました'
      };

    } catch (error) {
      console.error('❌ プロジェクトAI概要更新エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトの詳細情報を取得（AI概要を含む）
   */
  async getProjectDetailsWithAISummary(projectId) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const projectRef = firestore.doc(this.db,
        'users', userId,
        'projects', projectId
      );

      const projectDoc = await firestore.getDoc(projectRef);
      if (!projectDoc.exists()) {
        return { success: false, error: 'プロジェクトが見つかりません' };
      }

      const projectData = projectDoc.data();

      console.log('✅ プロジェクト詳細取得成功（AI概要含む）:', projectId);
      return {
        success: true,
        project: {
          id: projectDoc.id,
          ...projectData
        }
      };

    } catch (error) {
      console.error('❌ プロジェクト詳細取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 個別プランを取得
   */
  async getPlan(projectId, planId) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const planRef = firestore.doc(this.db,
        'users', userId,
        'projects', projectId,
        'plans', planId
      );

      const planDoc = await firestore.getDoc(planRef);
      if (!planDoc.exists()) {
        return { success: false, error: 'プランが見つかりません' };
      }

      const planData = planDoc.data();
      console.log('✅ プラン取得成功:', planId);

      return {
        success: true,
        plan: {
          id: planId,
          ...planData
        }
      };

    } catch (error) {
      console.error('❌ プラン取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プラン詳細情報を取得
   */
  async getPlanDetails(projectId, planId) {
    try {
      if (!this.isLoggedIn()) {
        return { success: false, error: 'ログインが必要です' };
      }

      const userId = this.currentUser.uid;
      const firestore = await import('firebase/firestore');

      const planRef = firestore.doc(this.db,
        'users', userId,
        'projects', projectId,
        'plans', planId
      );

      const planDoc = await firestore.getDoc(planRef);
      if (!planDoc.exists()) {
        return { success: false, error: 'プランが見つかりません' };
      }

      const planData = planDoc.data();

      console.log('✅ プラン詳細取得成功:', planId);
      return {
        success: true,
        plan: {
          id: planDoc.id,
          ...planData
        }
      };

    } catch (error) {
      console.error('❌ プラン詳細取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ユーザーAI設定をFirestoreに保存
   */
  async saveUserAIConfig(userId, aiConfig) {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('Firebase が初期化されていません');
      }

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const settingsRef = this.firebaseFirestore.doc(this.db, `users/${userId}/settings/aiConfig`);

      const configToSave = {
        ...aiConfig,
        updatedAt: this.firebaseFirestore.serverTimestamp(),
        createdAt: aiConfig.createdAt || this.firebaseFirestore.serverTimestamp()
      };

      await this.firebaseFirestore.setDoc(settingsRef, configToSave);

      console.log('✅ ユーザーAI設定保存成功:', userId);
      return { success: true };

    } catch (error) {
      console.error('❌ ユーザーAI設定保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ユーザーAI設定をFirestoreから読み込み
   */
  async loadUserAIConfig(userId) {
    try {
      if (!this.isInitialized || !this.db) {
        throw new Error('Firebase が初期化されていません');
      }

      if (!userId) {
        throw new Error('ユーザーIDが必要です');
      }

      const settingsRef = this.firebaseFirestore.doc(this.db, `users/${userId}/settings/aiConfig`);
      const settingsDoc = await this.firebaseFirestore.getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        console.log('ℹ️ ユーザーAI設定が存在しません - デフォルト設定を返します:', userId);

        // デフォルト設定を返す
        const defaultConfig = {
          defaultProvider: 'gemini',
          providers: {
            ollama: {
              enabled: true,
              baseUrl: 'http://localhost:11434',
              model: 'qwen2.5:0.5b',
              cloudAvailable: false
            },
            openai: {
              enabled: false,
              apiKey: '',
              model: 'gpt-3.5-turbo',
              cloudAvailable: true
            },
            claude: {
              enabled: false,
              apiKey: '',
              model: 'claude-3-haiku-20240307',
              cloudAvailable: true
            },
            gemini: {
              enabled: false,
              apiKey: '',
              model: 'gemini-pro',
              cloudAvailable: true
            }
          }
        };

        return { success: true, config: defaultConfig };
      }

      const configData = settingsDoc.data();
      console.log('✅ ユーザーAI設定読み込み成功:', userId);

      return { success: true, config: configData };

    } catch (error) {
      console.error('❌ ユーザーAI設定読み込みエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LocalStorageからFirestoreへのAI設定マイグレーション
   */
  async migrateAIConfigFromLocalStorage(userId) {
    try {
      // LocalStorageから設定を読み込み
      const localConfig = localStorage.getItem('ai-service-config');
      if (!localConfig) {
        console.log('ℹ️ LocalStorageにAI設定が見つかりません');
        return { success: true, migrated: false };
      }

      const parsedConfig = JSON.parse(localConfig);

      // Firestore形式に変換
      const firestoreConfig = {
        defaultProvider: parsedConfig.currentProvider || 'gemini',
        providers: {}
      };

      // 既存の設定を新形式に変換
      if (parsedConfig.config) {
        Object.keys(parsedConfig.config).forEach(provider => {
          firestoreConfig.providers[provider] = {
            ...parsedConfig.config[provider],
            enabled: true,
            cloudAvailable: provider !== 'ollama'
          };
        });
      }

      // Firestoreに保存
      const saveResult = await this.saveUserAIConfig(userId, firestoreConfig);

      if (saveResult.success) {
        console.log('✅ AI設定マイグレーション成功:', userId);
        return { success: true, migrated: true };
      } else {
        throw new Error(saveResult.error);
      }

    } catch (error) {
      console.error('❌ AI設定マイグレーションエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのTwitter認証情報を保存
   * @param {string} projectId - プロジェクトID
   * @param {object} twitterAuth - Twitter認証情報
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveProjectTwitterAuth(projectId, twitterAuth) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      // プロジェクトドキュメントを更新
      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);

      await this.firebaseFirestore.updateDoc(projectRef, {
        twitterAuth: twitterAuth,
        updatedAt: this.firebaseFirestore.serverTimestamp()
      });

      console.log('✅ プロジェクトTwitter認証情報保存成功:', projectId);

      return { success: true };
    } catch (error) {
      console.error('❌ プロジェクトTwitter認証情報保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのTwitter認証情報を取得
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<{success: boolean, twitterAuth?: object, error?: string}>}
   */
  async getProjectTwitterAuth(projectId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);
      const projectSnap = await this.firebaseFirestore.getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error('プロジェクトが見つかりません');
      }

      const projectData = projectSnap.data();
      const twitterAuth = projectData.twitterAuth || null;

      return {
        success: true,
        twitterAuth: twitterAuth,
        isConnected: !!twitterAuth && (twitterAuth.enabled || (twitterAuth.apiKey && twitterAuth.accessToken))
      };
    } catch (error) {
      console.error('❌ プロジェクトTwitter認証情報取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのBluesky認証情報を保存
   * @param {string} projectId - プロジェクトID
   * @param {object} blueskyAuth - Bluesky認証情報
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveProjectBlueskyAuth(projectId, blueskyAuth) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      // プロジェクトドキュメントを更新
      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);

      await this.firebaseFirestore.updateDoc(projectRef, {
        blueskyAuth: blueskyAuth,
        updatedAt: this.firebaseFirestore.serverTimestamp()
      });

      console.log('✅ プロジェクトBluesky認証情報保存成功:', projectId);

      return { success: true };
    } catch (error) {
      console.error('❌ プロジェクトBluesky認証情報保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのBluesky認証情報を取得
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<{success: boolean, blueskyAuth?: object, error?: string}>}
   */
  async getProjectBlueskyAuth(projectId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);
      const projectSnap = await this.firebaseFirestore.getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error('プロジェクトが見つかりません');
      }

      const projectData = projectSnap.data();
      const blueskyAuth = projectData.blueskyAuth || null;

      return {
        success: true,
        blueskyAuth: blueskyAuth,
        isConnected: !!blueskyAuth && blueskyAuth.identifier && blueskyAuth.appPassword
      };
    } catch (error) {
      console.error('❌ プロジェクトBluesky認証情報取得エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのBluesky連携を解除
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeProjectBlueskyAuth(projectId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);

      await this.firebaseFirestore.updateDoc(projectRef, {
        blueskyAuth: this.firebaseFirestore.deleteField(),
        updatedAt: this.firebaseFirestore.serverTimestamp()
      });

      console.log('✅ プロジェクトBluesky連携解除成功:', projectId);

      return { success: true };
    } catch (error) {
      console.error('❌ プロジェクトBluesky連携解除エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * プロジェクトのTwitter連携を解除
   * @param {string} projectId - プロジェクトID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeProjectTwitterAuth(projectId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebaseが初期化されていません');
      }

      if (!this.currentUser) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = this.currentUser.uid;

      const projectRef = this.firebaseFirestore.doc(this.db, `users/${userId}/projects/${projectId}`);

      await this.firebaseFirestore.updateDoc(projectRef, {
        twitterAuth: this.firebaseFirestore.deleteField(),
        updatedAt: this.firebaseFirestore.serverTimestamp()
      });

      console.log('✅ プロジェクトTwitter連携解除成功:', projectId);

      return { success: true };
    } catch (error) {
      console.error('❌ プロジェクトTwitter連携解除エラー:', error);
      return { success: false, error: error.message };
    }
  }
}

// シングルトンインスタンス
const firebaseService = new FirebaseService();

module.exports = firebaseService;