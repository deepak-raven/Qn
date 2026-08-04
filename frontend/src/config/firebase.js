import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from "firebase/auth";

// Firebase configuration for project: ai-edtech-tools
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBHUFAoHW3rYB02_guX_QHoS0OzY-ZxtaQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-edtech-tools.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-edtech-tools",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-edtech-tools.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom Google Sign-In helper
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (error) {
    console.error("Firebase Google Sign-In error:", error);
    throw error;
  }
};

// Custom Email/Password Sign-In helper
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error("Firebase Email Login error:", error);
    throw error;
  }
};

// Custom Email/Password Registration helper
export const registerWithEmail = async (email, password, displayName = "") => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    const idToken = await userCredential.user.getIdToken();
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error("Firebase Email Registration error:", error);
    throw error;
  }
};

// Logout helper
export const logoutFirebase = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase SignOut error:", error);
  }
};

export default app;
