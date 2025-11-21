
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer } from '../types';

const COLLECTION_NAME = 'customers';
const LOCAL_STORAGE_KEY = 'freelance_acc_customers';

// Helper for Demo Mode (LocalStorage)
const getLocalCustomers = (): Customer[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const setLocalCustomers = (customers: Customer[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customers));
};

// NOTE: userId is still kept for security/indexing, but filtering is done by accountId
export const getCustomers = async (userId: string, accountId?: string): Promise<Customer[]> => {
  if (!accountId) return [];

  // Fallback to LocalStorage if DB is missing (Demo Mode)
  if (!db) {
    let all = getLocalCustomers();
    return all
        .filter(c => c.userId === userId && (c.accountId === accountId || !c.accountId)) // !c.accountId for legacy
        .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("accountId", "==", accountId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      } as Customer;
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) {
    const newId = 'local_' + Date.now();
    const newCustomer: Customer = {
        id: newId,
        ...customer,
        createdAt: new Date()
    };
    const current = getLocalCustomers();
    setLocalCustomers([newCustomer, ...current]);
    return newId;
  }
  
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...customer,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<void> => {
  if (!db) {
    const current = getLocalCustomers();
    const index = current.findIndex(c => c.id === id);
    if (index !== -1) {
        current[index] = { ...current[index], ...customer };
        setLocalCustomers(current);
    }
    return;
  }
  
  try {
    const customerRef = doc(db, COLLECTION_NAME, id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt: __, ...updateData } = customer as any;
    await updateDoc(customerRef, updateData);
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  if (!db) {
    const current = getLocalCustomers();
    const filtered = current.filter(c => c.id !== id);
    setLocalCustomers(filtered);
    return;
  }
  
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
};
