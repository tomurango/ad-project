// Firebase サービス管理クラス（テスト版）
const firebaseConfig = require('../../config/firebase-config');

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.functions = null;
    this.currentUser = null;
    this.isInitialized = false;
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

      console.log(`✅ プロジェクト同期成功 (${action}):`, result.data);
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
        projects.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ プロジェクト一覧取得成功（階層構造）: ${projects.length}件`);
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
      console.log('🔍 プラン作成デバッグ情報:');
      console.log('- ユーザーID:', currentUser?.uid);
      console.log('- プロジェクトID:', projectId);
      console.log('- プランデータ:', JSON.stringify(planData, null, 2));

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
  async deletePlan(planId) {
    try {
      this._checkInitialized();
      this._checkAuthenticated();

      const planRef = this.firebaseFirestore.doc(this.db, 'plans', planId);
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
}

// シングルトンインスタンス
const firebaseService = new FirebaseService();

module.exports = firebaseService;