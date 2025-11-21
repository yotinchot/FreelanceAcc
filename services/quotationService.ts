
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
    orderBy,
    limit,
    getDoc
  } from 'firebase/firestore';
  import { db } from './firebase';
  import { Quotation } from '../types';
  
  const COLLECTION_NAME = 'quotations';
  const LOCAL_STORAGE_KEY = 'freelance_acc_quotations';
  
  // Helper for Demo Mode
  const getLocalQuotations = (): Quotation[] => {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
  };
  
  const setLocalQuotations = (quotations: Quotation[]) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(quotations));
  };
  
  // Generate Document Number: QT-YYYY-XXX
  const generateDocumentNumber = async (userId: string, accountId: string): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}`;
    
    let lastNumber = 0;
  
    if (!db) {
        const local = getLocalQuotations().filter(q => q.accountId === accountId && q.documentNo.startsWith(prefix));
        if (local.length > 0) {
            // Simple sort to find max
            local.sort((a, b) => b.documentNo.localeCompare(a.documentNo));
            const lastDoc = local[0].documentNo;
            const parts = lastDoc.split('-');
            if (parts.length === 3) {
                lastNumber = parseInt(parts[2], 10);
            }
        }
    } else {
        try {
            // Get the latest quotation for this user in this year
            const q = query(
                collection(db, COLLECTION_NAME),
                where("userId", "==", userId),
                where("accountId", "==", accountId), // Added account scope
                where("documentNo", ">=", `${prefix}-000`),
                where("documentNo", "<=", `${prefix}-999`),
                orderBy("documentNo", "desc"),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const lastDoc = querySnapshot.docs[0].data().documentNo;
                const parts = lastDoc.split('-');
                if (parts.length === 3) {
                    lastNumber = parseInt(parts[2], 10);
                }
            }
        } catch (e) {
            console.warn("Auto-ID generation falling back or first run", e);
        }
    }
  
    const nextNumber = lastNumber + 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };
  
  export const getQuotations = async (userId: string, accountId?: string): Promise<Quotation[]> => {
    if (!accountId) return [];

    if (!db) {
      const all = getLocalQuotations();
      return all
          .filter(q => q.userId === userId && q.accountId === accountId)
          .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }
    
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId),
        where("accountId", "==", accountId),
        orderBy("issueDate", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: data.issueDate?.toDate ? data.issueDate.toDate() : new Date(data.issueDate),
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        } as Quotation;
      });
    } catch (error) {
      console.error("Error fetching quotations:", error);
      throw error;
    }
  };
  
  export const getQuotationById = async (id: string): Promise<Quotation | null> => {
    if (!db) {
        const all = getLocalQuotations();
        return all.find(q => q.id === id) || null;
    }

    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                issueDate: data.issueDate?.toDate ? data.issueDate.toDate() : new Date(data.issueDate),
                dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            } as Quotation;
        }
        return null;
    } catch (error) {
        console.error("Error fetching quotation:", error);
        throw error;
    }
  };

  export const createQuotation = async (quotation: Omit<Quotation, 'id' | 'documentNo' | 'createdAt'>): Promise<string> => {
    if (!quotation.accountId) throw new Error("Account ID is required");
    
    const documentNo = await generateDocumentNumber(quotation.userId, quotation.accountId);
    
    if (!db) {
      const newId = 'local_qt_' + Date.now();
      const newQuotation: Quotation = {
          id: newId,
          documentNo,
          ...quotation,
          createdAt: new Date()
      };
      const current = getLocalQuotations();
      setLocalQuotations([newQuotation, ...current]);
      return newId;
    }
    
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...quotation,
        documentNo,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding quotation:", error);
      throw error;
    }
  };
  
  export const updateQuotation = async (id: string, quotation: Partial<Quotation>): Promise<void> => {
    if (!db) {
      const current = getLocalQuotations();
      const index = current.findIndex(c => c.id === id);
      if (index !== -1) {
          current[index] = { ...current[index], ...quotation };
          setLocalQuotations(current);
      }
      return;
    }
    
    try {
      const ref = doc(db, COLLECTION_NAME, id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, documentNo: __, createdAt: ___, ...updateData } = quotation as any;
      await updateDoc(ref, updateData);
    } catch (error) {
      console.error("Error updating quotation:", error);
      throw error;
    }
  };
  
  export const deleteQuotation = async (id: string): Promise<void> => {
    if (!db) {
      const current = getLocalQuotations();
      const filtered = current.filter(c => c.id !== id);
      setLocalQuotations(filtered);
      return;
    }
    
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting quotation:", error);
      throw error;
    }
  };
