
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
  userId: string; // Owner
  type: AccountType;
  name: string; // Company Name or Freelancer Name
  taxId: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  signatureUrl?: string;
  paymentInfo?: string;
  createdAt: any;
  updatedAt?: any;
  emailNotifications?: {
    invoiceDue: boolean;
    invoiceOverdue: boolean;
    weeklyReport: boolean;
  };
}

// Backward compatibility alias, though we are moving to Account
export type SellerProfile = Account;

export interface Customer {
  id?: string;
  userId: string;
  accountId: string; // Link to specific account
  name: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt?: any;
}

export interface QuotationItem {
  id: string;
  description: string; // Product/Service Name
  details?: string;    // Additional Description
  quantity: number;
  price: number;
  amount: number; 
}

export type DocumentType = 'quotation' | 'invoice' | 'receipt' | 'tax_invoice' | 'tax_receipt';

export interface AppDocument {
  id?: string;
  type: DocumentType;
  documentNo: string; // QT-..., INV-..., RC-..., TX-..., TR-...
  referenceNo?: string; // Ref to previous doc e.g. Ref QT-2024-001
  referenceId?: string; // ID of the parent doc
  projectName?: string; // New: Project Name
  userId: string;
  accountId: string; // Link to specific account
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerTaxId?: string;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date; // Date when payment was received
  items: QuotationItem[];
  subtotal: number;
  vatRate: number; 
  vatAmount: number;
  grandTotal: number;
  withholdingTaxRate?: number; // 1, 2, 3, 5
  whtReceived?: boolean; // New: For tracking if 50 Tavi is received
  whtReceivedDate?: Date; // New: When the 50 Tavi was received
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue';
  createdAt?: any;
  updatedAt?: any;
}

export type Quotation = AppDocument;

// New Types for Transactions
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: string;
  userId: string;
  accountId: string; // Link to specific account
  type: TransactionType;
  date: Date;
  amount: number;
  category: string;
  description: string;
  referenceNo?: string; // Optional link to Document No
  attachmentUrl?: string; // Base64 or URL
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

// Notification Types
export interface Notification {
  id?: string;
  userId: string;
  accountId?: string; // Optional for system notifs, but mostly should have it
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: any;
  relatedDocId?: string; // Link to invoice ID
  relatedDocNo?: string;
  triggerKey?: string; // Unique key to prevent duplicates e.g., "inv_123_due_3"
}