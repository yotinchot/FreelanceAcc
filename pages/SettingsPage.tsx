
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { updateAccount } from '../services/accountService';
import { Account } from '../types';
import { Save, Loader2, Building2, MapPin, Receipt, Phone, CreditCard, AlertCircle, Mail, Bell, User } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount, refreshAccounts } = useAccount();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [formData, setFormData] = useState<Partial<Account>>({});

  useEffect(() => {
    if (currentAccount) {
        setFormData(currentAccount);
    }
  }, [currentAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentAccount) return;
    
    setSaving(true);
    setMessage(null);

    try {
      await updateAccount(currentAccount.id, formData);
      await refreshAccounts(); // Reload context to reflect changes in navbar etc.
      setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = (key: keyof NonNullable<Account['emailNotifications']>) => {
      setFormData(prev => ({
          ...prev,
          emailNotifications: {
              invoiceDue: true,
              invoiceOverdue: true,
              weeklyReport: false,
              ...prev.emailNotifications,
              [key]: !(prev.emailNotifications?.[key] ?? true) // Default true if undefined
          }
      }));
  };

  if (!currentAccount) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">ตั้งค่าบัญชี</h1>
            <p className="text-slate-500">แก้ไขข้อมูลสำหรับ <span className="font-semibold text-primary-600">{currentAccount.name}</span> ({currentAccount.type === 'company' ? 'บริษัท' : 'ฟรีแลนซ์'})</p>
        </div>
        <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${currentAccount.type === 'company' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {currentAccount.type}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <Save size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-white rounded border border-slate-200 shadow-sm">
              {currentAccount.type === 'company' ? <Building2 className="text-primary-600" size={20} /> : <User className="text-emerald-600" size={20} />}
            </div>
            <h2 className="font-semibold text-slate-800">ข้อมูลทั่วไป</h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อที่ใช้ในเอกสาร</label>
                    <input 
                        type="text" 
                        required
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900"
                        placeholder="ชื่อบริษัท หรือ ชื่อ-นามสกุล"
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขประจำตัวผู้เสียภาษี</label>
                    <div className="relative">
                        <Receipt className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none font-mono transition-all text-slate-900"
                            placeholder="0000000000000"
                            value={formData.taxId || ''}
                            onChange={e => setFormData({...formData, taxId: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900"
                            placeholder="08x-xxx-xxxx"
                            value={formData.phone || ''}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                        <textarea 
                            rows={3}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all text-slate-900"
                            placeholder="ที่อยู่สำหรับออกเอกสาร"
                            value={formData.address || ''}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Branding & Payment */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-white rounded border border-slate-200 shadow-sm">
              <CreditCard className="text-primary-600" size={20} />
            </div>
            <h2 className="font-semibold text-slate-800">การชำระเงิน & โลโก้</h2>
          </div>
          <div className="p-6 space-y-5">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ลิงก์รูปโลโก้ (URL)</label>
                <input 
                    type="text" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all text-slate-900"
                    placeholder="https://example.com/my-logo.png"
                    value={formData.logoUrl || ''}
                    onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                />
                <p className="text-xs text-slate-400 mt-1.5">แนะนำขนาดสี่เหลี่ยมจัตุรัส หรือพื้นหลังโปร่งใส (PNG)</p>
             </div>
             {formData.logoUrl && (
                 <div className="p-4 border border-slate-100 rounded-lg bg-slate-50 flex justify-center">
                     <img src={formData.logoUrl} alt="Logo Preview" className="h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                 </div>
             )}

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ข้อมูลการชำระเงิน (ปรากฏท้ายเอกสาร)</label>
                <textarea 
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all text-slate-900"
                    placeholder="ชื่อบัญชี: นายสมชาย&#10;ธนาคาร: กสิกรไทย&#10;เลขที่บัญชี: 123-4-56789-0"
                    value={formData.paymentInfo || ''}
                    onChange={e => setFormData({...formData, paymentInfo: e.target.value})}
                />
             </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-white rounded border border-slate-200 shadow-sm">
              <Bell className="text-primary-600" size={20} />
            </div>
            <h2 className="font-semibold text-slate-800">การแจ้งเตือน</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100">
                    <Mail className="text-slate-400" size={20} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">รับการแจ้งเตือนทางอีเมล</p>
                    <p className="text-xs text-slate-500">ใช้อีเมล: {formData.email || user?.email}</p>
                </div>
            </div>

            <div className="space-y-4 pl-2 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-11 h-6 rounded-full p-1 transition-colors ${formData.emailNotifications?.invoiceDue ? 'bg-primary-600' : 'bg-slate-200'}`}
                         onClick={() => handleToggleNotification('invoiceDue')}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.emailNotifications?.invoiceDue ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">แจ้งเตือนเมื่อใบแจ้งหนี้ใกล้ครบกำหนด (3 วัน และ 1 วัน)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-11 h-6 rounded-full p-1 transition-colors ${formData.emailNotifications?.invoiceOverdue ? 'bg-primary-600' : 'bg-slate-200'}`}
                         onClick={() => handleToggleNotification('invoiceOverdue')}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.emailNotifications?.invoiceOverdue ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">แจ้งเตือนเมื่อใบแจ้งหนี้เกินกำหนดชำระ</span>
                </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
            <button 
                type="submit" 
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-70 transition-all hover:shadow-primary-500/30 hover:-translate-y-0.5"
            >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                บันทึกการตั้งค่า
            </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
