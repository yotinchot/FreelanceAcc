import { supabase } from './supabase';
import { Quotation } from '../types';

const TABLE_NAME = 'documents'; // Quotations are stored in documents table with type='quotation'

export const getQuotations = async (userId: string, accountId?: string): Promise<Quotation[]> => {
  if (!accountId) return [];

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('userId', userId)
      .eq('accountId', accountId)
      .eq('type', 'quotation')
      .order('issueDate', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      issueDate: new Date(item.issueDate),
      dueDate: new Date(item.dueDate),
      createdAt: new Date(item.createdAt)
    })) as Quotation[];
  } catch (error) {
    console.error("Error fetching quotations:", error);
    throw error;
  }
};

export const getQuotationById = async (id: string): Promise<Quotation | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
        ...data,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        createdAt: new Date(data.createdAt)
    } as Quotation;
  } catch (error) {
    console.error("Error fetching quotation:", error);
    throw error;
  }
};

// Document Number Generation logic is centralized in documentService usually, 
// but if this service is used standalone:
const generateDocumentNumber = async (userId: string, accountId: string): Promise<string> => {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}`;
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('documentNo')
            .eq('accountId', accountId)
            .like('documentNo', `${prefix}-%`)
            .order('documentNo', { ascending: false })
            .limit(1);

        if (error) return `${prefix}-001`;

        let lastNumber = 0;
        if (data && data.length > 0) {
            const parts = data[0].documentNo.split('-');
            if (parts.length === 3) lastNumber = parseInt(parts[2], 10);
        }
        return `${prefix}-${(lastNumber + 1).toString().padStart(3, '0')}`;
    } catch {
        return `${prefix}-001`;
    }
};

export const createQuotation = async (quotation: Omit<Quotation, 'id' | 'documentNo' | 'createdAt'>): Promise<string> => {
  if (!quotation.account_id) throw new Error("Account ID is required");
  
  const documentNo = await generateDocumentNumber(quotation.user_id, quotation.account_id);
  
  try {
    const payload = {
      ...quotation,
      type: 'quotation',
      documentNo,
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error("Error adding quotation:", error);
    throw error;
  }
};

export const updateQuotation = async (id: string, quotation: Partial<Quotation>): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, documentNo: __, createdAt: ___, ...updateData } = quotation as any;
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating quotation:", error);
    throw error;
  }
};

export const deleteQuotation = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting quotation:", error);
    throw error;
  }
};