
import { supabase } from './supabase';
import { Transaction } from '../types';

const TABLE_NAME = 'transactions';

export const getTransactions = async (userId: string, accountId?: string): Promise<Transaction[]> => {
  if (!accountId) return [];

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id || '',
      account_id: item.account_id,
      type: item.type,
      date: new Date(item.date),
      amount: item.amount,
      category: item.category,
      description: item.description,
      referenceNo: item.reference_no,
      attachmentUrl: item.attachment_url,
      createdAt: item.created_at ? new Date(item.created_at) : undefined
    })) as Transaction[];
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error fetching transactions:", msg);
    // Return empty array to prevent UI crash on network/auth error
    return [];
  }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const payload = {
      // user_id: transaction.user_id, // Commented out to fix schema error
      account_id: transaction.account_id,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      // reference_no: transaction.referenceNo, // Commented out to fix schema error
      // attachment_url: transaction.attachmentUrl, // Removed to fix schema error
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error adding transaction:", msg);
    throw new Error(msg);
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<void> => {
  try {
    const payload: any = {};
    if (transaction.type !== undefined) payload.type = transaction.type;
    if (transaction.date !== undefined) payload.date = transaction.date;
    if (transaction.amount !== undefined) payload.amount = transaction.amount;
    if (transaction.category !== undefined) payload.category = transaction.category;
    if (transaction.description !== undefined) payload.description = transaction.description;
    // if (transaction.referenceNo !== undefined) payload.reference_no = transaction.referenceNo; // Commented out to fix schema error
    // if (transaction.attachmentUrl !== undefined) payload.attachment_url = transaction.attachmentUrl; // Removed to fix schema error

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error updating transaction:", msg);
    throw new Error(msg);
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error deleting transaction:", msg);
    throw new Error(msg);
  }
};

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน', 'อ้างอิง'];
  
  const rows = transactions.map(t => [
    new Date(t.date).toLocaleDateString('th-TH'),
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.category,
    `"${t.description.replace(/"/g, '""')}"`,
    t.type === 'expense' ? -t.amount : t.amount,
    t.referenceNo || '-'
  ]);

  const csvContent = 
    "\uFEFF" + 
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
