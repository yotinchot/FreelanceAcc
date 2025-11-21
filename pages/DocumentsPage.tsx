
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { AppDocument, DocumentType } from '../types';
import { getDocuments, deleteDocument } from '../services/documentService';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Search, Edit, Trash2, Loader2, User, Receipt, BadgeCheck, Calendar, Files, AlertTriangle } from 'lucide-react';

interface DocumentsPageProps {
    type: DocumentType;
    title: string;
    subtitle: string;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ type, title, subtitle }) => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete State
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, no: string}>({ isOpen: false, id: '', no: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = async () => {
    if (!user || !currentAccount) return;
    setLoading(true);
    try {
      const data = await getDocuments(user.uid, currentAccount.id, type);
      setDocs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user, currentAccount, type]);

  const handleDeleteClick = (e: React.MouseEvent, doc: AppDocument) => {
      e.stopPropagation();
      e.preventDefault();
      if (doc.id) {
          setDeleteDialog({ isOpen: true, id: doc.id, no: doc.documentNo });
      }
  };

  const confirmDelete = async () => {
      if (!deleteDialog.id) return;
      setIsDeleting(true);
      try {
          await deleteDocument(deleteDialog.id);
          setDocs(prev => prev.filter(q => q.id !== deleteDialog.id));
          setDeleteDialog({ isOpen: false, id: '', no: '' });
      } catch (e) {
          console.error("Delete failed", e);
          alert('เกิดข้อผิดพลาดในการลบเอกสาร');
      } finally {
          setIsDeleting(false);
      }
  };

  const filteredDocs = docs.filter(q => 
    q.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.projectName && q.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: any) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit'
    });
  };

  const getStatusBadge = (status: string, paidDate?: any) => {
      const styles: Record<string, string> = {
          draft: 'bg-slate-100 text-slate-600 border border-slate-200',
          sent: 'bg-blue-50 text-blue-700 border border-blue-100',
          accepted: 'bg-green-50 text-green-700 border border-green-100',
          rejected: 'bg-red-50 text-red-700 border border-red-100',
          paid: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
          overdue: 'bg-orange-50 text-orange-700 border border-orange-100'
      };
      
      const labels: Record<string, string> = {
          draft: 'แบบร่าง',
          sent: 'ส่งแล้ว',
          accepted: 'อนุมัติ',
          rejected: 'ปฏิเสธ',
          paid: 'ชำระแล้ว',
          overdue: 'เกินกำหนด'
      };

      return (
        <div className="flex flex-col items-center justify-center w-full">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styles[status] || styles.draft}`}>
              {labels[status] || status}
          </span>
          {status === 'paid' && paidDate && (
            <span className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 whitespace-nowrap">
                <Calendar size={10} />
                {new Date(paidDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      );
  };

  const getIcon = () => {
      switch(type) {
          case 'quotation': return <FileText className="text-primary-600" />;
          case 'invoice': return <FileText className="text-indigo-600" />;
          case 'receipt': return <Receipt className="text-emerald-600" />;
          case 'tax_invoice': return <BadgeCheck className="text-amber-600" />;
          case 'tax_receipt': return <Files className="text-teal-600" />;
          default: return <FileText />;
      }
  };

  const getRoutePath = () => {
      if (type === 'tax_receipt') return 'tax-receipts';
      if (type === 'tax_invoice') return 'tax-invoices';
      return type + 's';
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <span className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">{getIcon()}</span>
            {title}
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12">{subtitle}</p>
        </div>
        <Link 
          to={`/${getRoutePath()}/new`}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          สร้างใหม่
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า, หรือชื่องาน..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div>
      ) : filteredDocs.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                {getIcon()}
            </div>
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มี{title}</h3>
            <p className="text-slate-500 mb-6">เริ่มสร้างเอกสารใบแรกของคุณได้เลย</p>
            <Link to={`/${getRoutePath()}/new`} className="text-primary-600 hover:underline font-medium">
                + สร้างใหม่
            </Link>
         </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl w-32">เลขที่เอกสาร</th>
                            <th className="px-6 py-4">ลูกค้า</th>
                            <th className="px-6 py-4">ชื่องาน</th>
                            <th className="px-6 py-4 text-center w-24">วันที่</th>
                            <th className="px-6 py-4 text-right w-32">ยอดสุทธิ</th>
                            <th className="px-6 py-4 text-center w-[120px]">สถานะ</th>
                            <th className="px-6 py-4 rounded-tr-xl text-right w-24">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDocs.map((doc) => (
                            <tr 
                                key={doc.id} 
                                onClick={() => navigate(`/${getRoutePath()}/edit/${doc.id}`)}
                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4 font-mono font-medium text-primary-600 whitespace-nowrap">
                                    <span className="hover:underline">{doc.documentNo}</span>
                                    {doc.referenceNo && <div className="text-xs text-slate-400 mt-0.5">Ref: {doc.referenceNo}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1 bg-slate-100 rounded text-slate-400 shrink-0"><User size={14} /></div>
                                        <span className="font-medium text-slate-800 truncate max-w-[150px]" title={doc.customerName}>{doc.customerName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {doc.projectName ? (
                                        <span className="truncate max-w-[150px] block" title={doc.projectName}>{doc.projectName}</span>
                                    ) : (
                                        <span className="text-slate-300 text-xs italic">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600 whitespace-nowrap">
                                    {formatDate(doc.issueDate)}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800">
                                    {doc.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-center align-middle whitespace-nowrap status-cell">
                                    {getStatusBadge(doc.status, doc.paidDate)}
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                        <Link 
                                            to={`/${getRoutePath()}/edit/${doc.id}`} 
                                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                                            title="แก้ไข/พิมพ์"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteClick(e, doc)} 
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                                            title="ลบ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบเอกสาร</h3>
                <p className="text-slate-500 mb-8">
                    คุณต้องการลบเอกสาร <span className="font-bold text-slate-800">{deleteDialog.no}</span> ใช่หรือไม่?<br/>
                    การกระทำนี้ไม่สามารถเรียกคืนได้
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setDeleteDialog({ isOpen: false, id: '', no: '' })} 
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors w-full"
                        disabled={isDeleting}
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        disabled={isDeleting} 
                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 w-full shadow-lg shadow-red-500/20"
                    >
                        {isDeleting && <Loader2 size={18} className="animate-spin" />} 
                        ลบเอกสาร
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
