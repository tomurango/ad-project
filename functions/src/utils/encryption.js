const crypto = require("crypto");
const functions = require("firebase-functions");

// 環境変数から暗号化キーを取得
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ||
  "your-32-char-secret-key-here-change-this"; // 開発用デフォルト

const ALGORITHM = "aes-256-cbc";

/**
 * 文字列を暗号化
 * @param {string} text
 * @return {string}
 */
function encrypt(text) {
  if (!text) return "";
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * 暗号化された文字列を復号化
 * @param {string} encryptedText
 * @return {string}
 */
function decrypt(encryptedText) {
  if (!encryptedText) return "";
  
  try {
    const textParts = encryptedText.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedData = textParts.join(":");
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("復号化エラー:", error);
    return "";
  }
}

/**
 * Twitter設定を暗号化
 * @param {Object} twitterConfig
 * @return {Object}
 */
function encryptTwitterConfig(twitterConfig) {
  if (!twitterConfig) return null;
  
  return {
    apiKey: encrypt(twitterConfig.apiKey),
    apiSecret: encrypt(twitterConfig.apiSecret),
    accessToken: encrypt(twitterConfig.accessToken),
    accessTokenSecret: encrypt(twitterConfig.accessTokenSecret),
    enabled: twitterConfig.enabled,
  };
}

/**
 * Twitter設定を復号化
 * @param {Object} encryptedConfig
 * @return {Object}
 */
function decryptTwitterConfig(encryptedConfig) {
  if (!encryptedConfig) return null;
  
  return {
    apiKey: decrypt(encryptedConfig.apiKey),
    apiSecret: decrypt(encryptedConfig.apiSecret),
    accessToken: decrypt(encryptedConfig.accessToken),
    accessTokenSecret: decrypt(encryptedConfig.accessTokenSecret),
    enabled: encryptedConfig.enabled,
  };
}

module.exports = {
  encrypt,
  decrypt,
  encryptTwitterConfig,
  decryptTwitterConfig,
};