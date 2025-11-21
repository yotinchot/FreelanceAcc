
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Customer } from '../types';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/customerService';
import { Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, FileText, X, Loader2, Users, Building2 } from 'lucide-react';

const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    phone: '',
    email: '',
    address: ''
  });

  // Fetch Customers
  const fetchCustomers = async () => {
    if (!user || !currentAccount) return;
    try {
      setLoading(true);
      const data = await getCustomers(user.uid, currentAccount.id);
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user, currentAccount]);

  // Filter Customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.taxId && c.taxId.includes(searchQuery))
  );

  // Handlers
  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        taxId: customer.taxId || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', taxId: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentAccount) return;

    try {
      setIsSubmitting(true);
      const customerData = {
        userId: user.uid,
        accountId: currentAccount.id,
        ...formData
      };

      if (editingCustomer && editingCustomer.id) {
        await updateCustomer(editingCustomer.id, customerData);
      } else {
        await addCustomer(customerData);
      }
      
      await fetchCustomers();
      handleCloseModal();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลลูกค้ารายนี้? การกระทำนี้ไม่สามารถเรียกคืนได้')) {
      try {
        await deleteCustomer(id);
        // Optimistic update for faster UI feel
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (error) {
        alert("เกิดข้อผิดพลาดในการลบข้อมูล");
        fetchCustomers(); // Revert on error
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <span className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm"><Users className="text-primary-600" /></span>
            จัดการลูกค้า
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12">รายชื่อลูกค้าและข้อมูลติดต่อสำหรับออกใบเสนอราคา/ใบแจ้งหนี้</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 sticky top-20 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อลูกค้า หรือ เลขผู้เสียภาษี..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
          <p>กำลังโหลดข้อมูลลูกค้า...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Building2 className="text-slate-300 w-10 h-10" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchQuery ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีรายชื่อลูกค้า'}
          </h3>
          <p className="text-slate-500 max-w-md mb-6">
            {searchQuery 
              ? `ไม่พบลูกค้าที่ตรงกับ "${searchQuery}" ลองใช้คำค้นหาอื่น` 
              : 'เริ่มสร้างฐานข้อมูลลูกค้าของคุณ เพื่อความสะดวกในการจัดการเอกสารในอนาคต'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => handleOpenModal()}
              className="text-primary-600 font-medium hover:underline hover:text-primary-700 flex items-center gap-1"
            >
              <Plus size={18} /> เพิ่มลูกค้าแรกของคุณ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-bold text-lg text-slate-900 truncate" title={customer.name}>
                    {customer.name}
                  </h3>
                  {customer.taxId ? (
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1.5 bg-slate-50 w-fit px-2 py-1 rounded border border-slate-100">
                      <FileText size={12} />
                      <span className="font-mono tracking-wide">{customer.taxId}</span>
                    </div>
                  ) : (
                     <div className="text-slate-400 text-xs mt-1.5 italic">ไม่มีเลขภาษี</div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => handleOpenModal(customer)}
                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => customer.id && handleDelete(customer.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 mt-auto pt-5 border-t border-slate-50">
                <div className="flex items-start gap-3 text-slate-600 text-sm">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2 leading-relaxed text-slate-600">
                        {customer.address || <span className="text-slate-400 italic">ไม่มีข้อมูลที่อยู่</span>}
                    </span>
                </div>
                
                <div className="flex flex-wrap gap-y-2 gap-x-6">
                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <Phone size={16} className="shrink-0 text-slate-400" />
                      <span className="font-medium">{customer.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <Mail size={16} className="shrink-0 text-slate-400" />
                      <span>{customer.email || '-'}</span>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
                <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ชื่อลูกค้า / บริษัท <span className="text-red-500">*</span>
                    </label>
                    <input
                    required
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm placeholder:text-slate-400 text-slate-800"
                    placeholder="เช่น บริษัท ตัวอย่าง จำกัด หรือ คุณสมชาย"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    เลขประจำตัวผู้เสียภาษี
                    </label>
                    <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm font-mono placeholder:text-slate-400 text-slate-800"
                    placeholder="0000000000000"
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        เบอร์โทรศัพท์
                    </label>
                    <input
                        type="tel"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm placeholder:text-slate-400 text-slate-800"
                        placeholder="08x-xxx-xxxx"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        อีเมล
                    </label>
                    <input
                        type="email"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm placeholder:text-slate-400 text-slate-800"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ที่อยู่
                    </label>
                    <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none text-sm placeholder:text-slate-400 text-slate-800"
                    placeholder="ที่อยู่สำหรับออกใบกำกับภาษี / ส่งเอกสาร"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                </div>
                </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex gap-3 justify-end shrink-0 rounded-b-2xl">
                <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    form="customer-form"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm hover:-translate-y-0.5"
                >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {editingCustomer ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
