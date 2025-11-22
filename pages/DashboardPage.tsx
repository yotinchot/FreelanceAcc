
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { Link } from 'react-router-dom';
import { 
    TrendingUp, TrendingDown, Wallet, Download, 
    Loader2, Calendar, FileText, ArrowRight, AlertCircle, CheckCircle2,
    Receipt, BadgeCheck, Files
} from 'lucide-react';
import { getDashboardData, exportDashboardReport, DashboardData, DateRange } from '../services/reportService';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('year'); 
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
        if (!user || !currentAccount) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getDashboardData(user.uid, currentAccount.id, range);
            setData(result);
        } catch (e: any) {
            console.error("Dashboard load error:", e);
            let msg = "เกิดข้อผิดพลาด";
            if (e instanceof Error) {
                msg = e.message;
            } else if (typeof e === 'object' && e !== null) {
                // Use JSON.stringify for objects to avoid [object Object]
                msg = e.message || e.error_description || JSON.stringify(e);
            } else {
                msg = String(e);
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [user, currentAccount, range]);

  const handleExport = () => {
      if (data) {
          exportDashboardReport(data, range);
      }
  };

  if (loading) {
      return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div>;
  }

  if (error) {
      return (
          <div className="container mx-auto px-4 py-20 text-center">
              <div className="bg-red-50 p-8 rounded-xl border border-red-200 inline-block max-w-lg">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-red-800 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
                  <p className="text-red-600 text-sm break-words font-mono bg-white/50 p-2 rounded overflow-auto max-h-[200px]">{error}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium">
                      ลองใหม่
                  </button>
              </div>
          </div>
      );
  }

  const todos = data?.todo;
  const allClear = todos && todos.overdueInvoices.length === 0 && todos.dueSoonInvoices.length === 0 && todos.pendingWht === 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard ภาพรวม</h1>
          <p className="text-slate-500 mt-1">บัญชี: <span className="font-semibold text-primary-600">{currentAccount?.name}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm hover:border-slate-300 transition-colors">
                <Calendar size={18} className="ml-2 text-slate-400" />
                <select 
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1.5 pl-2 pr-8 outline-none"
                    value={range}
                    onChange={(e) => setRange(e.target.value as DateRange)}
                >
                    <option value="this_month">เดือนนี้</option>
                    <option value="3_months">3 เดือนล่าสุด</option>
                    <option value="6_months">6 เดือนล่าสุด</option>
                    <option value="year">ปีนี้</option>
                    <option value="all">ทั้งหมด</option>
                </select>
            </div>

            <button 
                onClick={handleExport}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
            >
                <Download size={18} />
                <span className="hidden sm:inline">Export Excel</span>
            </button>
        </div>
      </div>

      {/* 1. Summary Stats (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard 
            title="รายรับรวม" 
            value={data?.income || 0} 
            textColor="text-green-600"
            bgColor="bg-green-50"
            icon={<TrendingUp className="text-green-600" />}
        />
        <StatsCard 
            title="รายจ่ายรวม" 
            value={data?.expense || 0} 
            textColor="text-red-600"
            bgColor="bg-red-50"
            icon={<TrendingDown className="text-red-600" />}
        />
        <StatsCard 
            title="กำไรสุทธิ" 
            value={data?.profit || 0} 
            textColor={data && data.profit >= 0 ? "text-primary-600" : "text-red-600"}
            bgColor="bg-primary-50"
            icon={<Wallet className="text-primary-600" />}
        />
        <StatsCard 
            title="รอเก็บเงิน" 
            value={data?.pendingIncome || 0} 
            textColor="text-amber-600"
            bgColor="bg-amber-50"
            icon={<AlertCircle className="text-amber-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 2. Recent Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText size={18} className="text-slate-400" /> เอกสารล่าสุด
                  </h3>
                  <Link to="/quotations" className="text-xs text-primary-600 hover:underline">ดูทั้งหมด</Link>
              </div>
              <div className="p-0 flex-1">
                  {data?.recentDocuments && data.recentDocuments.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                          {data.recentDocuments.map((doc) => (
                              <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                  <DocIcon type={doc.type} />
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between mb-0.5">
                                          <span className="font-bold text-slate-800 text-sm truncate">{doc.documentNo}</span>
                                          <span className="text-xs text-slate-400">{new Date(doc.issueDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-xs text-slate-500 truncate max-w-[150px]">{doc.customerName}</span>
                                          <span className="text-sm font-medium text-slate-900">฿{doc.grandTotal.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-8 text-center text-slate-400 text-sm">ยังไม่มีเอกสารล่าสุด</div>
                  )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <Link to="/quotations/new" className="text-sm text-primary-600 font-medium hover:underline">+ สร้างเอกสารใหม่</Link>
              </div>
          </div>

          {/* 3. To-Do List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-slate-400" /> สิ่งที่ต้องทำ
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ระบบจะแจ้งเตือนเมื่อมีใบวางบิลเกินกำหนด หรือใบหักภาษีที่ยังไม่ได้รับ
                  </p>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-3">
                  {/* Overdue */}
                  {todos?.overdueInvoices && todos.overdueInvoices.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <AlertCircle className="text-red-500" size={20} />
                              <div>
                                  <p className="text-sm font-bold text-red-800">ใบวางบิลเกินกำหนด</p>
                                  <p className="text-xs text-red-600">{todos.overdueInvoices.length} รายการ ที่ยังไม่ได้รับชำระ</p>
                              </div>
                          </div>
                          <Link to="/invoices" className="text-xs bg-white text-red-600 px-3 py-1.5 rounded border border-red-200 font-medium hover:bg-red-50">ดู</Link>
                      </div>
                  )}

                  {/* Due Soon */}
                  {todos?.dueSoonInvoices && todos.dueSoonInvoices.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <Calendar className="text-amber-500" size={20} />
                              <div>
                                  <p className="text-sm font-bold text-amber-800">ครบกำหนดใน 7 วัน</p>
                                  <p className="text-xs text-amber-600">{todos.dueSoonInvoices.length} รายการ ต้องติดตามลูกค้า</p>
                              </div>
                          </div>
                          <Link to="/invoices" className="text-xs bg-white text-amber-600 px-3 py-1.5 rounded border border-amber-200 font-medium hover:bg-amber-50">ดู</Link>
                      </div>
                  )}

                  {/* Pending WHT */}
                  {todos?.pendingWht ? (todos.pendingWht > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <FileText className="text-blue-500" size={20} />
                              <div>
                                  <p className="text-sm font-bold text-blue-800">รอรับใบหักภาษี (50 ทวิ)</p>
                                  <p className="text-xs text-blue-600">{todos.pendingWht} รายการ ที่ยังไม่ได้เอกสาร</p>
                              </div>
                          </div>
                          <Link to="/withholding-tax" className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 font-medium hover:bg-blue-50">ดู</Link>
                      </div>
                  )) : null}

                  {/* All Clear */}
                  {allClear && (
                      <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-60">
                          <div className="bg-green-100 p-3 rounded-full mb-3">
                              <CheckCircle2 className="text-green-600" size={32} />
                          </div>
                          <p className="font-bold text-slate-700">เยี่ยมมาก!</p>
                          <p className="text-sm text-slate-500">ไม่มีสิ่งที่ต้องทำในขณะนี้</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* 4. Pending Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-amber-500" />
                ใบวางบิลที่รอชำระ
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full ml-2 border border-slate-200">
                    {data?.pendingInvoices.length || 0} รายการ
                </span>
            </h3>
            <Link to="/invoices" className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:underline">
                ดูทั้งหมด <ArrowRight size={16} />
            </Link>
        </div>
        
        {data?.pendingInvoices && data.pendingInvoices.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 w-32">เลขที่</th>
                            <th className="px-6 py-4">ลูกค้า</th>
                            <th className="px-6 py-4 w-32">ครบกำหนด</th>
                            <th className="px-6 py-4 w-32 text-right">ยอดเงิน</th>
                            <th className="px-6 py-4 w-32 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.pendingInvoices.slice(0, 5).map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-primary-600 font-medium">
                                    <Link to={`/invoices/edit/${inv.id}`} className="hover:underline">
                                        {inv.documentNo}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-800">{inv.customerName}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(inv.dueDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-right text-slate-900">
                                    {inv.grandTotal.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                                        inv.status === 'overdue' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                        {inv.status === 'overdue' ? 'เกินกำหนด' : 'รอชำระ'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-green-600" size={32} />
                </div>
                <p className="font-medium text-slate-800">เยี่ยมมาก!</p>
                <p className="text-sm mt-1">ไม่มีรายการค้างชำระในขณะนี้</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const StatsCard: React.FC<{
    title: string;
    value: number;
    textColor: string;
    bgColor: string;
    icon: React.ReactNode;
}> = ({ title, value, textColor, bgColor, icon }) => {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
                <div className={`p-2.5 rounded-lg ${bgColor}`}>
                    {icon}
                </div>
            </div>
            <div className={`text-2xl font-bold ${textColor}`}>
                ฿{value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
        </div>
    );
};

const DocIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'quotation': return <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={18} /></div>;
        case 'invoice': return <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={18} /></div>;
        case 'receipt': return <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Receipt size={18} /></div>;
        case 'tax_invoice': return <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><BadgeCheck size={18} /></div>;
        default: return <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Files size={18} /></div>;
    }
};

export default DashboardPage;
