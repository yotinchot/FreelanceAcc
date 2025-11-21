import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      login().then(() => navigate('/dashboard'));
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left space-y-6">
              <div className="inline-block bg-blue-50 text-primary-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-2">
                สำหรับฟรีแลนซ์ไทย 🇹🇭
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
                จัดการบัญชีง่ายๆ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">
                  ชีวิตฟรีแลนซ์ลงตัว
                </span>
              </h1>
              <p className="text-lg text-slate-600 md:max-w-md mx-auto md:mx-0">
                เลิกปวดหัวกับ Excel หยุดงงกับภาษี ระบบบันทึกรายรับรายจ่ายที่ออกแบบมาเพื่อคนทำงานอิสระโดยเฉพาะ ใช้งานฟรี เริ่มต้นได้ทันที
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <button 
                  onClick={handleCtaClick}
                  className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-semibold shadow-lg shadow-primary-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  {user ? 'ไปที่แดชบอร์ด' : 'เริ่มต้นใช้งานฟรี'}
                  <ArrowRight size={20} />
                </button>
                <button className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full font-semibold transition-colors">
                  ดูฟีเจอร์ทั้งหมด
                </button>
              </div>
            </div>
            
            {/* Hero Image Placeholder */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 overflow-hidden rotate-2 hover:rotate-0 transition-transform duration-500">
                <img 
                  src="https://picsum.photos/800/600" 
                  alt="Dashboard Preview" 
                  className="rounded-xl w-full h-auto object-cover"
                />
                {/* Floating Badge */}
                <div className="absolute bottom-8 -left-4 bg-white p-4 rounded-lg shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce duration-[3000ms]">
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle2 className="text-green-600 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">รายรับเดือนนี้</p>
                        <p className="font-bold text-slate-800">+ 45,000 บาท</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">ทำไมต้อง FreelanceAcc?</h2>
            <p className="text-slate-600">เราเข้าใจความเจ็บปวดของการทำบัญชีเอง เราจึงสร้างเครื่องมือที่ตัดความยุ่งยากออกไป เหลือไว้แต่สิ่งที่จำเป็น</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 className="w-8 h-8 text-primary-600" />,
                title: "เห็นภาพรวมการเงิน",
                desc: "Dashboard สรุปยอดขาย กำไร และค่าใช้จ่ายแบบ Real-time ดูง่าย เข้าใจได้ในพริบตา"
              },
              {
                icon: <ShieldCheck className="w-8 h-8 text-primary-600" />,
                title: "ข้อมูลปลอดภัย",
                desc: "ข้อมูลของคุณถูกเก็บรักษาอย่างปลอดภัยบน Cloud ด้วยมาตรฐานระดับโลก เข้าถึงได้เฉพาะคุณเท่านั้น"
              },
              {
                icon: <CheckCircle2 className="w-8 h-8 text-primary-600" />,
                title: "ใช้งานง่าย ไม่ซับซ้อน",
                desc: "UI ออกแบบมาให้ Clean และ Minimal ลดขั้นตอนที่ไม่จำเป็น เน้นการใช้งานที่รวดเร็ว"
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="mb-4 bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;