
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
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification, AppDocument } from '../types';
import { getDocuments } from './documentService';
import { getDashboardData } from './reportService';
import { calculateVatInfo, analyzeTaxBracket, calculatePersonalTax } from './taxService';

const COLLECTION_NAME = 'notifications';
const LOCAL_STORAGE_KEY = 'freelance_acc_notifications';

// Helper for Demo Mode
const getLocalNotifications = (): Notification[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

const setLocalNotifications = (data: Notification[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

// 1. Get User Notifications
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  if (!db) {
    const all = getLocalNotifications();
    return all
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50) // Limit to last 50 notifications
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      } as Notification;
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    // Fallback for index errors
    return [];
  }
};

// 2. Mark as Read
export const markNotificationAsRead = async (id: string): Promise<void> => {
  if (!db) {
    const current = getLocalNotifications();
    const index = current.findIndex(n => n.id === id);
    if (index !== -1) {
      current[index].isRead = true;
      setLocalNotifications(current);
    }
    return;
  }

  try {
    const ref = doc(db, COLLECTION_NAME, id);
    await updateDoc(ref, { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    if (!db) {
        const current = getLocalNotifications();
        const updated = current.map(n => n.userId === userId ? { ...n, isRead: true } : n);
        setLocalNotifications(updated);
        return;
    }

    try {
        const q = query(
            collection(db, COLLECTION_NAME),
            where("userId", "==", userId),
            where("isRead", "==", false)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking all as read", error);
    }
};

// 3. Delete Notification
export const deleteNotification = async (id: string): Promise<void> => {
  if (!db) {
    const current = getLocalNotifications();
    const filtered = current.filter(n => n.id !== id);
    setLocalNotifications(filtered);
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

// 4. CORE LOGIC: Check Invoice Due Dates and Generate Notifications
export const checkAndGenerateNotifications = async (userId: string) => {
    try {
        // Fetch active invoices (sent or overdue)
        const invoices = await getDocuments(userId, undefined, 'invoice'); // Note: Assuming we check across all accounts for the user or context provides account
        // NOTE: To properly support account-specific checks, this function should ideally take accountId or loop through accounts.
        // For simplicity, we will rely on the fact that this runs in the context of the current session which often has an account selected, 
        // but getDocuments usually requires accountId. 
        // If accountId is missing in getDocuments calls inside context, it returns empty.
        // We should fetch invoices for the CURRENT account generally. 
        // Let's grab selected_account from localStorage as a fallback/hack if context isn't passed here.
        const accountId = localStorage.getItem(`selected_account_${userId}`);
        if (!accountId) return 0;

        const accountInvoices = await getDocuments(userId, accountId, 'invoice');
        const activeInvoices = accountInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
        
        // Get existing notifications to prevent duplicates
        const existingNotifications = await getUserNotifications(userId);
        const existingKeys = new Set(existingNotifications.map(n => n.triggerKey));

        const newNotifications: Omit<Notification, 'id' | 'createdAt'>[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalizing today

        // --- Invoice Checks ---
        for (const inv of activeInvoices) {
            const dueDate = new Date(inv.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Condition 1: Overdue
            if (diffDays < 0) {
                const key = `inv_${inv.id}_overdue`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        userId,
                        accountId,
                        title: 'ใบแจ้งหนี้เกินกำหนดชำระ',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} เกินกำหนดมาแล้ว ${Math.abs(diffDays)} วัน`,
                        type: 'error',
                        isRead: false,
                        relatedDocId: inv.id,
                        relatedDocNo: inv.documentNo,
                        triggerKey: key
                    });
                }
            }
            // Condition 2: Due in 1 day
            else if (diffDays === 1) {
                const key = `inv_${inv.id}_due_1`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        userId,
                        accountId,
                        title: 'ใกล้ครบกำหนดชำระ (พรุ่งนี้)',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} จะครบกำหนดชำระในวันพรุ่งนี้`,
                        type: 'warning',
                        isRead: false,
                        relatedDocId: inv.id,
                        relatedDocNo: inv.documentNo,
                        triggerKey: key
                    });
                }
            }
            // Condition 3: Due in 3 days
            else if (diffDays === 3) {
                const key = `inv_${inv.id}_due_3`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        userId,
                        accountId,
                        title: 'ใกล้ครบกำหนดชำระ (3 วัน)',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} จะครบกำหนดชำระในอีก 3 วัน`,
                        type: 'info',
                        isRead: false,
                        relatedDocId: inv.id,
                        relatedDocNo: inv.documentNo,
                        triggerKey: key
                    });
                }
            }
        }

        // --- Tax & VAT Checks (New) ---
        const stats = await getDashboardData(userId, accountId, 'year');
        const yearlyIncome = stats.income;
        const yearKey = new Date().getFullYear().toString();

        // 1. VAT Check
        if (yearlyIncome >= 1800000) {
            const key = `vat_${yearKey}_exceeded`;
            if (!existingKeys.has(key)) {
                newNotifications.push({
                    userId, accountId,
                    title: '🚨 รายได้เกิน 1.8 ล้านแล้ว!',
                    message: 'คุณต้องจดทะเบียน VAT ภายใน 30 วัน',
                    type: 'error',
                    isRead: false,
                    triggerKey: key
                });
            }
        } else if (yearlyIncome >= 1700000) {
            const key = `vat_${yearKey}_warning_1.7m`;
            if (!existingKeys.has(key)) {
                newNotifications.push({
                    userId, accountId,
                    title: '⚠️ ใกล้ถึงเกณฑ์จด VAT',
                    message: `รายได้สะสมปีนี้ ${(yearlyIncome/1000000).toFixed(2)} ล้านบาท ใกล้แตะ 1.8 ล้าน`,
                    type: 'warning',
                    isRead: false,
                    triggerKey: key
                });
            }
        }

        // 2. Tax Bracket Check
        // Approximate check using flat rate assumptions
        const taxParams = {
            totalIncome: yearlyIncome,
            expenseType: 'flat' as const,
            deductions: { socialSecurity: 9000, lifeInsurance: 0, providentFund: 0, donation: 0, other: 0 },
            whtAmount: 0
        };
        const taxResult = calculatePersonalTax(taxParams);
        const bracketAnalysis = analyzeTaxBracket(taxResult.netIncome);
        
        if (bracketAnalysis.isClose) {
             const key = `tax_${yearKey}_bracket_warn_${bracketAnalysis.currentBracket.rate}`;
             if (!existingKeys.has(key)) {
                newNotifications.push({
                    userId, accountId,
                    title: '📊 ใกล้ขึ้นขั้นภาษีใหม่',
                    message: `อีก ${Math.round(bracketAnalysis.incomeToNext || 0).toLocaleString()} บาท จะขึ้นขั้นภาษี ${bracketAnalysis.nextBracket?.rate ? bracketAnalysis.nextBracket.rate * 100 : 0}%`,
                    type: 'info',
                    isRead: false,
                    triggerKey: key
                });
             }
        }

        // Batch write new notifications
        if (newNotifications.length > 0) {
            if (!db) {
                const current = getLocalNotifications();
                const timestamped = newNotifications.map(n => ({ 
                    ...n, 
                    id: 'local_notif_' + Date.now() + Math.random(), 
                    createdAt: new Date() 
                }));
                setLocalNotifications([...timestamped, ...current]);
            } else {
                const batch = writeBatch(db);
                newNotifications.forEach(n => {
                    const ref = doc(collection(db, COLLECTION_NAME));
                    batch.set(ref, { ...n, createdAt: serverTimestamp() });
                });
                await batch.commit();
            }
            return newNotifications.length;
        }
        return 0;
    } catch (error) {
        console.error("Error generating notifications:", error);
        return 0;
    }
};
