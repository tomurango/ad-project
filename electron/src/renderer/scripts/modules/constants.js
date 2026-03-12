/**
 * constants.js - アプリケーション全体の定数定義
 *
 * ES Modulesパターンで定数を一元管理
 */

// ========================================
// IPC チャンネル定数
// ========================================

export const IPC_CHANNELS = {
  // プロジェクト関連
  GET_PROJECTS: 'firebase-get-user-projects-hierarchical',
  CREATE_PROJECT: 'firebase-create-project',
  UPDATE_PROJECT: 'firebase-update-project',
  DELETE_PROJECT: 'firebase-delete-project',

  // プラン関連
  GET_PLANS: 'firebase-get-project-plans',
  CREATE_PLAN: 'firebase-create-plan',
  UPDATE_PLAN: 'firebase-update-plan',
  DELETE_PLAN: 'firebase-delete-plan',

  // 投稿関連
  GET_POSTS: 'firebase-get-project-posts',
  CREATE_POST: 'firebase-create-post',
  UPDATE_POST: 'firebase-update-post',
  DELETE_POST: 'firebase-delete-post',

  // 認証関連
  CHECK_AUTH: 'check-auth-state',
  LOGIN_EMAIL: 'login-with-email',
  SIGNUP_EMAIL: 'signup-with-email',
  LOGIN_GOOGLE: 'login-with-google',
  LOGOUT: 'logout'
};

// ========================================
// 投稿ステータス定数
// ========================================

export const POST_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  POSTED: 'posted',
  FAILED: 'failed'
};

export const POST_STATUS_LABELS = {
  [POST_STATUS.DRAFT]: '下書き',
  [POST_STATUS.SCHEDULED]: '予約済み',
  [POST_STATUS.POSTED]: '投稿済み',
  [POST_STATUS.FAILED]: '失敗'
};

export const POST_STATUS_COLORS = {
  [POST_STATUS.DRAFT]: '#6c757d',
  [POST_STATUS.SCHEDULED]: '#0d6efd',
  [POST_STATUS.POSTED]: '#198754',
  [POST_STATUS.FAILED]: '#dc3545'
};

// ========================================
// プラットフォーム定数
// ========================================

export const PLATFORMS = {
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  LINKEDIN: 'linkedin',
  BLUESKY: 'bluesky'
};

export const PLATFORM_LABELS = {
  [PLATFORMS.TWITTER]: 'X (Twitter)',
  [PLATFORMS.INSTAGRAM]: 'Instagram',
  [PLATFORMS.FACEBOOK]: 'Facebook',
  [PLATFORMS.LINKEDIN]: 'LinkedIn',
  [PLATFORMS.BLUESKY]: 'Bluesky'
};

export const PLATFORM_ICONS = {
  [PLATFORMS.TWITTER]: '𝕏',
  [PLATFORMS.INSTAGRAM]: '📷',
  [PLATFORMS.FACEBOOK]: '📘',
  [PLATFORMS.LINKEDIN]: '💼',
  [PLATFORMS.BLUESKY]: '🦋'
};

// ========================================
// 投稿頻度定数
// ========================================

export const FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
};

export const FREQUENCY_LABELS = {
  [FREQUENCIES.DAILY]: '毎日',
  [FREQUENCIES.WEEKLY]: '毎週',
  [FREQUENCIES.MONTHLY]: '毎月',
  [FREQUENCIES.CUSTOM]: 'カスタム'
};

// ========================================
// AI プロバイダー定数
// ========================================

export const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini'
};

export const AI_PROVIDER_LABELS = {
  [AI_PROVIDERS.OLLAMA]: '🟢 Ollama (無料・ローカル)',
  [AI_PROVIDERS.OPENAI]: '💰 OpenAI (有料)',
  [AI_PROVIDERS.CLAUDE]: '💰 Claude (有料)',
  [AI_PROVIDERS.GEMINI]: '💰 Gemini (有料)'
};

// ========================================
// UI 定数
// ========================================

export const MODAL_IDS = {
  PROJECT_MODAL: 'projectModal',
  PROJECT_MODAL_OVERLAY: 'projectModalOverlay',
  PLATFORM_SELECTION: 'platform-selection-modal',
  PLAN_CREATION: 'plan-creation-modal',
  MANUAL_POST: 'manual-post-modal'
};

export const DEFAULT_VALUES = {
  POSTS_DISPLAY_COUNT: 10,
  DEFAULT_POST_TIME: '10:00',
  AI_MAX_TOKENS: 500,
  AI_TEMPERATURE: 0.7
};

// ========================================
// ヘルパー関数（定数関連）
// ========================================

/**
 * プラットフォームの表示名を取得
 */
export function getPlatformLabel(platform) {
  return PLATFORM_LABELS[platform] || platform || '不明';
}

/**
 * 頻度の表示名を取得
 */
export function getFrequencyLabel(frequency) {
  return FREQUENCY_LABELS[frequency] || frequency || '未設定';
}

/**
 * 投稿ステータスの表示名を取得
 */
export function getPostStatusLabel(status) {
  return POST_STATUS_LABELS[status] || status || '不明';
}

/**
 * 投稿ステータスの色を取得
 */
export function getPostStatusColor(status) {
  return POST_STATUS_COLORS[status] || '#6c757d';
}
