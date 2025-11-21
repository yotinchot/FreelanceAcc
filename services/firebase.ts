
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// NOTE: ในการใช้งานจริง คุณต้องแทนที่ค่าเหล่านี้ด้วย config จาก Firebase Console ของคุณ
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", 
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let googleProvider: GoogleAuthProvider | undefined;

// ตรวจสอบว่า Config ถูกแก้ไขหรือยัง
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

if (isConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    // ตั้งค่าภาษาให้ Google Login เป็นภาษาไทย
    auth.languageCode = 'th'; 
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
} else {
  console.warn("Firebase config is missing. App will run in Demo Mode with localStorage.");
}

export { auth, db, googleProvider };
