
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardData, exportTaxFilingExcel } from '../services/reportService';
import { getDocuments } from '../services/documentService';
import { calculatePersonalTax } from '../services/taxService';
import { AppDocument } from '../types';
import { 
    FileUp, ChevronRight, CheckCircle2, AlertTriangle, Download, 
    FileText, ExternalLink, Calendar, HelpCircle, ChevronLeft,
    Receipt, Wallet, ArrowRight, X, BookOpen, Lightbulb, Check, AlertCircle
} from 'lucide-react';

const TaxFilingPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [systemIncome, setSystemIncome] = useState(0);
  const [systemWhtDocs, setSystemWhtDocs] = useState<AppDocument[]>([]);
  const [totalWhtAmount, setTotalWhtAmount] = useState(0);
  const [receivedWhtAmount, setReceivedWhtAmount] = useState(0);
  
  // Form State
  const [formType, setFormType] = useState<'pnd90' | 'pnd94'>('pnd90');
  const [deductions, setDeductions] = useState({
      socialSecurity: 9000,
      lifeInsurance: 0,
      healthInsurance: 0,
      providentFund: 0,
      rmf: 0,
      ssf: 0,
      donation: 0,
      donationDouble: 0,
      homeInterest: 0,
      other: 0
  });
  
  // Guide Modal
  const [showGuide, setShowGuide] = useState(false);

  // Form Helper Modal
  const [showFormHelper, setShowFormHelper] = useState(false);
  const [helperTab, setHelperTab] = useState<'info' | 'quiz'>('info');
  
  // Quiz State
  const [quizStep, setQuizStep] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState({
      hasSalary: '',
      incomeType: '',
      period: ''
  });

  useEffect(() => {
      if (currentAccount && currentAccount.type !== 'freelance') {
          navigate('/dashboard');
      }
  }, [currentAccount, navigate]);

  useEffect(() => {
    const initData = async () => {
        if (!user || !currentAccount) return;
        setLoading(true);
        try {
            // Fetch Income (This Year)
            const stats = await getDashboardData(user.uid, currentAccount.id, 'year');
            setSystemIncome(stats.income);

            // Fetch WHT Documents (Invoices with WHT)
            const docs = await getDocuments(user.uid, currentAccount.id, 'invoice');
            const currentYear = new Date().getFullYear();
            
            const whtDocs = docs.filter(d => 
                d.withholdingTaxRate && 
                d.withholdingTaxRate > 0 &&
                new Date(d.issueDate).getFullYear() === currentYear
            );
            setSystemWhtDocs(whtDocs);

            const total = whtDocs.reduce((sum, d) => sum + ((d.subtotal * (d.withholdingTaxRate || 0)) / 100), 0);
            const received = whtDocs
                .filter(d => d.whtReceived)
                .reduce((sum, d) => sum + ((d.subtotal * (d.withholdingTaxRate || 0)) / 100), 0);
            
            setTotalWhtAmount(total);
            setReceivedWhtAmount(received);

        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };
    initData();
  }, [user, currentAccount]);

  // Calculate Tax Logic
  const taxResult = React.useMemo(() => {
      const totalDonation = deductions.donation + (deductions.donationDouble * 2);
      
      return calculatePersonalTax({
          totalIncome: systemIncome,
          expenseType: 'flat', // Defaulting to Flat 60% for assistant simplicity
          deductions: {
              socialSecurity: deductions.socialSecurity,
              lifeInsurance: deductions.lifeInsurance + deductions.healthInsurance, // Grouped
              providentFund: deductions.providentFund + deductions.rmf + deductions.ssf, // Grouped funds
              donation: totalDonation,
              other: deductions.homeInterest + deductions.other
          },
          whtAmount: totalWhtAmount
      });
  }, [systemIncome, deductions, totalWhtAmount]);

  const handleExport = () => {
      if (!currentAccount) return;
      exportTaxFilingExcel({
          account: currentAccount,
          formType,
          income: {
              amount: taxResult.totalIncome,
              expense: taxResult.expenseAmount,
              net: taxResult.totalIncome - taxResult.expenseAmount
          },
          deductions: deductions,
          whtList: systemWhtDocs,
          summary: {
              netIncome: taxResult.netIncome,
              tax: taxResult.taxBeforeWht,
              whtTotal: taxResult.whtCredit,
              taxToPay: taxResult.taxPayable
          }
      });
  };

  // Quiz Logic
  const resetQuiz = () => {
      setQuizStep(1);
      setQuizAnswers({ hasSalary: '', incomeType: '', period: '' });
  };

  const handleQuizAnswer = (key: keyof typeof quizAnswers, value: string) => {
      setQuizAnswers(prev => ({ ...prev, [key]: value }));
      setQuizStep(prev => prev + 1);
  };

  const getQuizRecommendation = () => {
      if (quizAnswers.hasSalary === 'yes') {
          return {
              form: 'pnd90',
              title: 'แนะนำยื่น ภ.ง.ด.90',
              desc: 'เนื่องจากคุณมีเงินเดือนประจำร่วมด้วย คุณต้องนำรายได้ทุกประเภทมารวมกันยื่นทีเดียวตอนสิ้นปี'
          };
      }
      
      if (quizAnswers.period === 'h1') { // First Half
           // Assuming freelancing income (40-8 or others) allowed for PND94
           return {
               form: 'pnd94',
               title: 'แนะนำยื่น ภ.ง.ด.94',
               desc: 'เป็นช่วงครึ่งปีแรก (ม.ค. - มิ.ย.) สำหรับผู้มีเงินได้ประเภท 40(5)-(8) เพื่อแบ่งเบาภาระภาษีปลายปี'
           };
      }
      
      return {
          form: 'pnd90',
          title: 'แนะนำยื่น ภ.ง.ด.90',
          desc: 'สำหรับการยื่นภาษีเงินได้ประจำปี (ม.ค. - ธ.ค.) รวมรายได้ทุกประเภท'
      };
  };

  if (!currentAccount) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <FileUp size={24} className="text-primary-600" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">ผู้ช่วยยื่นภาษี (Tax Filing Assistant)</h1>
                <p className="text-slate-500 text-sm">เตรียมข้อมูลและเอกสารสำหรับยื่นภาษีเงินได้บุคคลธรรมดา</p>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Main Content (Wizard) */}
            <div className="flex-1">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {['เลือกแบบฟอร์ม', 'ตรวจสอบรายได้', 'ค่าลดหย่อน', 'สรุปและส่งออก'].map((label, idx) => (
                            <div key={idx} className={`text-sm font-medium ${step > idx + 1 ? 'text-primary-600' : step === idx + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                                {label}
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary-600 transition-all duration-300 ease-out"
                            style={{ width: `${(step / 4) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* STEP 1: Select Form */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">ขั้นตอนที่ 1: เลือกแบบฟอร์มภาษี</h2>
                            <button 
                                onClick={() => {
                                    setHelperTab('info');
                                    setShowFormHelper(true);
                                }}
                                className="text-sm text-primary-600 font-medium hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                <HelpCircle size={16} /> ไม่แน่ใจ? ตัวช่วยเลือกแบบฟอร์ม
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className={`block p-5 rounded-xl border-2 cursor-pointer transition-all ${formType === 'pnd90' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-200'}`}>
                                <div className="flex items-start gap-4">
                                    <input type="radio" className="mt-1 w-4 h-4 text-primary-600" checked={formType === 'pnd90'} onChange={() => setFormType('pnd90')} />
                                    <div>
                                        <div className="font-bold text-lg text-slate-900">ภ.ง.ด.90 (ยื่นประจำปี)</div>
                                        <p className="text-slate-600 mt-1">สำหรับผู้มีเงินได้หลายประเภท หรือมีเงินได้ตามมาตรา 40(8) ยื่นช่วง ม.ค. - มี.ค. ของปีถัดไป</p>
                                    </div>
                                </div>
                            </label>
                            
                            <label className={`block p-5 rounded-xl border-2 cursor-pointer transition-all ${formType === 'pnd94' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-200'}`}>
                                <div className="flex items-start gap-4">
                                    <input type="radio" className="mt-1 w-4 h-4 text-primary-600" checked={formType === 'pnd94'} onChange={() => setFormType('pnd94')} />
                                    <div>
                                        <div className="font-bold text-lg text-slate-900">ภ.ง.ด.94 (ยื่นครึ่งปี)</div>
                                        <p className="text-slate-600 mt-1">สำหรับผู้มีเงินได้ตามมาตรา 40(5)-(8) ยื่นช่วง ก.ค. - ก.ย. ของปีปัจจุบัน เพื่อสรุปรายได้ครึ่งปีแรก</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2">
                                ถัดไป <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Review Income */}
                {step === 2 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">ขั้นตอนที่ 2: ตรวจสอบข้อมูลรายได้</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Wallet size={18} /> รายได้จากระบบ</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">รายได้รวมทั้งปี (ปีปัจจุบัน)</span>
                                        <span className="font-bold text-slate-900">฿{systemIncome.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">ประเภทเงินได้</span>
                                        <span className="text-slate-900">40(8) - เงินได้จากการธุรกิจ/พาณิชย์/อิสระ</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Receipt size={18} /> ภาษีหัก ณ ที่จ่าย</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">ยอดถูกหักภาษีรวม</span>
                                        <span className="font-bold text-slate-900">฿{totalWhtAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">จำนวนรายการ</span>
                                        <span className="text-slate-900">{systemWhtDocs.length} รายการ</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm items-center">
                                        <span className="text-slate-600">ได้รับหนังสือรับรอง (50 ทวิ) แล้ว</span>
                                        <span className={`font-bold ${receivedWhtAmount < totalWhtAmount ? 'text-amber-600' : 'text-green-600'}`}>
                                            {systemWhtDocs.filter(d => d.whtReceived).length} / {systemWhtDocs.length} ใบ
                                        </span>
                                    </div>
                                </div>
                                
                                {receivedWhtAmount < totalWhtAmount && (
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3 text-sm text-amber-800">
                                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">แจ้งเตือนเอกสารไม่ครบ</p>
                                            <p>คุณยังได้รับใบ 50 ทวิ ไม่ครบทุกรายการ ควรติดตามจากลูกค้าให้ครบก่อนยื่นภาษีจริง</p>
                                            <Link to="/withholding-tax" className="text-amber-700 underline mt-1 inline-block font-medium">
                                                ไปหน้าติดตามใบหักภาษี
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                                ย้อนกลับ
                            </button>
                            <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2">
                                ถัดไป <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Deductions */}
                {step === 3 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">ขั้นตอนที่ 3: กรอกค่าลดหย่อน</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 border-b pb-2">กลุ่มประกันและเงินออม</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ประกันสังคม (สูงสุด 9,000)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.socialSecurity} onChange={e => setDeductions({...deductions, socialSecurity: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เบี้ยประกันชีวิต (ทั่วไป + บำนาญ)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.lifeInsurance} onChange={e => setDeductions({...deductions, lifeInsurance: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เบี้ยประกันสุขภาพ</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.healthInsurance} onChange={e => setDeductions({...deductions, healthInsurance: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 border-b pb-2">กลุ่มกองทุน</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กองทุนสำรองเลี้ยงชีพ / กบข.</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.providentFund} onChange={e => setDeductions({...deductions, providentFund: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กองทุนรวมเพื่อการเลี้ยงชีพ (RMF)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.rmf} onChange={e => setDeductions({...deductions, rmf: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กองทุนรวมเพื่อการออม (SSF)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.ssf} onChange={e => setDeductions({...deductions, ssf: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                            
                             <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 border-b pb-2">กลุ่มบริจาค</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เงินบริจาคทั่วไป</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.donation} onChange={e => setDeductions({...deductions, donation: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เงินบริจาคการศึกษา/กีฬา (ลดหย่อน 2 เท่า)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.donationDouble} onChange={e => setDeductions({...deductions, donationDouble: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                             </div>

                             <div className="space-y-4">
                                <h3 className="font-bold text-slate-700 border-b pb-2">กลุ่มอื่นๆ</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ดอกเบี้ยเงินกู้ยืมเพื่อที่อยู่อาศัย</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.homeInterest} onChange={e => setDeductions({...deductions, homeInterest: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ค่าลดหย่อนอื่นๆ (เช่น ช้อปดีมีคืน)</label>
                                    <input 
                                        type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={deductions.other} onChange={e => setDeductions({...deductions, other: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                             </div>
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                                ย้อนกลับ
                            </button>
                            <button onClick={() => setStep(4)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2">
                                ถัดไป <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Summary */}
                {step === 4 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">ขั้นตอนที่ 4: สรุปและส่งออกข้อมูล</h2>
                        
                        <div className="bg-slate-800 rounded-xl p-6 text-white mb-6 shadow-lg">
                            <h3 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2">สรุปรายการภาษี (ประมาณการ)</h3>
                            <div className="space-y-3 text-sm sm:text-base">
                                <div className="flex justify-between">
                                    <span className="text-slate-300">เงินได้พึงประเมิน (40(8))</span>
                                    <span>{taxResult.totalIncome.toLocaleString()} บาท</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">หักค่าใช้จ่าย (เหมา 60%)</span>
                                    <span>-{taxResult.expenseAmount.toLocaleString()} บาท</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-300">หักค่าลดหย่อนรวม</span>
                                    <span>-{taxResult.totalDeductions.toLocaleString()} บาท</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-600">
                                    <span>เงินได้สุทธิ</span>
                                    <span>{taxResult.netIncome.toLocaleString()} บาท</span>
                                </div>
                                
                                <div className="py-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-300">ภาษีที่คำนวณได้</span>
                                        <span className="text-white font-semibold">{taxResult.taxBeforeWht.toLocaleString()} บาท</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-300">เครดิตภาษีหัก ณ ที่จ่าย</span>
                                        <span className="text-green-400 font-semibold">-{taxResult.whtCredit.toLocaleString()} บาท</span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-lg flex justify-between items-center ${taxResult.taxPayable > 0 ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
                                    <span className="font-bold text-lg">
                                        {taxResult.taxPayable > 0 ? "ภาษีที่ต้องชำระเพิ่ม" : "ภาษีที่ชำระไว้เกิน (ขอคืนได้)"}
                                    </span>
                                    <span className={`text-3xl font-bold ${taxResult.taxPayable > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {Math.abs(taxResult.taxPayable).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={handleExport}
                                className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl flex flex-col items-center gap-2 transition-all group text-center"
                            >
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Download size={24} className="text-green-600" />
                                </div>
                                <span className="font-bold text-green-800">Export Excel สำหรับกรอกข้อมูล</span>
                                <span className="text-xs text-green-700">ดาวน์โหลดไฟล์ Excel ที่มีข้อมูลครบถ้วนเพื่อนำไปกรอกในเว็บสรรพากร</span>
                            </button>

                            <button 
                                onClick={() => setShowGuide(true)}
                                className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex flex-col items-center gap-2 transition-all group text-center"
                            >
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <BookOpen size={24} className="text-blue-600" />
                                </div>
                                <span className="font-bold text-blue-800">ดูวิธียื่นภาษีออนไลน์</span>
                                <span className="text-xs text-blue-700">คู่มือ Step-by-step พร้อมภาพประกอบการใช้งานเว็บไซต์สรรพากร</span>
                            </button>
                        </div>

                        <div className="mt-8 flex justify-start">
                             <button onClick={() => setStep(3)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                                ย้อนกลับ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Sidebar (Helper Tools) */}
            <div className="lg:w-80 space-y-6">
                {/* Checklist */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-primary-600" /> เช็คลิสต์ก่อนยื่น
                    </h3>
                    <div className="space-y-3">
                        <CheckItem label="ได้รับใบ 50 ทวิ ครบถ้วน" checked={receivedWhtAmount >= totalWhtAmount && totalWhtAmount > 0} />
                        <CheckItem label="หนังสือรับรองเบี้ยประกัน" checked={deductions.lifeInsurance > 0 || deductions.healthInsurance > 0} manual />
                        <CheckItem label="หนังสือรับรองกองทุน (RMF/SSF)" checked={deductions.rmf > 0 || deductions.ssf > 0} manual />
                        <CheckItem label="ใบเสร็จเงินบริจาค (e-Donation)" checked={deductions.donation > 0} manual />
                    </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-primary-600" /> กำหนดยื่นภาษี
                    </h3>
                    <div className="space-y-4 relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                        <TimelineItem date="31 มี.ค." label="ภ.ง.ด.90/91 (ยื่นกระดาษ)" />
                        <TimelineItem date="8 เม.ย." label="ภ.ง.ด.90/91 (ยื่นออนไลน์)" highlight />
                        <TimelineItem date="30 ก.ย." label="ภ.ง.ด.94 (ครึ่งปี)" />
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500">
                    <p className="font-bold mb-1 text-slate-600">ข้อควรระวัง</p>
                    ข้อมูลภาษีที่คำนวณเป็นการประมาณการเบื้องต้นเท่านั้น กรุณาตรวจสอบความถูกต้องก่อนยื่นแบบจริง หากไม่แน่ใจควรปรึกษานักบัญชีหรือสรรพากร
                </div>
            </div>
        </div>

        {/* Guide Modal */}
        {showGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg">วิธียื่นภาษีออนไลน์ (ภ.ง.ด.90)</h3>
                        <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={24} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <GuideStep number={1} title="เข้าสู่ระบบ E-Filing">
                            <p>ไปที่เว็บไซต์กรมสรรพากร <a href="https://efiling.rd.go.th" target="_blank" rel="noreferrer" className="text-blue-600 underline">efiling.rd.go.th</a> และกดปุ่ม "ยื่นแบบออนไลน์"</p>
                            <div className="mt-3 aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                                <span className="text-sm">[ภาพประกอบหน้าเว็บสรรพากร]</span>
                            </div>
                        </GuideStep>
                        <GuideStep number={2} title="เลือกแบบ ภ.ง.ด.90">
                            <p>หลังจากเข้าสู่ระบบ เลือกเมนู "ยื่นแบบ ภ.ง.ด.90/91" สำหรับภาษีประจำปี</p>
                        </GuideStep>
                        <GuideStep number={3} title="กรอกข้อมูลรายได้ (สำคัญ!)">
                            <p>ในหน้า "บันทึกเงินได้" ให้เลือก <strong>มาตรา 40(8)</strong> สำหรับฟรีแลนซ์/รับจ้างทั่วไป</p>
                            <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="font-bold text-yellow-800">ข้อมูลจากระบบของคุณ:</p>
                                <p className="text-sm mt-1">เงินได้ทั้งหมด: <strong>{taxResult.totalIncome.toLocaleString()}</strong> บาท</p>
                                <p className="text-sm">หักค่าใช้จ่าย: <strong>เหมา 60%</strong></p>
                                <p className="text-sm">ภาษีหัก ณ ที่จ่าย: <strong>{taxResult.whtCredit.toLocaleString()}</strong> บาท</p>
                            </div>
                        </GuideStep>
                        <GuideStep number={4} title="กรอกค่าลดหย่อน">
                            <p>กรอกข้อมูลค่าลดหย่อนตามจริงที่คุณมี (ประกันสังคม, ประกันชีวิต ฯลฯ) ตามที่เตรียมไว้ใน Excel</p>
                        </GuideStep>
                        <GuideStep number={5} title="ตรวจสอบและยืนยัน">
                            <p>ตรวจสอบยอดภาษีที่ต้องชำระ หรือ ยอดที่จะได้รับคืน หากถูกต้องให้กดยืนยันการยื่นแบบ</p>
                        </GuideStep>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end">
                        <button onClick={() => setShowGuide(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900">
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Form Helper Modal */}
        {showFormHelper && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                    <div className="flex border-b border-slate-200">
                        <button 
                            onClick={() => setHelperTab('info')}
                            className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${helperTab === 'info' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={18} /> ข้อมูลเปรียบเทียบ
                        </button>
                        <button 
                            onClick={() => {
                                setHelperTab('quiz');
                                resetQuiz();
                            }}
                            className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${helperTab === 'quiz' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Lightbulb size={18} /> แบบทดสอบช่วยเลือก
                        </button>
                        <button 
                            onClick={() => setShowFormHelper(false)}
                            className="px-4 border-l border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                        {helperTab === 'info' ? (
                            <div className="space-y-8">
                                {/* ภ.ง.ด.90 */}
                                <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                                    <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex justify-between items-center">
                                        <h3 className="font-bold text-green-800">ภ.ง.ด.90 (ยื่นประจำปี)</h3>
                                        <span className="text-xs font-medium bg-white text-green-700 px-2 py-1 rounded border border-green-200">สำหรับคนที่มีรายได้หลายประเภท</span>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <strong className="text-slate-900 block mb-1">ยื่นเมื่อไหร่:</strong>
                                            <p className="text-slate-600 text-sm">มกราคม - มีนาคม ของปีถัดไป (ยื่นออนไลน์ได้ถึง 8 เมษายน)</p>
                                        </div>
                                        
                                        <div>
                                            <strong className="text-slate-900 block mb-2">เหมาะสำหรับ:</strong>
                                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                                <li>มีเงินเดือนประจำ + รับงานฟรีแลนซ์</li>
                                                <li>มีรายได้จากหลายแหล่ง</li>
                                                <li>มีรายได้จากการลงทุน (เงินปันผล, ดอกเบี้ย)</li>
                                                <li>มีรายได้จากการขายของออนไลน์ / ค่าเช่า</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <strong className="text-slate-900 block mb-2">ประเภทเงินได้ที่รวม:</strong>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-50 p-1.5 rounded border">40(1) เงินเดือน</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(2) ค่านายหน้า/ฟรีแลนซ์</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(3) ค่าลิขสิทธิ์</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(4) ดอกเบี้ย/ปันผล</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(5) ค่าเช่า</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(6) วิชาชีพอิสระ</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(7) รับเหมา</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(8) ธุรกิจ/อื่นๆ</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ภ.ง.ด.94 */}
                                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                                    <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                                        <h3 className="font-bold text-blue-800">ภ.ง.ด.94 (ยื่นครึ่งปี)</h3>
                                        <span className="text-xs font-medium bg-white text-blue-700 px-2 py-1 rounded border border-blue-200">สำหรับฟรีแลนซ์ที่มีรายได้บางประเภท</span>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <strong className="text-slate-900 block mb-1">ยื่นเมื่อไหร่:</strong>
                                            <p className="text-slate-600 text-sm">กรกฎาคม - กันยายน (สรุปรายได้ครึ่งปีแรก ม.ค. - มิ.ย.)</p>
                                        </div>
                                        
                                        <div>
                                            <strong className="text-slate-900 block mb-2">เหมาะสำหรับ:</strong>
                                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                                <li>ฟรีแลนซ์ที่ไม่มีเงินเดือนประจำ</li>
                                                <li>มีรายได้เฉพาะจากการรับงาน / ค้าขาย</li>
                                                <li>ต้องการผ่อนจ่ายภาษีเป็น 2 งวด</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <strong className="text-slate-900 block mb-2">ประเภทเงินได้ที่รวม:</strong>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-50 p-1.5 rounded border">40(5) ค่าเช่า</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(6) วิชาชีพอิสระ</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(7) รับเหมา</span>
                                                <span className="bg-slate-50 p-1.5 rounded border">40(8) ธุรกิจ/อื่นๆ</span>
                                            </div>
                                        </div>

                                        <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 flex gap-2 items-start">
                                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                            <p>ถ้ายื่น ภ.ง.ด.94 แล้ว <strong>ยังต้องยื่น ภ.ง.ด.90 ตอนสิ้นปีด้วย</strong> โดยนำภาษีที่จ่ายไปแล้วมาหักออก</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ภ.ง.ด.91 */}
                                <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 opacity-70">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-slate-700">ภ.ง.ด.91 (สำหรับมนุษย์เงินเดือน)</h3>
                                        <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">ไม่เหมาะกับฟรีแลนซ์</span>
                                    </div>
                                    <p className="text-sm text-slate-600">เฉพาะคนที่มีรายได้จากเงินเดือนอย่างเดียว (40(1)) ไม่มีรายได้อื่น หากคุณรับงานฟรีแลนซ์ด้วย ห้ามใช้แบบนี้</p>
                                </div>

                                {/* Comparison Table */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">รายละเอียด</th>
                                                <th className="px-4 py-3 text-green-700">ภ.ง.ด.90</th>
                                                <th className="px-4 py-3 text-blue-700">ภ.ง.ด.94</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">ยื่นเมื่อไหร่</td>
                                                <td className="px-4 py-3">ม.ค. - มี.ค.</td>
                                                <td className="px-4 py-3">ก.ค. - ก.ย.</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">ช่วงเวลารายได้</td>
                                                <td className="px-4 py-3">ทั้งปี (ม.ค. - ธ.ค.)</td>
                                                <td className="px-4 py-3">ครึ่งปีแรก (ม.ค. - มิ.ย.)</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">มีเงินเดือนประจำ</td>
                                                <td className="px-4 py-3 text-green-600 font-bold">✓ ใช้ได้</td>
                                                <td className="px-4 py-3 text-red-500 font-bold">✗ ใช้ไม่ได้</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">ฟรีแลนซ์อย่างเดียว</td>
                                                <td className="px-4 py-3 text-green-600 font-bold">✓ ใช้ได้</td>
                                                <td className="px-4 py-3 text-green-600 font-bold">✓ ใช้ได้</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium text-slate-600">การจ่ายภาษี</td>
                                                <td className="px-4 py-3">จ่ายทีเดียว (สรุปจบ)</td>
                                                <td className="px-4 py-3">แบ่งจ่าย 2 งวด</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Tips */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                                        <div className="text-2xl mb-2">💡</div>
                                        <h4 className="font-bold text-yellow-800 text-sm mb-1">ทำไมต้องยื่น 94?</h4>
                                        <p className="text-xs text-yellow-700">ช่วยกระจายภาระภาษี ไม่ให้หนักเกินไปตอนสิ้นปี เหมือนการผ่อนจ่าย</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                                        <div className="text-2xl mb-2">⚠️</div>
                                        <h4 className="font-bold text-red-800 text-sm mb-1">อย่าลืมยื่น 90!</h4>
                                        <p className="text-xs text-red-700">แม้จะยื่น 94 แล้ว สิ้นปีก็ต้องยื่น 90 เพื่อสรุปยอดรวมอีกครั้ง</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                        <div className="text-2xl mb-2">📱</div>
                                        <h4 className="font-bold text-blue-800 text-sm mb-1">ยื่นออนไลน์</h4>
                                        <p className="text-xs text-blue-700">ได้เวลาเพิ่ม 8 วัน และได้เงินคืนภาษีเร็วกว่ายื่นกระดาษ</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
                                    {quizStep === 1 && (
                                        <div className="w-full animate-in fade-in slide-in-from-right-8">
                                            <h3 className="text-xl font-bold text-center mb-6 text-slate-800">1. คุณมีเงินเดือนประจำด้วยหรือไม่?</h3>
                                            <div className="space-y-3">
                                                <button 
                                                    onClick={() => handleQuizAnswer('hasSalary', 'yes')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">มี</span>
                                                    <span className="text-sm text-slate-500">ทำงานประจำ รับเงินเดือน มีประกันสังคม ม.33</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleQuizAnswer('hasSalary', 'no')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">ไม่มี</span>
                                                    <span className="text-sm text-slate-500">เป็นฟรีแลนซ์เต็มตัว หรือค้าขายอิสระ</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {quizStep === 2 && (
                                        <div className="w-full animate-in fade-in slide-in-from-right-8">
                                            <h3 className="text-xl font-bold text-center mb-6 text-slate-800">2. รายได้ฟรีแลนซ์ของคุณเป็นประเภทไหน?</h3>
                                            <div className="space-y-3">
                                                <button 
                                                    onClick={() => handleQuizAnswer('incomeType', '40-8')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">รับจ้างทั่วไป / ธุรกิจ</span>
                                                    <span className="text-sm text-slate-500">ถ่ายภาพ, ออกแบบ, เขียนโปรแกรม, ขายของ (40(8))</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleQuizAnswer('incomeType', '40-6')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">วิชาชีพอิสระ</span>
                                                    <span className="text-sm text-slate-500">แพทย์, ทนายความ, บัญชี, สถาปนิก (40(6))</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleQuizAnswer('incomeType', '40-7')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">รับเหมา</span>
                                                    <span className="text-sm text-slate-500">รับเหมาก่อสร้าง, รับเหมาแรงงาน+ของ (40(7))</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleQuizAnswer('incomeType', 'mixed')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">หลายประเภท / ไม่แน่ใจ</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {quizStep === 3 && (
                                        <div className="w-full animate-in fade-in slide-in-from-right-8">
                                            <h3 className="text-xl font-bold text-center mb-6 text-slate-800">3. ตอนนี้เป็นช่วงเวลาไหน?</h3>
                                            <div className="space-y-3">
                                                <button 
                                                    onClick={() => handleQuizAnswer('period', 'h1')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">ครึ่งปีแรก (ม.ค. - มิ.ย.)</span>
                                                    <span className="text-sm text-slate-500">อยู่ในช่วง กรกฎาคม - กันยายน</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleQuizAnswer('period', 'h2')}
                                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left font-medium text-slate-700 group"
                                                >
                                                    <span className="font-bold text-lg block mb-1 group-hover:text-primary-700">สิ้นปี / ต้นปีถัดไป</span>
                                                    <span className="text-sm text-slate-500">อยู่ในช่วง มกราคม - มีนาคม</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {quizStep === 4 && (
                                        <div className="w-full animate-in zoom-in-95 bg-white p-6 rounded-2xl border-2 border-primary-100 shadow-lg text-center">
                                            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Check size={32} />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                                {getQuizRecommendation().title}
                                            </h3>
                                            <p className="text-slate-600 mb-6">
                                                {getQuizRecommendation().desc}
                                            </p>

                                            <div className="flex flex-col gap-3">
                                                <button 
                                                    onClick={() => {
                                                        setFormType(getQuizRecommendation().form as any);
                                                        setShowFormHelper(false);
                                                    }}
                                                    className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:-translate-y-0.5 transition-all"
                                                >
                                                    เลือกแบบฟอร์มนี้
                                                </button>
                                                <button 
                                                    onClick={resetQuiz}
                                                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                                >
                                                    ทำแบบทดสอบใหม่
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {quizStep < 4 && (
                                    <div className="flex justify-center pb-6">
                                        <div className="flex gap-2">
                                            {[1, 2, 3].map(s => (
                                                <div key={s} className={`w-2 h-2 rounded-full ${s === quizStep ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

// Helper Components
const CheckItem: React.FC<{ label: string; checked: boolean; manual?: boolean }> = ({ label, checked, manual }) => (
    <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${checked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'}`}>
            <CheckCircle2 size={14} />
        </div>
        <div className="flex-1">
            <p className={`text-sm ${checked ? 'text-slate-700' : 'text-slate-500'}`}>{label}</p>
            {manual && !checked && <p className="text-[10px] text-slate-400">(ตรวจสอบเอกสารของท่าน)</p>}
        </div>
    </div>
);

const TimelineItem: React.FC<{ date: string; label: string; highlight?: boolean }> = ({ date, label, highlight }) => (
    <div className="flex gap-4 items-center relative z-10">
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${highlight ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}></div>
        <div>
            <p className={`text-xs font-bold ${highlight ? 'text-primary-700' : 'text-slate-500'}`}>{date}</p>
            <p className="text-sm text-slate-700">{label}</p>
        </div>
    </div>
);

const GuideStep: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0 text-lg">
            {number}
        </div>
        <div className="flex-1 pt-1">
            <h4 className="font-bold text-lg text-slate-800 mb-2">{title}</h4>
            <div className="text-slate-600 text-sm leading-relaxed">
                {children}
            </div>
        </div>
    </div>
);

export default TaxFilingPage;
