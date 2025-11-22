
import { supabase } from './supabase';
import { Notification } from '../types';
import { getDocuments } from './documentService';
import { getDashboardData } from './reportService';
import { analyzeTaxBracket, calculatePersonalTax } from './taxService';

const TABLE_NAME = 'notifications';

export const getAccountNotifications = async (accountId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id || '',
      account_id: item.account_id,
      title: item.title,
      message: item.message,
      type: item.type,
      isRead: false, // item.is_read, // Default to false as column is missing
      createdAt: new Date(item.created_at),
      relatedDocId: item.related_doc_id,
      relatedDocNo: item.related_doc_no,
      triggerKey: item.trigger_key
    })) as Notification[];
  } catch (error: any) {
    console.error("Error fetching notifications:", error?.message || JSON.stringify(error));
    return [];
  }
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  // Disabled due to schema error
  /*
  try {
    await supabase
      .from(TABLE_NAME)
      .update({ is_read: true })
      .eq('id', id);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
  */
};

export const markAllAsRead = async (accountId: string): Promise<void> => {
  // Disabled due to schema error
  /*
  try {
    await supabase
      .from(TABLE_NAME)
      .update({ is_read: true })
      .eq('account_id', accountId)
      .eq('is_read', false);
  } catch (error) {
    console.error("Error marking all as read", error);
  }
  */
};

export const deleteNotification = async (id: string): Promise<void> => {
  try {
    await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

export const checkAndGenerateNotifications = async (userId: string, accountId: string) => {
    if (!accountId) return 0;

    try {
        const accountInvoices = await getDocuments(userId, accountId, 'invoice');
        if (accountInvoices.length === 0) return 0;

        const activeInvoices = accountInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
        
        const existingNotifications = await getAccountNotifications(accountId);
        const existingKeys = new Set(existingNotifications.map(n => n.triggerKey));

        const newNotifications: any[] = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Check Invoices
        for (const inv of activeInvoices) {
            const dueDate = new Date(inv.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                const key = `inv_${inv.id}_overdue`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        user_id: userId, 
                        account_id: accountId,
                        title: 'ใบแจ้งหนี้เกินกำหนดชำระ',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} เกินกำหนดมาแล้ว ${Math.abs(diffDays)} วัน`,
                        type: 'error',
                        // is_read: false,
                        related_doc_id: inv.id,
                        related_doc_no: inv.documentNo,
                        trigger_key: key,
                        created_at: new Date().toISOString()
                    });
                }
            }
            else if (diffDays === 1) {
                const key = `inv_${inv.id}_due_1`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        user_id: userId, 
                        account_id: accountId,
                        title: 'ใกล้ครบกำหนดชำระ (พรุ่งนี้)',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} จะครบกำหนดชำระในวันพรุ่งนี้`,
                        type: 'warning',
                        // is_read: false,
                        related_doc_id: inv.id,
                        related_doc_no: inv.documentNo,
                        trigger_key: key,
                        created_at: new Date().toISOString()
                    });
                }
            }
            else if (diffDays === 3) {
                const key = `inv_${inv.id}_due_3`;
                if (!existingKeys.has(key)) {
                    newNotifications.push({
                        user_id: userId, 
                        account_id: accountId,
                        title: 'ใกล้ครบกำหนดชำระ (3 วัน)',
                        message: `ใบแจ้งหนี้ ${inv.documentNo} จะครบกำหนดชำระในอีก 3 วัน`,
                        type: 'info',
                        // is_read: false,
                        related_doc_id: inv.id,
                        related_doc_no: inv.documentNo,
                        trigger_key: key,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }

        // Check VAT & Tax
        const stats = await getDashboardData(userId, accountId, 'year');
        const yearlyIncome = stats.income;
        const yearKey = new Date().getFullYear().toString();

        if (yearlyIncome >= 1800000) {
            const key = `vat_${yearKey}_exceeded`;
            if (!existingKeys.has(key)) {
                newNotifications.push({
                    user_id: userId,
                    account_id: accountId,
                    title: '🚨 รายได้เกิน 1.8 ล้านแล้ว!',
                    message: 'คุณต้องจดทะเบียน VAT ภายใน 30 วัน',
                    type: 'error',
                    // is_read: false,
                    trigger_key: key,
                    created_at: new Date().toISOString()
                });
            }
        } else if (yearlyIncome >= 1700000) {
            const key = `vat_${yearKey}_warning_1.7m`;
            if (!existingKeys.has(key)) {
                newNotifications.push({
                    user_id: userId,
                    account_id: accountId,
                    title: '⚠️ ใกล้ถึงเกณฑ์จด VAT',
                    message: `รายได้สะสมปีนี้ ${(yearlyIncome/1000000).toFixed(2)} ล้านบาท ใกล้แตะ 1.8 ล้าน`,
                    type: 'warning',
                    // is_read: false,
                    trigger_key: key,
                    created_at: new Date().toISOString()
                });
            }
        }

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
                    user_id: userId,
                    account_id: accountId,
                    title: '📊 ใกล้ขึ้นขั้นภาษีใหม่',
                    message: `อีก ${Math.round(bracketAnalysis.incomeToNext || 0).toLocaleString()} บาท จะขึ้นขั้นภาษี ${bracketAnalysis.nextBracket?.rate ? bracketAnalysis.nextBracket.rate : 0}%`,
                    type: 'info',
                    // is_read: false,
                    trigger_key: key,
                    created_at: new Date().toISOString()
                });
             }
        }

        if (newNotifications.length > 0) {
            const { error } = await supabase.from(TABLE_NAME).insert(newNotifications);
            if (error) console.error("Error creating notifications", error.message);
            return newNotifications.length;
        }
        return 0;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error generating notifications:", msg);
        return 0;
    }
};
