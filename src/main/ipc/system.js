/**
 * システム関連 IPCハンドラー
 *
 * OS操作（ディレクトリ選択、Finder/Explorer起動）のIPC通信を処理
 */

const { ipcMain, dialog, shell, BrowserWindow } = require('electron');
const fs = require('fs').promises;

// ==========================================
// Directory Selection
// ==========================================

// ディレクトリ選択ダイアログを開く
ipcMain.handle('select-directory', async (event, title = 'ディレクトリを選択', defaultPath = null) => {
  try {
    const dialogOptions = {
      title: title,
      properties: ['openDirectory'],
      buttonLabel: '選択'
    };

    // 初期パスが指定されている場合は設定
    if (defaultPath) {
      dialogOptions.defaultPath = defaultPath;
    }

    // BrowserWindowを親として指定
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), dialogOptions);

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// Finder/Explorer Operations
// ==========================================

// Finderでディレクトリを開く
ipcMain.handle('open-finder', async (event, directoryPath) => {
  try {
    // ディレクトリの存在確認
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error('指定されたパスはディレクトリではありません');
    }

    // Finderでディレクトリを開く
    await shell.openPath(directoryPath);
    console.log('Finderでディレクトリを開きました:', directoryPath);

    return { success: true, message: 'Finderでディレクトリを開きました' };
  } catch (error) {
    console.error('Finder起動エラー:', error);
    return { success: false, error: error.message };
  }
});

// ディレクトリを開く（汎用版）
ipcMain.handle('open-directory', async (event, directoryPath) => {
  try {
    await shell.openPath(directoryPath);
    return { success: true };
  } catch (error) {
    console.error('❌ ディレクトリオープンエラー:', error);
    return { success: false, error: error.message };
  }
});

module.exports = {};
