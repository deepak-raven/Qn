import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  updateProfile
} from "firebase/auth";

// Firebase configuration for project: ai-edtech-tools
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBHUFAoHW3rYB02_guX_QHoS0OzY-ZxtaQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-edtech-tools.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-edtech-tools",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-edtech-tools.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "832116145668",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:832116145668:web:15df895c08068bf72fff51",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-LMFKN1TM4F"
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom Google Sign-In helper (with automatic fallback to redirect if popups are blocked)
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  } catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.warn("Popup blocked by browser. Falling back to signInWithRedirect...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error("Firebase Google Sign-In error:", error);
    throw error;
  }
};

// Check redirect login results on page load
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (error) {
    console.error("Error retrieving redirect result:", error);
  }
  return null;
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

// Custom Email/Password Registration helper with Email Verification
export const registerWithEmail = async (email, password, displayName = "") => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      // Send verification link to user's email address
      await sendEmailVerification(userCredential.user);
      console.log("Verification email sent to:", email);
    }
    const idToken = await userCredential.user.getIdToken();
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error("Firebase Email Registration error:", error);
    throw error;
  }
};

// Helper to manually trigger verification email resend
export const resendVerificationEmail = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    return true;
  }
  return false;
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
