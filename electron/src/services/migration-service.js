// データ移行サービス - ローカル → Firestore
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MigrationService {
  constructor(firebaseService) {
    this.firebaseService = firebaseService;
    this.dataDir = path.join(os.homedir(), '.ad-project');
    this.projectsFile = path.join(this.dataDir, 'projects.json');
    this.deletedFile = path.join(this.dataDir, 'deleted.json');
  }

  // ローカルプロジェクトをFirestoreに移行
  async migrateLocalProjectsToFirestore() {
    try {
      console.log('🔄 ローカルプロジェクトデータの移行開始...');

      // 現在のユーザーを取得
      const currentUser = this.firebaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error('移行にはログインが必要です');
      }

      // ローカルデータを読み込み
      const localData = await this.loadLocalData();
      
      if (!localData.projects || localData.projects.length === 0) {
        console.log('ℹ️ 移行対象のローカルプロジェクトがありません');
        return {
          success: true,
          migrated: 0,
          message: '移行対象のプロジェクトがありませんでした'
        };
      }

      // 削除済みプロジェクトを除外
      const activeProjects = localData.projects.filter(project => 
        !localData.deletedIds.has(project.id)
      );

      console.log(`📊 移行対象: ${activeProjects.length}件のプロジェクト`);

      // 各プロジェクトをFirestoreに移行
      let migratedCount = 0;
      const migrationResults = [];

      for (const project of activeProjects) {
        try {
          const migrationResult = await this.migrateProjectToFirestore(project, currentUser.uid);
          migrationResults.push(migrationResult);
          
          if (migrationResult.success) {
            migratedCount++;
            console.log(`✅ プロジェクト移行成功: ${project.name}`);
          } else {
            console.error(`❌ プロジェクト移行失敗: ${project.name} - ${migrationResult.error}`);
          }
        } catch (error) {
          console.error(`❌ プロジェクト移行エラー: ${project.name}`, error);
          migrationResults.push({
            success: false,
            projectId: project.id,
            projectName: project.name,
            error: error.message
          });
        }
      }

      // 移行完了後にローカルデータをバックアップ
      await this.backupLocalData();

      console.log(`🎉 移行完了: ${migratedCount}/${activeProjects.length}件のプロジェクトを移行`);

      return {
        success: true,
        migrated: migratedCount,
        total: activeProjects.length,
        results: migrationResults,
        message: `${migratedCount}件のプロジェクトをFirestoreに移行しました`
      };

    } catch (error) {
      console.error('❌ 移行処理エラー:', error);
      return {
        success: false,
        error: error.message,
        migrated: 0
      };
    }
  }

  // 単一プロジェクトをFirestoreに移行
  async migrateProjectToFirestore(localProject, userId) {
    try {
      // Firestoreスキーマに合わせてデータを変換
      const firestoreProject = {
        userId: userId,
        name: localProject.name,
        localPath: localProject.path, // ローカルパスを維持
        description: localProject.description || '',
        category: localProject.category || 'web',
        settings: {
          autoSync: true,
          aiModel: 'qwen2.5:0.5b',
          defaultTimezone: 'Asia/Tokyo'
        },
        stats: {
          totalPosts: 0,
          activePlans: 0,
          lastActivity: null
        },
        migrationInfo: {
          migratedFrom: 'local',
          originalId: localProject.id,
          migratedAt: new Date().toISOString()
        },
        createdAt: localProject.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Firestoreに保存
      const result = await this.firebaseService.syncProject('create', firestoreProject);
      
      if (result.success) {
        return {
          success: true,
          projectId: localProject.id,
          projectName: localProject.name,
          firestoreId: result.id,
          data: firestoreProject
        };
      } else {
        throw new Error(result.error || 'Firestore保存に失敗しました');
      }

    } catch (error) {
      return {
        success: false,
        projectId: localProject.id,
        projectName: localProject.name,
        error: error.message
      };
    }
  }

  // ローカルデータを読み込み
  async loadLocalData() {
    const data = {
      projects: [],
      deletedIds: new Set()
    };

    try {
      // プロジェクトデータ読み込み
      if (await this.fileExists(this.projectsFile)) {
        const projectsData = await fs.readFile(this.projectsFile, 'utf8');
        data.projects = JSON.parse(projectsData);
        console.log(`📂 ローカルプロジェクト読み込み: ${data.projects.length}件`);
      }

      // 削除データ読み込み
      if (await this.fileExists(this.deletedFile)) {
        const deletedData = await fs.readFile(this.deletedFile, 'utf8');
        data.deletedIds = new Set(JSON.parse(deletedData));
        console.log(`🗑️ 削除済みプロジェクト: ${data.deletedIds.size}件`);
      }

    } catch (error) {
      console.error('❌ ローカルデータ読み込みエラー:', error);
      // エラーが発生してもデフォルト値を返す
    }

    return data;
  }

  // ローカルデータをバックアップ
  async backupLocalData() {
    try {
      const backupDir = path.join(this.dataDir, 'backup');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // バックアップディレクトリを作成
      await fs.mkdir(backupDir, { recursive: true });

      // プロジェクトデータをバックアップ
      if (await this.fileExists(this.projectsFile)) {
        const backupProjectsFile = path.join(backupDir, `projects-${timestamp}.json`);
        await fs.copyFile(this.projectsFile, backupProjectsFile);
        console.log(`📋 プロジェクトデータバックアップ: ${backupProjectsFile}`);
      }

      // 削除データをバックアップ
      if (await this.fileExists(this.deletedFile)) {
        const backupDeletedFile = path.join(backupDir, `deleted-${timestamp}.json`);
        await fs.copyFile(this.deletedFile, backupDeletedFile);
        console.log(`📋 削除データバックアップ: ${backupDeletedFile}`);
      }

      return { success: true, backupDir: backupDir };

    } catch (error) {
      console.error('❌ バックアップ作成エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // Firestore→ローカル同期（復元用）
  async syncFirestoreToLocal() {
    try {
      console.log('⬇️ Firestoreからローカルへ同期開始...');

      const result = await this.firebaseService.getUserProjectsSimple();
      if (!result.success) {
        throw new Error(result.error || 'Firestoreプロジェクト取得に失敗');
      }

      const firestoreProjects = result.projects || [];
      console.log(`📥 Firestoreから${firestoreProjects.length}件のプロジェクトを取得`);

      // Firestoreデータをローカル形式に変換
      const localProjects = firestoreProjects.map(project => ({
        id: project.migrationInfo?.originalId || project.id,
        name: project.name,
        path: project.localPath,
        description: project.description,
        category: project.category,
        createdAt: project.createdAt,
        lastModified: project.lastModified,
        firestoreId: project.id // Firestore IDを保持
      }));

      // ローカルファイルに保存
      await this.ensureDataDirectory();
      await fs.writeFile(this.projectsFile, JSON.stringify(localProjects, null, 2));

      console.log(`✅ ローカル同期完了: ${localProjects.length}件のプロジェクト`);

      return {
        success: true,
        synced: localProjects.length,
        projects: localProjects
      };

    } catch (error) {
      console.error('❌ Firestore→ローカル同期エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 移行状態チェック
  async checkMigrationStatus() {
    try {
      const localData = await this.loadLocalData();
      const currentUser = this.firebaseService.getCurrentUser();

      if (!currentUser) {
        return {
          canMigrate: false,
          reason: 'ログインが必要です',
          localProjects: 0,
          firestoreProjects: 0
        };
      }

      // Firestoreプロジェクト数を取得
      const firestoreResult = await this.firebaseService.getUserProjectsSimple();
      const firestoreProjectCount = firestoreResult.success ? 
        (firestoreResult.projects || []).length : 0;

      const activeLocalProjects = localData.projects.filter(project => 
        !localData.deletedIds.has(project.id)
      );

      return {
        canMigrate: true,
        localProjects: activeLocalProjects.length,
        firestoreProjects: firestoreProjectCount,
        hasLocalData: activeLocalProjects.length > 0,
        migrationRecommended: activeLocalProjects.length > 0 && firestoreProjectCount === 0
      };

    } catch (error) {
      console.error('❌ 移行状態チェックエラー:', error);
      return {
        canMigrate: false,
        reason: error.message,
        localProjects: 0,
        firestoreProjects: 0
      };
    }
  }

  // ユーティリティメソッド
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合はエラーを無視
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = MigrationService;