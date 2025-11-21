
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Account } from '../types';

const COLLECTION_NAME = 'accounts';
const LOCAL_STORAGE_KEY = 'freelance_acc_accounts';

// Helper for Demo Mode
const getLocalAccounts = (): Account[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const setLocalAccounts = (accounts: Account[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
};

export const getAccounts = async (userId: string): Promise<Account[]> => {
  if (!db) {
    const all = getLocalAccounts();
    return all.filter(a => a.userId === userId);
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Account));
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }
};

export const createAccount = async (accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
  if (!db) {
    const newId = 'local_acc_' + Date.now();
    const newAccount: Account = {
        id: newId,
        ...accountData,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    const current = getLocalAccounts();
    setLocalAccounts([...current, newAccount]);
    return newAccount;
  }
  
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...accountData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
        id: docRef.id,
        ...accountData,
        createdAt: new Date() // Approx for UI
    };
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

export const updateAccount = async (id: string, accountData: Partial<Account>): Promise<void> => {
  if (!db) {
    const current = getLocalAccounts();
    const index = current.findIndex(a => a.id === id);
    if (index !== -1) {
        current[index] = { ...current[index], ...accountData, updatedAt: new Date() };
        setLocalAccounts(current);
    }
    return;
  }
  
  try {
    const ref = doc(db, COLLECTION_NAME, id);
    await updateDoc(ref, {
        ...accountData,
        updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating account:", error);
    throw error;
  }
};
