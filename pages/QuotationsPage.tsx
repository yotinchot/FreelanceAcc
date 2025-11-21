
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Quotation } from '../types';
import { getQuotations, deleteQuotation } from '../services/quotationService';
import { Link } from 'react-router-dom';
import { Plus, FileText, Search, Edit, Trash2, Loader2, User, AlertTriangle } from 'lucide-react';

const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete State
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, no: string}>({ isOpen: false, id: '', no: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchQuotations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getQuotations(user.uid);
      setQuotations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [user]);

  const handleDeleteClick = (e: React.MouseEvent, doc: Quotation) => {
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
        await deleteQuotation(deleteDialog.id);
        setQuotations(prev => prev.filter(q => q.id !== deleteDialog.id));
        setDeleteDialog({ isOpen: false, id: '', no: '' });
    } catch (e) {
        console.error("Delete failed", e);
        alert('เกิดข้อผิดพลาดในการลบเอกสาร');
    } finally {
        setIsDeleting(false);
    }
  };

  const filteredDocs = quotations.filter(q => 
    q.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-primary-600" />
            ใบเสนอราคา (Quotations)
          </h1>
          <p className="text-slate-500 text-sm mt-1">สร้างและจัดการใบเสนอราคาสำหรับลูกค้าของคุณ</p>
        </div>
        <Link 
          to="/quotations/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          สร้างใบเสนอราคา
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div>
      ) : filteredDocs.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีใบเสนอราคา</h3>
            <p className="text-slate-500 mb-6">เริ่มสร้างใบเสนอราคาแรกของคุณได้เลย</p>
            <Link to="/quotations/new" className="text-primary-600 hover:underline font-medium">
                + สร้างใหม่
            </Link>
         </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 text-sm font-medium">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl">เลขที่เอกสาร</th>
                            <th className="px-6 py-4">ลูกค้า</th>
                            <th className="px-6 py-4 text-center">วันที่ออก</th>
                            <th className="px-6 py-4 text-right">ยอดรวมสุทธิ</th>
                            <th className="px-6 py-4 text-center w-[120px]">สถานะ</th>
                            <th className="px-6 py-4 rounded-tr-xl text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDocs.map((q) => (
                            <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-medium text-primary-600">
                                    <Link to={`/quotations/edit/${q.id}`} className="hover:underline">{q.documentNo}</Link>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        <span className="font-medium text-slate-800">{q.customerName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">
                                    {formatDate(q.issueDate)}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-900">
                                    {q.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap
                                        ${q.status === 'draft' ? 'bg-slate-100 text-slate-600' : 
                                          q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 
                                          q.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {q.status === 'draft' ? 'แบบร่าง' : 
                                         q.status === 'sent' ? 'ส่งแล้ว' : 
                                         q.status === 'accepted' ? 'อนุมัติ' : 'ยกเลิก'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                        <Link to={`/quotations/edit/${q.id}`} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="แก้ไข/พิมพ์">
                                            <Edit size={16} />
                                        </Link>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, q)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" 
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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

export default QuotationsPage;
