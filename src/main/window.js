/**
 * ウィンドウ管理モジュール
 *
 * Electronアプリケーションのメインウィンドウ作成・管理
 */

const { BrowserWindow } = require('electron');
const path = require('path');

/**
 * メインウィンドウを作成
 *
 * @returns {BrowserWindow} 作成されたBrowserWindowインスタンス
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be'
    }
  });

  mainWindow.loadFile('index.html');

  // 開発時はデベロッパーツールを開く
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // デバッグ用：ページ読み込み完了を監視
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('メインプロセス: ページ読み込み完了');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`レンダラーコンソール [${level}]: ${message}`);
  });

  return mainWindow;
}

module.exports = {
  createWindow
};
