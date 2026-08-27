import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'condomino';
}

// In-memory cache for the Google access token
let cachedAccessToken: string | null = null;

export function getCachedAccessToken() {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Add required Google Calendar scopes
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Retrieve the google access token from credential
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential && credential.accessToken) {
    cachedAccessToken = credential.accessToken;
  }

  // Check if user has a profile, if not create one as 'admin' if email is donatocannatello@gmail.com
  let profile: UserProfile;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isAdminEmail = user.email?.toLowerCase() === 'donatocannatello@gmail.com';
    
    if (!userDoc.exists()) {
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Donato Cannatello',
        role: isAdminEmail ? 'admin' : 'condomino' // Default role
      };
      await setDoc(doc(db, 'users', user.uid), profile);
    } else {
      profile = userDoc.data() as UserProfile;
      if (isAdminEmail && profile.role !== 'admin') {
        profile.role = 'admin';
        await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
      }
    }
  } catch (error: any) {
    console.warn("Could not retrieve/create profile during login, using offline layout:", error.message || error);
    const cached = localStorage.getItem('user_profile_' + user.uid);
    const isAdminEmail = user.email?.toLowerCase() === 'donatocannatello@gmail.com';
    if (cached) {
      try {
        profile = JSON.parse(cached);
        if (isAdminEmail) {
          profile.role = 'admin';
        }
      } catch (_) {
        profile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Donato Cannatello',
          role: isAdminEmail ? 'admin' : 'condomino'
        };
      }
    } else {
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Donato Cannatello',
        role: isAdminEmail ? 'admin' : 'condomino' // Default to administrator under offline simulation so they can explore
      };
    }
  }

  localStorage.setItem('user_profile_' + user.uid, JSON.stringify(profile));
  return profile;
}

export async function requestCalendarAccess() {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential && credential.accessToken) {
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  }
  throw new Error("Impossibile ottenere il token Google Calendar.");
}

export async function logout() {
  await signOut(auth);
  cachedAccessToken = null;
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const firebaseUser = auth.currentUser;
  const isAdminEmail = firebaseUser?.email?.toLowerCase() === 'donatocannatello@gmail.com' || uid === 'g8N2vXq8g7...'; // Also check uid pattern or mail

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      const isUserAdmin = data.email?.toLowerCase() === 'donatocannatello@gmail.com' || isAdminEmail;
      if (isUserAdmin && data.role !== 'admin') {
        data.role = 'admin';
        await setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true });
      }
      localStorage.setItem('user_profile_' + uid, JSON.stringify(data));
      return data;
    }
  } catch (error: any) {
    console.warn("getUserProfile offline/failed:", error.message || error);
  }

  // Fallback: Check local storage cache
  const cached = localStorage.getItem('user_profile_' + uid);
  if (cached) {
    try {
      const profile = JSON.parse(cached) as UserProfile;
      if (profile.email?.toLowerCase() === 'donatocannatello@gmail.com' || isAdminEmail) {
        profile.role = 'admin';
      }
      return profile;
    } catch (_) {}
  }

  // If user exists in Auth, construct a default admin profile to bypass offline block
  if (firebaseUser && firebaseUser.uid === uid) {
    const isUserAdmin = firebaseUser.email?.toLowerCase() === 'donatocannatello@gmail.com' || isAdminEmail;
    const profile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || 'donatocannatello@gmail.com',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Donato Cannatello',
      role: isUserAdmin ? 'admin' : 'condomino'
    };
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), profile);
    } catch (e) {
      console.warn("Could not save initial offline profile online:", e);
    }
    localStorage.setItem('user_profile_' + uid, JSON.stringify(profile));
    return profile;
  }

  return null;
}

export async function updateRole(uid: string, role: 'admin' | 'condomino') {
  await setDoc(doc(db, 'users', uid), { role }, { merge: true });
}
