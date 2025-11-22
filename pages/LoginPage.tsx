
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Loader2, Wallet } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
        setError('กรุณากรอกอีเมล');
        setLoading(false);
        return;
    }

    if (!cleanPassword) {
        setError('กรุณากรอกรหัสผ่าน');
        setLoading(false);
        return;
    }

    try {
      if (isLogin) {
        // Login Logic
        const { user } = await login(cleanEmail, cleanPassword);
        
        if (user) {
          // Check if account exists using snake_case column 'user_id'
          const { data: account } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (account) {
             navigate('/dashboard');
          } else {
             navigate('/select-account');
          }
        }
      } else {
        // Signup Logic
        const { user } = await register(cleanEmail, cleanPassword);
        
        if (user) {
          setMessage('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Translate common Supabase errors
      let errMsg = err.message;
      if (errMsg === 'Invalid login credentials') errMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      if (errMsg === 'User already registered') errMsg = 'อีเมลนี้ถูกใช้งานแล้ว';
      if (errMsg.includes('missing email')) errMsg = 'กรุณาระบุอีเมล';
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">FreelanceAcc</h1>
          <p className="text-slate-500">ระบบบัญชีสำหรับฟรีแลนซ์ จัดการง่ายในที่เดียว</p>
        </div>

        <h2 className="text-xl font-bold mb-6 text-center text-slate-800">
          {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100 flex items-center gap-2">
             <span className="font-bold">!</span> {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm border border-green-100">
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
              placeholder="••••••••"
              required
              minLength={6}
            />
            {!isLogin && (
              <p className="text-xs text-slate-400 mt-1">ความยาวอย่างน้อย 6 ตัวอักษร</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed font-bold shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-5 h-5" />}
            {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
        
        <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            {isLogin ? 'ยังไม่มีบัญชีใช่ไหม?' : 'มีบัญชีอยู่แล้ว?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className="text-primary-600 hover:text-primary-700 hover:underline ml-1 font-bold"
            >
              {isLogin ? 'สมัครสมาชิกเลย' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;
