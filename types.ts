
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  lastLogin: Date;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
}

export type AccountType = 'company' | 'freelance';

export interface Account {
  id: string;
  user_id: string;
  type: AccountType; // Maps to account_type
  name: string; // Maps to business_name
  taxId: string;
  address: string;
  phone: string;
  email: string;
  createdAt: any;
  updatedAt?: any;
}

// Backward compatibility alias
export type SellerProfile = Account;

export interface Customer {
  id?: string;
  user_id: string;
  account_id: string;
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt?: any;
}

export interface QuotationItem {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  price: number;
  amount: number; 
}

export type DocumentType = 'quotation' | 'invoice' | 'receipt' | 'tax_invoice' | 'tax_receipt';

export interface AppDocument {
  id?: string;
  type: DocumentType;
  documentNo: string;
  referenceNo?: string;
  referenceId?: string;
  projectName?: string;
  user_id: string;
  account_id: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerTaxId?: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  items: QuotationItem[];
  subtotal: number;
  vatRate: number; 
  vatAmount: number;
  grandTotal: number;
  withholdingTaxRate?: number;
  whtReceived?: boolean;
  whtReceivedDate?: Date;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue';
  createdAt?: any;
  updatedAt?: any;
}

export type Quotation = AppDocument;

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: string;
  user_id: string;
  account_id: string;
  type: TransactionType;
  date: Date;
  amount: number;
  category: string;
  description: string;
  referenceNo?: string;
  attachmentUrl?: string;
  createdAt?: any;
}

export const EXPENSE_CATEGORIES = [
  'ค่าอุปกรณ์/วัสดุ',
  'ค่าเดินทาง',
  'ค่าจ้าง/ฟรีแลนซ์',
  'ค่าเช่าสถานที่',
  'ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต',
  'ค่าโฆษณา/การตลาด',
  'ค่าอาหาร/รับรอง',
  'เงินเดือนตนเอง',
  'ภาษี',
  'อื่นๆ'
];

export const INCOME_CATEGORIES = [
  'รายได้จากการบริการ',
  'รายได้จากการขาย',
  'เงินปันผล/ดอกเบี้ย',
  'เงินคืนภาษี',
  'อื่นๆ'
];

export interface Notification {
  id?: string;
  user_id: string;
  account_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: any;
  relatedDocId?: string;
  relatedDocNo?: string;
  triggerKey?: string;
}
