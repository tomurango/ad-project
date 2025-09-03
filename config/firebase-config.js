// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "your_firebase_api_key_here",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "ad-project-64e9b.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "ad-project-64e9b",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "ad-project-64e9b.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "774397013456",
  appId: process.env.FIREBASE_APP_ID || "1:774397013456:web:a123456789abcdef"
};

export { firebaseConfig };