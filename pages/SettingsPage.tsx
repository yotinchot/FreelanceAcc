
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { updateAccount } from '../services/accountService';
import { Account } from '../types';
import { Save, Loader2, Building2, MapPin, Receipt, Phone, AlertCircle, User } from 'lucide-react';

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
      await refreshAccounts(); 
      setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setSaving(false);
    }
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
