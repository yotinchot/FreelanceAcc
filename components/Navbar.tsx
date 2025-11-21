
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User as UserIcon, LayoutDashboard, FileText, Users, PieChart, Files, Wallet, Receipt, ClipboardCheck, Calculator, FileUp } from 'lucide-react';
import NotificationBell from './NotificationBell';
import AccountSwitcher from './AccountSwitcher';

const Navbar: React.FC = () => {
  const { user, login } = useAuth();
  const { currentAccount } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async () => {
    try {
        await login();
        navigate('/select-account');
    } catch (e) {
        // Error handled in context
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 print:hidden">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? (currentAccount ? "/dashboard" : "/select-account") : "/"} className="flex items-center space-x-2 group">
          <div className="bg-primary-600 text-white p-1.5 rounded-lg group-hover:bg-primary-700 transition-colors">
            <Wallet size={24} />
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">
            Freelance<span className="text-primary-600">Acc</span>
          </span>
        </Link>

        {/* Middle Navigation (Desktop) - Only show if Account is Selected */}
        {user && currentAccount && (
          <div className="hidden xl:flex items-center space-x-1 bg-slate-100/50 p-1 rounded-xl overflow-x-auto">
            <Link 
              to="/dashboard" 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${location.pathname === '/dashboard' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <LayoutDashboard size={16} />
              ภาพรวม
            </Link>
            <Link 
              to="/transactions" 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/transactions') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <PieChart size={16} />
              รายจ่ายทั่วไป
            </Link>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <Link 
              to="/quotations" 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/quotations') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <FileText size={16} />
              ใบเสนอราคา
            </Link>
            <Link 
              to="/invoices" 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/invoices') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <FileText size={16} />
              ใบวางบิล
            </Link>
            
            {currentAccount.type === 'company' ? (
               <Link 
                 to="/tax-receipts" 
                 className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/tax-receipts') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
               >
                 <Files size={16} />
                 ใบกำกับภาษี/ใบเสร็จ
               </Link>
            ) : (
               <>
                <Link 
                  to="/receipts" 
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/receipts') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                >
                  <Receipt size={16} />
                  ใบเสร็จรับเงิน
                </Link>
                <Link 
                  to="/withholding-tax" 
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/withholding-tax') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                >
                  <ClipboardCheck size={16} />
                  ติดตามใบหักภาษี
                </Link>
               </>
            )}
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <Link 
              to="/tax" 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/tax') && !isActive('/tax-filing') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
            >
              <Calculator size={16} />
              คำนวณภาษี
            </Link>
            {currentAccount.type === 'freelance' && (
                <Link 
                to="/tax-filing" 
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${isActive('/tax-filing') ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                >
                <FileUp size={16} />
                ยื่นภาษี
                </Link>
            )}
          </div>
        )}

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-2 sm:space-x-3 mr-2 sm:mr-4 pl-0 sm:pl-4 border-l-0 sm:border-l border-slate-200">
                 {/* Notification Bell */}
                 {currentAccount && <NotificationBell />}
                 
                 {/* Account Switcher */}
                 <AccountSwitcher />
              </div>
            </>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-full font-medium transition-all transform hover:scale-105 shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <UserIcon size={18} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
