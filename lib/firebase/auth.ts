import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { getAuthInstance } from './client';
import { getDb } from './client';
import { COLLECTIONS } from '@/lib/constants';
import { AppUser } from '@/types/user';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code ?? '';
    const messages: Record<string, string | undefined> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/popup-closed-by-user': 'Sign in was cancelled.',
    };
    return messages[code] ?? error.message;
  }
  return 'An unexpected error occurred.';
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const auth = getAuthInstance();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await sendEmailVerification(result.user);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error) };
  }
}

export async function logInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const auth = getAuthInstance();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error) };
  }
}

export async function logInWithGoogle(): Promise<{ user: User | null; error: string | null }> {
  try {
    const auth = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: getErrorMessage(error) };
  }
}

export async function logOut(): Promise<{ error: string | null }> {
  try {
    const auth = getAuthInstance();
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function resetPassword(
  email: string
): Promise<{ error: string | null }> {
  try {
    const auth = getAuthInstance();
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function verifyEmail(): Promise<{ error: string | null }> {
  try {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) return { error: 'No user logged in.' };
    await sendEmailVerification(user);
    return { error: null };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, callback);
}

export async function createUserDocument(
  uid: string,
  data: { email: string; displayName: string; photoURL?: string | null }
): Promise<AppUser> {
  const db = getDb();
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userDoc: AppUser = {
    id: uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL ?? null,
    createdAt: Timestamp.now(),
    type: 'member',
  };
  await setDoc(userRef, userDoc);
  return userDoc;
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  const db = getDb();
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppUser;
}
