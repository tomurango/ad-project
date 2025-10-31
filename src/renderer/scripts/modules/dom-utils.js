/**
 * dom-utils.js - DOM操作ユーティリティ
 *
 * ES Modulesパターンで安全なDOM操作を提供
 * null チェックとエラーハンドリングを内蔵
 */

// ========================================
// 要素取得（安全版）
// ========================================

/**
 * 要素を安全に取得（存在しない場合はエラーログ出力）
 * @param {string} id - 要素のID
 * @returns {HTMLElement|null} 要素または null
 */
export function getElementById(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`⚠️ Element not found: #${id}`);
  }
  return element;
}

/**
 * 要素を取得し、存在を保証（存在しない場合は例外）
 * @param {string} id - 要素のID
 * @returns {HTMLElement} 要素
 * @throws {Error} 要素が見つからない場合
 */
export function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`❌ Required element not found: #${id}`);
  }
  return element;
}

/**
 * querySelectorで要素を安全に取得
 * @param {string} selector - CSSセレクタ
 * @returns {HTMLElement|null} 要素または null
 */
export function querySelector(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`⚠️ Element not found: ${selector}`);
  }
  return element;
}

/**
 * 複数要素を取得
 * @param {string} selector - CSSセレクタ
 * @returns {NodeListOf<HTMLElement>} 要素のNodeList
 */
export function querySelectorAll(selector) {
  return document.querySelectorAll(selector);
}

// ========================================
// モーダル操作
// ========================================

/**
 * モーダルを表示
 * @param {string} modalId - モーダルのID
 * @returns {boolean} 成功したらtrue
 */
export function showModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) {
    console.error(`❌ Modal not found: #${modalId}`);
    return false;
  }

  modal.style.display = 'block';
  return true;
}

/**
 * モーダルを非表示
 * @param {string} modalId - モーダルのID
 * @returns {boolean} 成功したらtrue
 */
export function hideModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) {
    console.error(`❌ Modal not found: #${modalId}`);
    return false;
  }

  modal.style.display = 'none';
  return true;
}

/**
 * モーダルの表示状態をトグル
 * @param {string} modalId - モーダルのID
 * @returns {boolean} 成功したらtrue
 */
export function toggleModal(modalId) {
  const modal = getElementById(modalId);
  if (!modal) {
    console.error(`❌ Modal not found: #${modalId}`);
    return false;
  }

  const isVisible = modal.style.display !== 'none';
  modal.style.display = isVisible ? 'none' : 'block';
  return true;
}

// ========================================
// フォーム操作
// ========================================

/**
 * フォームの値を取得（安全版）
 * @param {string} id - 入力要素のID
 * @returns {string} 値またはundefined
 */
export function getInputValue(id) {
  const input = getElementById(id);
  return input ? input.value.trim() : undefined;
}

/**
 * フォームの値を設定（安全版）
 * @param {string} id - 入力要素のID
 * @param {string} value - 設定する値
 * @returns {boolean} 成功したらtrue
 */
export function setInputValue(id, value) {
  const input = getElementById(id);
  if (!input) return false;

  input.value = value;
  return true;
}

/**
 * フォームをクリア
 * @param {string} formId - フォームのID
 * @returns {boolean} 成功したらtrue
 */
export function clearForm(formId) {
  const form = getElementById(formId);
  if (!form) return false;

  if (form.tagName === 'FORM') {
    form.reset();
  } else {
    // form要素でない場合は、内部の全input/textarea/selectをクリア
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });
  }

  return true;
}

// ========================================
// 表示/非表示制御
// ========================================

/**
 * 要素を表示
 * @param {string} id - 要素のID
 * @param {string} displayType - display プロパティの値（デフォルト: 'block'）
 * @returns {boolean} 成功したらtrue
 */
export function show(id, displayType = 'block') {
  const element = getElementById(id);
  if (!element) return false;

  element.style.display = displayType;
  return true;
}

/**
 * 要素を非表示
 * @param {string} id - 要素のID
 * @returns {boolean} 成功したらtrue
 */
export function hide(id) {
  const element = getElementById(id);
  if (!element) return false;

  element.style.display = 'none';
  return true;
}

/**
 * 複数要素を非表示
 * @param {string[]} ids - 要素IDの配列
 */
export function hideAll(ids) {
  ids.forEach(id => hide(id));
}

/**
 * 複数要素のうち、1つだけを表示
 * @param {string[]} ids - 要素IDの配列
 * @param {string} showId - 表示する要素のID
 * @param {string} displayType - display プロパティの値
 */
export function showOnly(ids, showId, displayType = 'block') {
  ids.forEach(id => {
    const element = getElementById(id);
    if (element) {
      element.style.display = (id === showId) ? displayType : 'none';
    }
  });
}

// ========================================
// クラス操作
// ========================================

/**
 * クラスを追加
 * @param {string} id - 要素のID
 * @param {string} className - クラス名
 * @returns {boolean} 成功したらtrue
 */
export function addClass(id, className) {
  const element = getElementById(id);
  if (!element) return false;

  element.classList.add(className);
  return true;
}

/**
 * クラスを削除
 * @param {string} id - 要素のID
 * @param {string} className - クラス名
 * @returns {boolean} 成功したらtrue
 */
export function removeClass(id, className) {
  const element = getElementById(id);
  if (!element) return false;

  element.classList.remove(className);
  return true;
}

/**
 * クラスをトグル
 * @param {string} id - 要素のID
 * @param {string} className - クラス名
 * @returns {boolean} 成功したらtrue
 */
export function toggleClass(id, className) {
  const element = getElementById(id);
  if (!element) return false;

  element.classList.toggle(className);
  return true;
}

// ========================================
// HTML操作
// ========================================

/**
 * innerHTMLを設定
 * @param {string} id - 要素のID
 * @param {string} html - HTML文字列
 * @returns {boolean} 成功したらtrue
 */
export function setHTML(id, html) {
  const element = getElementById(id);
  if (!element) return false;

  element.innerHTML = html;
  return true;
}

/**
 * textContentを設定
 * @param {string} id - 要素のID
 * @param {string} text - テキスト文字列
 * @returns {boolean} 成功したらtrue
 */
export function setText(id, text) {
  const element = getElementById(id);
  if (!element) return false;

  element.textContent = text;
  return true;
}

// ========================================
// イベントリスナー
// ========================================

/**
 * イベントリスナーを追加（安全版）
 * @param {string} id - 要素のID
 * @param {string} eventType - イベントタイプ
 * @param {Function} handler - ハンドラー関数
 * @returns {boolean} 成功したらtrue
 */
export function addEventListener(id, eventType, handler) {
  const element = getElementById(id);
  if (!element) return false;

  element.addEventListener(eventType, handler);
  return true;
}

/**
 * イベントリスナーを削除
 * @param {string} id - 要素のID
 * @param {string} eventType - イベントタイプ
 * @param {Function} handler - ハンドラー関数
 * @returns {boolean} 成功したらtrue
 */
export function removeEventListener(id, eventType, handler) {
  const element = getElementById(id);
  if (!element) return false;

  element.removeEventListener(eventType, handler);
  return true;
}
