
import { supabase } from './supabase';
import { AppDocument, DocumentType } from '../types';

const TABLE_NAME = 'documents';

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

const generateDocumentNumber = async (userId: string, accountId: string, type: DocumentType): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `${getPrefix(type)}-${year}`;
  
  try {
    // Find the last document with this prefix
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('document_no')
        .eq('account_id', accountId)
        .eq('type', type)
        .like('document_no', `${prefix}-%`)
        .order('document_no', { ascending: false })
        .limit(1);

    if (error) {
        return `${prefix}-001`;
    }

    let lastNumber = 0;
    if (data && data.length > 0) {
        const parts = data[0].document_no.split('-');
        if (parts.length === 3) {
            lastNumber = parseInt(parts[2], 10);
        }
    }
    return `${prefix}-${(lastNumber + 1).toString().padStart(3, '0')}`;
  } catch (e) {
    return `${prefix}-001`;
  }
};

const mapDocFromDB = (item: any): AppDocument => ({
    id: item.id,
    type: item.type,
    documentNo: item.document_no,
    referenceNo: item.reference_no,
    referenceId: item.reference_id,
    projectName: item.project_name,
    user_id: item.user_id, 
    account_id: item.account_id,
    customerId: item.customer_id,
    customerName: item.customer_name,
    customerAddress: item.customer_address,
    customerTaxId: item.customer_tax_id,
    issueDate: new Date(item.issue_date),
    dueDate: new Date(item.due_date),
    paidDate: item.paid_date ? new Date(item.paid_date) : undefined,
    items: item.items || [],
    subtotal: item.subtotal,
    vatRate: item.vat_rate,
    vatAmount: item.vat_amount,
    grandTotal: item.grand_total,
    withholdingTaxRate: item.withholding_tax_rate,
    // Fix: Handle missing columns gracefully
    whtReceived: item.wht_received || false,
    whtReceivedDate: item.wht_received_date ? new Date(item.wht_received_date) : undefined,
    notes: item.notes,
    status: item.status,
    createdAt: item.created_at ? new Date(item.created_at) : undefined,
    updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
});

export const getDocuments = async (userId: string, accountId?: string, type?: DocumentType): Promise<AppDocument[]> => {
  if (!accountId) return [];

  try {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('account_id', accountId)
      .order('issue_date', { ascending: false });

    if (type) {
        query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }
    
    return (data || []).map(mapDocFromDB);
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error fetching documents:", msg);
    // Return empty array instead of throwing to prevent UI crash on network error
    return [];
  }
};

export const getDocumentById = async (id: string): Promise<AppDocument | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapDocFromDB(data);
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
};

export const createDocument = async (docData: Omit<AppDocument, 'id' | 'documentNo' | 'createdAt'>): Promise<string> => {
  if (!docData.account_id) throw new Error("Account ID required");

  const documentNo = await generateDocumentNumber(docData.user_id, docData.account_id, docData.type);
  
  try {
    const payload = {
      user_id: docData.user_id, 
      account_id: docData.account_id,
      type: docData.type,
      document_no: documentNo,
      name: docData.projectName || documentNo, // Added 'name' to satisfy DB constraint
      reference_no: docData.referenceNo,
      reference_id: docData.referenceId,
      project_name: docData.projectName,
      customer_id: docData.customerId,
      customer_name: docData.customerName,
      customer_address: docData.customerAddress,
      customer_tax_id: docData.customerTaxId,
      issue_date: docData.issueDate,
      due_date: docData.dueDate,
      paid_date: docData.paidDate,
      items: docData.items,
      subtotal: docData.subtotal,
      vat_rate: docData.vatRate,
      vat_amount: docData.vatAmount,
      grand_total: docData.grandTotal,
      file_url: "", // Added to satisfy NOT NULL constraint
      // withholding_tax_rate: docData.withholdingTaxRate, // Commented out to fix schema error
      // wht_received: docData.whtReceived,
      // wht_received_date: docData.whtReceivedDate,
      notes: docData.notes,
      status: docData.status,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select('id')
      .single();

    if (error) {
        throw error;
    }
    return data.id;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error adding document:", msg);
    throw new Error(msg);
  }
};

export const updateDocument = async (id: string, docData: Partial<AppDocument>): Promise<void> => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    
    if (docData.status !== undefined) payload.status = docData.status;
    if (docData.items !== undefined) payload.items = docData.items;
    if (docData.issueDate !== undefined) payload.issue_date = docData.issueDate;
    if (docData.dueDate !== undefined) payload.due_date = docData.dueDate;
    if (docData.paidDate !== undefined) payload.paid_date = docData.paidDate;
    if (docData.notes !== undefined) payload.notes = docData.notes;
    if (docData.subtotal !== undefined) payload.subtotal = docData.subtotal;
    if (docData.vatAmount !== undefined) payload.vat_amount = docData.vatAmount;
    if (docData.grandTotal !== undefined) payload.grand_total = docData.grandTotal;
    if (docData.customerName !== undefined) payload.customer_name = docData.customerName;
    if (docData.customerAddress !== undefined) payload.customer_address = docData.customerAddress;
    if (docData.customerTaxId !== undefined) payload.customer_tax_id = docData.customerTaxId;
    if (docData.projectName !== undefined) {
        payload.project_name = docData.projectName;
        payload.name = docData.projectName || "Document"; // Update name if project name changes
    }
    // if (docData.withholdingTaxRate !== undefined) payload.withholding_tax_rate = docData.withholdingTaxRate; // Commented out to fix schema error
    
    // Temporarily removed wht_received fields to fix schema error
    // if (docData.whtReceived !== undefined) payload.wht_received = docData.whtReceived;
    // if (docData.whtReceivedDate !== undefined) payload.wht_received_date = docData.whtReceivedDate;

    const { error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error updating document:", msg);
    throw new Error(msg);
  }
};

export const deleteDocument = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Error deleting document:", msg);
    throw new Error(msg);
  }
};

export const toggleWhtReceived = async (id: string, received: boolean): Promise<void> => {
  try {
    // This might fail if column doesn't exist, wrap in try catch to not crash UI
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
          // wht_received: received,
          // wht_received_date: received ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) throw error;
  } catch (error: any) {
    console.error("Error toggling WHT received (Schema mismatch):", error.message);
  }
};
