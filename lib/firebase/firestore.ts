import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from './client';

export async function getDocument<T>(path: string): Promise<T | null> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  } catch (error) {
    console.error(`Error fetching document at ${path}:`, error);
    throw error;
  }
}

export async function setDocument<T extends DocumentData>(
  path: string,
  data: WithFieldValue<T>
): Promise<void> {
  try {
    const db = getDb();
    await setDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error(`Error setting document at ${path}:`, error);
    throw error;
  }
}

export async function updateDocument(path: string, data: Partial<DocumentData>): Promise<void> {
  try {
    const db = getDb();
    await updateDoc(doc(db, path), { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error(`Error updating document at ${path}:`, error);
    throw error;
  }
}

export async function deleteDocument(path: string): Promise<void> {
  try {
    const db = getDb();
    await deleteDoc(doc(db, path));
  } catch (error) {
    console.error(`Error deleting document at ${path}:`, error);
    throw error;
  }
}

export async function addDocument<T extends DocumentData>(
  path: string,
  data: T
): Promise<string> {
  try {
    const db = getDb();
    const ref = await addDoc(collection(db, path), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error(`Error adding document to ${path}:`, error);
    throw error;
  }
}

export async function queryDocuments<T>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  try {
    const db = getDb();
    const q = query(collection(db, path), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
  } catch (error) {
    console.error(`Error querying documents at ${path}:`, error);
    throw error;
  }
}
