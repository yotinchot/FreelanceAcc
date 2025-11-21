
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { getDashboardData } from '../services/reportService';
import { getDocuments } from '../services/documentService';
import { 
    calculatePersonalTax, calculateVatInfo, 
    compareExpenseMethods, analyzeTaxBracket, simulateJobImpact
} from '../services/taxService';
import { 
    Calculator, Info, AlertCircle, TrendingUp, Wallet, 
    CheckCircle2, AlertTriangle,
    Play, Scale, TrendingDown, FileText, ChevronDown
} from 'lucide-react';

const TaxPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calculator' | 'planning'>('calculator');

  // System Data
  const [systemIncome, setSystemIncome] = useState(0);
  const [systemWht, setSystemWht] = useState(0);

  // --- FORMS ---

  // 1. Calculator Form
  const [calcForm, setCalcForm] = useState({
      otherIncome: 0,
      expenseType: 'flat' as 'flat' | 'actual',
      actualExpenseOverride: 0, 
      socialSecurity: 0,
      lifeInsurance: 0,
      providentFund: 0,
      donation: 0,
      other: 0
  });

  // 3. Planning (Simulator) Form
  const [simForm, setSimForm] = useState({
      additionalIncome: 0
  });

  // Tax Brackets Definition
  const taxBrackets = [
      { min: 0, max: 150000, label: '0 - 150,000', rateLabel: 'ยกเว้น' },
      { min: 150001, max: 300000, label: '150,001 - 300,000', rateLabel: '5%' },
      { min: 300001, max: 500000, label: '300,001 - 500,000', rateLabel: '10%' },
      { min: 500001, max: 750000, label: '500,001 - 750,000', rateLabel: '15%' },
      { min: 750001, max: 1000000, label: '750,001 - 1,000,000', rateLabel: '20%' },
      { min: 1000001, max: 2000000, label: '1,000,001 - 2,000,000', rateLabel: '25%' },
      { min: 2000001, max: 5000000, label: '2,000,001 - 5,000,000', rateLabel: '30%' },
      { min: 5000001, max: Infinity, label: '5,000,001 ขึ้นไป', rateLabel: '35%' }
  ];

  // Load Data
  useEffect(() => {
    const initData = async () => {
        if (!user || !currentAccount) return;
        setLoading(true);
        try {
            const stats = await getDashboardData(user.uid, currentAccount.id, 'year');
            setSystemIncome(stats.income);
            setCalcForm(prev => ({ ...prev, actualExpenseOverride: stats.expense }));

            if (currentAccount.type === 'freelance') {
                const docs = await getDocuments(user.uid, currentAccount.id, 'invoice');
                const whtTotal = docs
                    .filter(d => d.whtReceived && new Date(d.issueDate).getFullYear() === new Date().getFullYear())
                    .reduce((sum, d) => sum + ((d.subtotal * (d.withholdingTaxRate || 0)) / 100), 0);
                setSystemWht(whtTotal);
            }
        } catch (error) {
            console.error("Error loading tax data", error);
        } finally {
            setLoading(false);
        }
    };
    initData();
  }, [user, currentAccount]);

  // --- CALCULATIONS ---

  const totalIncome = systemIncome + calcForm.otherIncome;

  // Comparison Logic
  const comparison = useMemo(() => {
      const totalDeductionsForCompare = 
        60000 + 
        Math.min(calcForm.socialSecurity, 9000) + 
        Math.min(calcForm.lifeInsurance, 100000) + 
        calcForm.providentFund + 
        calcForm.other; 

      return compareExpenseMethods(
          totalIncome, 
          calcForm.actualExpenseOverride, 
          totalDeductionsForCompare
      );
  }, [totalIncome, calcForm.actualExpenseOverride, calcForm.socialSecurity, calcForm.lifeInsurance, calcForm.providentFund, calcForm.other]);


  // Tax Result
  const personalTax = useMemo(() => {
    return calculatePersonalTax({
        totalIncome: totalIncome,
        expenseType: calcForm.expenseType,
        actualExpense: calcForm.actualExpenseOverride,
        deductions: {
            socialSecurity: calcForm.socialSecurity,
            lifeInsurance: calcForm.lifeInsurance,
            providentFund: calcForm.providentFund,
            donation: calcForm.donation,
            other: calcForm.other
        },
        whtAmount: systemWht
    });
  }, [totalIncome, calcForm.expenseType, calcForm.actualExpenseOverride, calcForm.socialSecurity, calcForm.lifeInsurance, calcForm.providentFund, calcForm.donation, calcForm.other, systemWht]);

  const bracketAnalysis = useMemo(() => {
      return analyzeTaxBracket(personalTax.netIncome);
  }, [personalTax.netIncome]);

  const simulation = useMemo(() => {
      if (simForm.additionalIncome <= 0) return null;
      return simulateJobImpact(
          totalIncome, 
          personalTax.totalDeductions, 
          simForm.additionalIncome
      );
  }, [totalIncome, personalTax.totalDeductions, simForm.additionalIncome]);

  const vatInfo = useMemo(() => {
      return calculateVatInfo(totalIncome);
  }, [totalIncome]);


  if (!currentAccount) return null;

  if (currentAccount.type !== 'freelance') {
      return (
          <div className="container mx-auto px-4 py-8 text-center">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                  <Info className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <h2 className="text-xl font-bold text-slate-800">สำหรับบัญชีบริษัท/นิติบุคคล</h2>
                  <p className="text-slate-500 mt-2">ฟีเจอร์คำนวณภาษีนิติบุคคลกำลังอยู่ระหว่างการพัฒนา</p>
              </div>
          </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <Calculator size={24} className="text-primary-600" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดการภาษี (Tax Manager)</h1>
                <p className="text-slate-500 text-sm">คำนวณและวางแผนภาษีเงินได้บุคคลธรรมดา</p>
            </div>
        </div>
        
        {/* Main Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
            <button 
                onClick={() => setActiveTab('calculator')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'calculator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                คำนวณภาษี (Calculator)
            </button>
            <button 
                onClick={() => setActiveTab('planning')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planning' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                เครื่องมือวางแผน (Planning)
            </button>
        </div>

        {/* Tab 1: Calculator */}
        {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                <div className="lg:col-span-2 space-y-6">
                     {/* Disclaimer */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 text-sm text-blue-800">
                        <Info size={18} className="shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">คำเตือน:</span> การคำนวณนี้เป็นการประมาณการเบื้องต้น เพื่อช่วยวางแผนเท่านั้น กรุณาตรวจสอบความถูกต้องกับสรรพากรหรือผู้เชี่ยวชาญก่อนยื่นแบบจริง
                        </div>
                    </div>

                    {/* Section 1: Income */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={18} className="text-primary-600" /> รายได้ (Income)
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600 text-sm font-medium">รายได้จากระบบ</span>
                                <span className="font-bold text-slate-900">฿{systemIncome.toLocaleString()}</span>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">รายได้อื่นๆ (นอกระบบ)</label>
                                <input 
                                    type="number" 
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium text-slate-900"
                                    value={calcForm.otherIncome || ''}
                                    onChange={e => setCalcForm({...calcForm, otherIncome: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between font-bold text-lg text-primary-700 bg-primary-50/30 p-3 rounded-lg border border-primary-100">
                                <span>รวมรายได้พึงประเมิน</span>
                                <span>฿{totalIncome.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Expenses */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                            <Wallet size={18} className="text-primary-600" /> หักค่าใช้จ่าย (Expenses)
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex p-1 bg-slate-100 rounded-lg">
                                <button 
                                    onClick={() => setCalcForm({...calcForm, expenseType: 'flat'})}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${calcForm.expenseType === 'flat' ? 'bg-white text-primary-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    หักเหมา 60%
                                </button>
                                <button 
                                    onClick={() => setCalcForm({...calcForm, expenseType: 'actual'})}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${calcForm.expenseType === 'actual' ? 'bg-white text-primary-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    หักตามจริง
                                </button>
                            </div>

                            {calcForm.expenseType === 'flat' ? (
                                <div className="text-center py-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-slate-600 text-sm mb-1">หักค่าใช้จ่ายเหมา 60% ได้สูงสุด 600,000 บาท</p>
                                    <p className="text-xl font-bold text-slate-900">฿{Math.min(totalIncome * 0.6, 600000).toLocaleString()}</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ค่าใช้จ่ายจริง (ต้องมีหลักฐาน)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium text-slate-900"
                                        value={calcForm.actualExpenseOverride || ''}
                                        onChange={e => setCalcForm({...calcForm, actualExpenseOverride: parseFloat(e.target.value) || 0})}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">ระบบดึงยอดรายจ่ายจากหน้า "รายจ่าย" มาให้ สามารถแก้ไขได้</p>
                                </div>
                            )}
                            
                            {/* Logic Comparison */}
                            {!comparison.flatRateIsBetter && calcForm.expenseType === 'flat' && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3 text-sm text-amber-800">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold">แนะนำ:</span> ยื่นแบบ "หักตามจริง" อาจประหยัดภาษีได้มากกว่า (ประหยัดได้ประมาณ ฿{comparison.savings.toLocaleString()}) 
                                        <button 
                                            onClick={() => setCalcForm({...calcForm, expenseType: 'actual'})}
                                            className="text-amber-700 underline ml-1 font-medium"
                                        >
                                            เปลี่ยนเป็นหักตามจริง
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                     {/* Section 3: Deductions */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={18} className="text-primary-600" /> ค่าลดหย่อน (Deductions)
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ผู้มีเงินได้ (ส่วนตัว)</label>
                                    <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm font-medium">
                                        ฿60,000
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">ประกันสังคม (สูงสุด 9,000)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium text-slate-900"
                                        value={calcForm.socialSecurity || ''}
                                        onChange={e => setCalcForm({...calcForm, socialSecurity: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">เบี้ยประกันชีวิต/สุขภาพ</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium text-slate-900"
                                        value={calcForm.lifeInsurance || ''}
                                        onChange={e => setCalcForm({...calcForm, lifeInsurance: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">กองทุนสำรอง/RMF/SSF</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium text-slate-900"
                                        value={calcForm.providentFund || ''}
                                        onChange={e => setCalcForm({...calcForm, providentFund: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">เงินบริจาค</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium text-slate-900"
                                        value={calcForm.donation || ''}
                                        onChange={e => setCalcForm({...calcForm, donation: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">อื่นๆ (ดอกเบี้ยบ้าน, ช้อปดีมีคืน)</label>
                                    <input 
                                        type="number" 
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium text-slate-900"
                                        value={calcForm.other || ''}
                                        onChange={e => setCalcForm({...calcForm, other: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Result Summary */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Tax Card - Refactored for high contrast */}
                    <div className="bg-white rounded-xl p-6 border-2 border-primary-600 shadow-xl">
                        <h3 className="font-bold text-lg mb-4 border-b border-slate-100 pb-2 text-slate-900">สรุปภาษีที่ต้องชำระ</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 font-medium">เงินได้สุทธิ</span>
                                <span className="text-slate-900 font-bold">{personalTax.netIncome.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 font-medium">ภาษีที่คำนวณได้</span>
                                <span className="text-slate-900 font-bold">{personalTax.taxBeforeWht.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600 font-medium">หัก ณ ที่จ่าย (มีแล้ว)</span>
                                <span className="text-green-600 font-bold">-{systemWht.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg border-t-4 ${personalTax.taxPayable > 0 ? 'bg-red-50 border-red-400' : 'bg-green-50 border-green-400'} text-center shadow-sm`}>
                            <p className={`text-sm font-bold mb-1 uppercase ${personalTax.taxPayable > 0 ? 'text-red-800' : 'text-green-800'}`}>
                                {personalTax.taxPayable > 0 ? 'ต้องชำระเพิ่ม' : 'ได้รับเงินคืน'}
                            </p>
                            <p className={`text-3xl font-extrabold ${personalTax.taxPayable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {Math.abs(personalTax.taxPayable).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>

                    {/* Tax Bracket Info */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                         <h4 className="font-bold text-slate-800 mb-3 text-sm">ฐานภาษีปัจจุบันของคุณ</h4>
                         <div className="flex items-center gap-3 mb-4">
                             <div className="text-3xl font-bold text-primary-600">{bracketAnalysis.currentBracket.rate}%</div>
                             <div className="text-xs text-slate-500">
                                 ช่วงเงินได้สุทธิ: <br/> 
                                 {bracketAnalysis.currentBracket.min.toLocaleString()} - {bracketAnalysis.currentBracket.max === Infinity ? 'ขึ้นไป' : bracketAnalysis.currentBracket.max.toLocaleString()}
                             </div>
                         </div>
                         
                         {bracketAnalysis.isClose && (
                             <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                                 ⚠️ อีก {Math.round(bracketAnalysis.incomeToNext || 0).toLocaleString()} บาท จะเสียภาษีฐาน {bracketAnalysis.nextBracket?.rate}%
                             </div>
                         )}
                    </div>

                    {/* VAT Alert */}
                    <div className={`rounded-xl border shadow-sm p-5 ${vatInfo.status === 'danger' ? 'bg-red-50 border-red-200' : vatInfo.status === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                         <h4 className={`font-bold mb-2 text-sm ${vatInfo.status === 'danger' ? 'text-red-800' : vatInfo.status === 'warning' ? 'text-amber-800' : 'text-slate-800'}`}>
                            สถานะจดทะเบียน VAT
                         </h4>
                         <div className="mb-2">
                             <div className="flex justify-between text-xs mb-1">
                                 <span>รายได้สะสม</span>
                                 <span>{vatInfo.yearlyIncome.toLocaleString()} / 1.8 ล้าน</span>
                             </div>
                             <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full ${vatInfo.status === 'danger' ? 'bg-red-500' : vatInfo.status === 'warning' ? 'bg-amber-500' : 'bg-green-500'}`}
                                    style={{ width: `${vatInfo.percent}%` }}
                                 ></div>
                             </div>
                         </div>
                         <p className="text-xs text-slate-500">
                             {vatInfo.status === 'danger' 
                                ? 'รายได้เกิน 1.8 ล้านแล้ว! ต้องจด VAT ภายใน 30 วัน' 
                                : vatInfo.status === 'warning'
                                ? `เหลืออีก ${vatInfo.remaining.toLocaleString()} บาท จะต้องจด VAT`
                                : 'ยังไม่ถึงเกณฑ์จดทะเบียนภาษีมูลค่าเพิ่ม'}
                         </p>
                    </div>
                </div>
            </div>
        )}

        {/* Tab 2: Planning (Simulator) */}
        {activeTab === 'planning' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8 animate-in fade-in duration-300">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 text-center">จำลองการรับงานเพิ่ม (Simulator)</h2>
                    <p className="text-center text-slate-500 mb-8">คำนวณว่าถ้ารับงานเพิ่ม จะเสียภาษีเพิ่มเท่าไหร่ และคุ้มค่าหรือไม่</p>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
                        <label className="block text-sm font-bold text-slate-700 mb-2">ยอดรายได้ที่จะรับเพิ่ม (บาท)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold text-slate-900"
                                placeholder="เช่น 50000"
                                value={simForm.additionalIncome || ''}
                                onChange={e => setSimForm({...simForm, additionalIncome: parseFloat(e.target.value) || 0})}
                            />
                            <div className="absolute right-4 top-3.5 text-slate-400 font-medium">THB</div>
                        </div>
                    </div>

                    {simulation && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">ภาษีที่ต้องจ่ายเพิ่ม</p>
                                    <p className="text-xl font-bold text-red-500">฿{simulation.additionalTax.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                </div>
                                <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-sm">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">รายได้สุทธิที่เหลือจริง</p>
                                    <p className="text-xl font-bold text-green-600">฿{simulation.netGain.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                                </div>
                            </div>

                            <div className={`p-6 rounded-xl border text-center ${simulation.shouldAccept ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${simulation.shouldAccept ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {simulation.shouldAccept ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                                </div>
                                <h3 className={`text-lg font-bold mb-2 ${simulation.shouldAccept ? 'text-green-800' : 'text-amber-800'}`}>
                                    {simulation.shouldAccept ? 'คุ้มค่าที่จะรับงาน' : 'ภาษีเริ่มสูง พิจารณาให้ดี'}
                                </h3>
                                <p className="text-slate-600">
                                    จากรายได้ {simForm.additionalIncome.toLocaleString()} บาท คุณจะเหลือเงินจริงคิดเป็น <span className="font-bold">{simulation.netGainPercentage.toFixed(1)}%</span> (เสียภาษีส่วนเพิ่มไปประมาณ { (100 - simulation.netGainPercentage).toFixed(1)}%)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default TaxPage;
