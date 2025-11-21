
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
import { Transaction } from '../types';

const COLLECTION_NAME = 'transactions';
const LOCAL_STORAGE_KEY = 'freelance_acc_transactions';

// Helper for Demo Mode
const getLocalTransactions = (): Transaction[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const setLocalTransactions = (data: Transaction[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const getTransactions = async (userId: string, accountId?: string): Promise<Transaction[]> => {
  if (!accountId) return [];

  if (!db) {
    const all = getLocalTransactions();
    return all
        .filter(t => t.userId === userId && (t.accountId === accountId || !t.accountId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      where("accountId", "==", accountId),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      } as Transaction;
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) {
    const newId = 'local_tx_' + Date.now();
    const newTx: Transaction = {
        id: newId,
        ...transaction,
        createdAt: new Date()
    };
    const current = getLocalTransactions();
    setLocalTransactions([newTx, ...current]);
    return newId;
  }
  
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...transaction,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<void> => {
  if (!db) {
    const current = getLocalTransactions();
    const index = current.findIndex(c => c.id === id);
    if (index !== -1) {
        current[index] = { ...current[index], ...transaction };
        setLocalTransactions(current);
    }
    return;
  }
  
  try {
    const ref = doc(db, COLLECTION_NAME, id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt: __, ...updateData } = transaction as any;
    await updateDoc(ref, updateData);
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  if (!db) {
    const current = getLocalTransactions();
    const filtered = current.filter(c => c.id !== id);
    setLocalTransactions(filtered);
    return;
  }
  
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  // Define Header
  const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน', 'อ้างอิง'];
  
  // Convert Data
  const rows = transactions.map(t => [
    new Date(t.date).toLocaleDateString('th-TH'),
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.category,
    `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
    t.type === 'expense' ? -t.amount : t.amount,
    t.referenceNo || '-'
  ]);

  // Combine
  const csvContent = 
    "\uFEFF" + // BOM for Thai encoding support in Excel
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  // Create Download Link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
