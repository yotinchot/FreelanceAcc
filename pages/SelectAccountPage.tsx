import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Plus, ArrowRight, LogOut, Loader2, CheckCircle2, Briefcase } from 'lucide-react';
import { AccountType } from '../types';

const SelectAccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { accounts, switchAccount, createAccount, loading } = useAccount();
  const navigate = useNavigate();
  
  // Mode: 'select' (list) or 'create' (form)
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'freelance' as AccountType,
    name: '',
    taxId: '',
    address: '',
    phone: '',
    email: ''
  });

  // If user has no accounts and is in select mode, switch to create mode
  useEffect(() => {
    if (!loading && accounts.length === 0 && mode === 'select') {
        setMode('create');
    }
  }, [accounts, loading, mode]);

  const handleAccountSelect = (accountId: string) => {
    switchAccount(accountId);
    navigate('/dashboard');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    try {
        await createAccount({
            ...formData,
            user_id: user.uid,
            email: formData.email || user.email || '' // Default to user email if empty
        });
        // createAccount automatically switches and redirects in logic, 
        // but if we are on this page, we should redirect to dashboard manually to be safe
        navigate('/dashboard');
    } catch (error) {
        console.error("Failed to create account", error);
        alert("เกิดข้อผิดพลาดในการสร้างบัญชี");
    } finally {
        setSubmitting(false);
    }
  };

  const handleLogout = async () => {
      await logout();
      navigate('/');
  };

  if (loading) {
      return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {mode === 'select' ? 'เลือกบัญชีใช้งาน' : 'สร้างบัญชีใหม่'}
            </h1>
            <p className="text-slate-500">
                {mode === 'select' 
                    ? 'เลือกบัญชีที่คุณต้องการจัดการ หรือสร้างบัญชีใหม่' 
                    : 'กรอกข้อมูลเพื่อเริ่มต้นใช้งานระบบบัญชี'}
            </p>
        </div>

        {/* ----------------- LIST MODE ----------------- */}
        {mode === 'select' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {accounts.map((acc) => (
                    <button
                        key={acc.id}
                        onClick={() => handleAccountSelect(acc.id)}
                        className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group text-left flex items-center gap-4"
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${acc.type === 'company' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {acc.type === 'company' ? <Building2 size={24} /> : <User size={24} />}
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-slate-800 group-hover:text-primary-700 transition-colors">{acc.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                <span className="capitalize">{acc.type === 'company' ? 'บริษัท (Company)' : 'ฟรีแลนซ์ (Freelance)'}</span>
                                {acc.taxId && <span>• {acc.taxId}</span>}
                            </div>
                        </div>
                        <div className="text-slate-300 group-hover:text-primary-600">
                            <ArrowRight size={20} />
                        </div>
                    </button>
                ))}

                <button
                    onClick={() => setMode('create')}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <Plus size={20} /> สร้างบัญชีใหม่
                </button>

                <div className="pt-8 text-center">
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 text-sm flex items-center justify-center gap-1 mx-auto">
                        <LogOut size={14} /> ออกจากระบบ ({user?.email})
                    </button>
                </div>
            </div>
        )}

        {/* ----------------- CREATE MODE ----------------- */}
        {mode === 'create' && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 animate-in zoom-in-95 duration-200">
                <form onSubmit={handleCreateSubmit} className="space-y-5">
                    {/* Account Type Selector */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${formData.type === 'freelance' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-100 hover:border-emerald-200 text-slate-600'}`}>
                            <input 
                                type="radio" 
                                className="hidden" 
                                name="accType" 
                                checked={formData.type === 'freelance'}
                                onChange={() => setFormData({...formData, type: 'freelance'})} 
                            />
                            <div className="flex flex-col items-center gap-2">
                                <User size={28} className={formData.type === 'freelance' ? 'text-emerald-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm">ฟรีแลนซ์</span>
                            </div>
                        </label>
                        <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${formData.type === 'company' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-indigo-200 text-slate-600'}`}>
                            <input 
                                type="radio" 
                                className="hidden" 
                                name="accType" 
                                checked={formData.type === 'company'} 
                                onChange={() => setFormData({...formData, type: 'company'})}
                            />
                            <div className="flex flex-col items-center gap-2">
                                <Building2 size={28} className={formData.type === 'company' ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className="font-bold text-sm">บริษัท/นิติบุคคล</span>
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {formData.type === 'company' ? 'ชื่อบริษัท / ห้างหุ้นส่วน' : 'ชื่อที่ใช้รับงาน (ชื่อจริง หรือ นามแฝง)'} <span className="text-red-500">*</span>
                        </label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900"
                            placeholder={formData.type === 'company' ? 'บริษัท ตัวอย่าง จำกัด' : 'สมชาย งานดี'}
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1.5">เลขผู้เสียภาษี</label>
                             <input 
                                type="text" 
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-slate-900"
                                placeholder="0000000000000"
                                value={formData.taxId}
                                onChange={e => setFormData({...formData, taxId: e.target.value})}
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                             <input 
                                type="text" 
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900"
                                placeholder="081-xxx-xxxx"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                             />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
                        <textarea 
                            rows={2}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none text-slate-900"
                            placeholder="ที่อยู่สำหรับออกเอกสาร"
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        {accounts.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => setMode('select')}
                                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                        )}
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex justify-center items-center gap-2 disabled:opacity-70"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                            เริ่มต้นใช้งาน
                        </button>
                    </div>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};

export default SelectAccountPage;