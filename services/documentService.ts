
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
  import { AppDocument, DocumentType } from '../types';
  
  const COLLECTION_NAME = 'documents';
  const LOCAL_STORAGE_KEY = 'freelance_acc_documents';
  
  // Helper for Demo Mode
  const getLocalDocuments = (): AppDocument[] => {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
  };
  
  const setLocalDocuments = (docs: AppDocument[]) => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(docs));
  };

  // ID Configuration
  const getPrefix = (type: DocumentType) => {
      switch(type) {
          case 'quotation': return 'QT';
          case 'invoice': return 'INV';
          case 'receipt': return 'RC';
          case 'tax_invoice': return 'TX';
          case 'tax_receipt': return 'TR';
          default: return 'DOC';
      }
  };
  
  // Generate Document Number: PRE-YYYY-XXX
  const generateDocumentNumber = async (userId: string, accountId: string, type: DocumentType): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `${getPrefix(type)}-${year}`;
    
    let lastNumber = 0;
  
    if (!db) {
        const local = getLocalDocuments().filter(q => q.accountId === accountId && q.documentNo.startsWith(prefix));
        if (local.length > 0) {
            local.sort((a, b) => b.documentNo.localeCompare(a.documentNo));
            const lastDoc = local[0].documentNo;
            const parts = lastDoc.split('-');
            if (parts.length === 3) {
                lastNumber = parseInt(parts[2], 10);
            }
        }
    } else {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where("accountId", "==", accountId), // Scope to account
                where("type", "==", type), 
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
  
  export const getDocuments = async (userId: string, accountId?: string, type?: DocumentType): Promise<AppDocument[]> => {
    if (!accountId) return [];

    if (!db) {
      let all = getLocalDocuments().filter(q => q.userId === userId && (q.accountId === accountId || !q.accountId));
      if (type) {
          all = all.filter(q => q.type === type);
      }
      return all.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }
    
    try {
      let q;
      const constraints = [
          where("userId", "==", userId),
          where("accountId", "==", accountId),
          orderBy("issueDate", "desc")
      ];

      if (type) {
          constraints.push(where("type", "==", type));
      }

      q = query(collection(db, COLLECTION_NAME), ...constraints);
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: data.issueDate?.toDate ? data.issueDate.toDate() : new Date(data.issueDate),
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
          paidDate: data.paidDate?.toDate ? data.paidDate.toDate() : (data.paidDate ? new Date(data.paidDate) : undefined),
          whtReceivedDate: data.whtReceivedDate?.toDate ? data.whtReceivedDate.toDate() : (data.whtReceivedDate ? new Date(data.whtReceivedDate) : undefined),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        } as AppDocument;
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }
  };
  
  export const getDocumentById = async (id: string): Promise<AppDocument | null> => {
    if (!db) {
        const all = getLocalDocuments();
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
                paidDate: data.paidDate?.toDate ? data.paidDate.toDate() : (data.paidDate ? new Date(data.paidDate) : undefined),
                whtReceivedDate: data.whtReceivedDate?.toDate ? data.whtReceivedDate.toDate() : (data.whtReceivedDate ? new Date(data.whtReceivedDate) : undefined),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            } as AppDocument;
        }
        return null;
    } catch (error) {
        console.error("Error fetching document:", error);
        throw error;
    }
  };

  export const createDocument = async (docData: Omit<AppDocument, 'id' | 'documentNo' | 'createdAt'>): Promise<string> => {
    if (!docData.accountId) throw new Error("Account ID required");

    const documentNo = await generateDocumentNumber(docData.userId, docData.accountId, docData.type);
    
    if (!db) {
      const newId = `local_${docData.type}_` + Date.now();
      const newDoc: AppDocument = {
          id: newId,
          documentNo,
          ...docData,
          createdAt: new Date()
      };
      const current = getLocalDocuments();
      setLocalDocuments([newDoc, ...current]);
      return newId;
    }
    
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...docData,
        documentNo,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding document:", error);
      throw error;
    }
  };
  
  export const updateDocument = async (id: string, docData: Partial<AppDocument>): Promise<void> => {
    if (!db) {
      const current = getLocalDocuments();
      const index = current.findIndex(c => c.id === id);
      if (index !== -1) {
          current[index] = { ...current[index], ...docData };
          setLocalDocuments(current);
      }
      return;
    }
    
    try {
      const ref = doc(db, COLLECTION_NAME, id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, documentNo: __, createdAt: ___, ...updateData } = docData as any;
      await updateDoc(ref, updateData);
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  };
  
  export const deleteDocument = async (id: string): Promise<void> => {
    if (!db) {
      const current = getLocalDocuments();
      const filtered = current.filter(c => c.id !== id);
      setLocalDocuments(filtered);
      return;
    }
    
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  };

  export const toggleWhtReceived = async (id: string, received: boolean): Promise<void> => {
    if (!db) {
        const current = getLocalDocuments();
        const index = current.findIndex(c => c.id === id);
        if (index !== -1) {
            current[index] = { 
                ...current[index], 
                whtReceived: received,
                whtReceivedDate: received ? new Date() : undefined
            };
            setLocalDocuments(current);
        }
        return;
    }

    try {
        const ref = doc(db, COLLECTION_NAME, id);
        await updateDoc(ref, {
            whtReceived: received,
            whtReceivedDate: received ? serverTimestamp() : null
        });
    } catch (error) {
        console.error("Error toggling WHT received:", error);
        throw error;
    }
  };