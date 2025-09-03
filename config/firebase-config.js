// Firebase configuration - loaded from environment variables in main process
// This file should NOT contain actual API keys
let firebaseConfig = null;

// Config will be set by main process from environment variables
function setFirebaseConfig(config) {
  firebaseConfig = config;
}

function getFirebaseConfig() {
  if (!firebaseConfig) {
    throw new Error('Firebase config not initialized. Must be set by main process.');
  }
  return firebaseConfig;
}

module.exports = { setFirebaseConfig, getFirebaseConfig };