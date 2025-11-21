
import React, { useState, useRef, useEffect } from 'react';
import { useAccount } from '../context/AccountContext';
import { useNavigate } from 'react-router-dom';
import { Building2, User, ChevronDown, Plus, Settings, LogOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AccountSwitcher: React.FC = () => {
  const { currentAccount, accounts, switchAccount } = useAccount();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (accountId: string) => {
    switchAccount(accountId);
    setIsOpen(false);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!currentAccount) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
      >
        <div className={`p-1.5 rounded-md ${currentAccount.type === 'company' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {currentAccount.type === 'company' ? <Building2 size={16} /> : <User size={16} />}
        </div>
        <div className="text-left hidden md:block">
            <div className="text-xs text-slate-500 font-medium">{currentAccount.type === 'company' ? 'บัญชีบริษัท' : 'บัญชีฟรีแลนซ์'}</div>
            <div className="text-sm font-bold text-slate-800 max-w-[120px] truncate">{currentAccount.name}</div>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2">
                <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">สลับบัญชี</div>
                {accounts.map(acc => (
                    <button
                        key={acc.id}
                        onClick={() => handleSwitch(acc.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${currentAccount.id === acc.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded shrink-0 ${acc.type === 'company' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {acc.type === 'company' ? <Building2 size={14} /> : <User size={14} />}
                            </div>
                            <span className="truncate font-medium text-sm">{acc.name}</span>
                        </div>
                        {currentAccount.id === acc.id && <Check size={16} className="text-primary-600" />}
                    </button>
                ))}
                
                <button
                    onClick={() => {
                        setIsOpen(false);
                        navigate('/select-account');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors mt-1"
                >
                    <div className="p-1.5 rounded bg-slate-100 text-slate-500">
                        <Plus size={14} />
                    </div>
                    <span className="text-sm font-medium">เพิ่มบัญชีใหม่</span>
                </button>
            </div>

            <div className="border-t border-slate-100 p-2 bg-slate-50">
                <button
                    onClick={() => {
                        setIsOpen(false);
                        navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                    <Settings size={16} /> ตั้งค่าบัญชี
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={16} /> ออกจากระบบ
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AccountSwitcher;
