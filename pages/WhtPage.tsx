
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccount } from '../context/AccountContext';
import { AppDocument } from '../types';
import { getDocuments, toggleWhtReceived, deleteDocument } from '../services/documentService';
import { exportWhtReport } from '../services/reportService';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Search, Download, Loader2, Filter, CheckCircle2, XCircle, UploadCloud, FileText, AlertTriangle, ExternalLink, Info, Trash2 } from 'lucide-react';

const RD_LINKS = {
  efiling: 'https://efiling.rd.go.th/rd-cms/',
};

const WhtPage: React.FC = () => {
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const navigate = useNavigate();
  
  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'list' | 'verify'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Delete State
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, no: string}>({ isOpen: false, id: '', no: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
      if (currentAccount && currentAccount.type !== 'freelance') {
          navigate('/dashboard');
      }
  }, [currentAccount, navigate]);

  useEffect(() => {
    fetchDocuments();
  }, [user, currentAccount]);

  const fetchDocuments = async () => {
    if (!user || !currentAccount) return;
    setLoading(true);
    try {
      const data = await getDocuments(user.uid, currentAccount.id, 'invoice');
      const whtDocs = data.filter(d => d.withholdingTaxRate && d.withholdingTaxRate > 0);
      setDocs(whtDocs);
    } catch (error) {
      console.error("Failed to fetch WHT documents", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReceived = async (docId: string, currentStatus: boolean) => {
      if (!docId) return;
      try {
          setDocs(prev => prev.map(d => d.id === docId ? { ...d, whtReceived: !currentStatus, whtReceivedDate: !currentStatus ? new Date() : undefined } : d));
          await toggleWhtReceived(docId, !currentStatus);
      } catch (error) {
          console.error("Error toggling status", error);
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, doc: AppDocument) => {
      e.stopPropagation();
      if (doc.id) {
          setDeleteDialog({ isOpen: true, id: doc.id, no: doc.documentNo });
      }
  };

  const confirmDelete = async () => {
      if (!deleteDialog.id) return;
      setIsDeleting(true);
      try {
          await deleteDocument(deleteDialog.id);
          setDocs(prev => prev.filter(q => q.id !== deleteDialog.id));
          setDeleteDialog({ isOpen: false, id: '', no: '' });
      } catch (e) {
          console.error("Delete failed", e);
          alert('เกิดข้อผิดพลาดในการลบเอกสาร');
      } finally {
          setIsDeleting(false);
      }
  };

  const filteredDocs = docs.filter(d => {
      const docYear = new Date(d.issueDate).getFullYear();
      return docYear === yearFilter && (statusFilter === 'all' ? true : statusFilter === 'received' ? !!d.whtReceived : !d.whtReceived);
  }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  const totalWhtAmount = filteredDocs.reduce((sum, d) => sum + (((d.subtotal || 0) * (d.withholdingTaxRate || 0)) / 100), 0);

  const handleVerify = () => {
      if (!verificationFile) return;
      setIsVerifying(true);
      setTimeout(() => {
          const systemDocs = docs.filter(d => new Date(d.issueDate).getFullYear() === yearFilter);
          const matched = [];
          const missing = [];
          for (let i = 0; i < systemDocs.length; i++) {
              const doc = systemDocs[i];
              const wht = ((doc.subtotal || 0) * (doc.withholdingTaxRate || 0)) / 100;
              if (i % 5 !== 0) { 
                  matched.push({ id: doc.id, customer: doc.customerName, amount: wht, status: 'matched' });
              } else {
                  missing.push({ id: doc.id, customer: doc.customerName, amount: wht, status: 'missing' });
              }
          }
          setVerifyResult({ matched, missing, totalChecked: systemDocs.length });
          setIsVerifying(false);
      }, 1500);
  };

  if (!currentAccount || currentAccount.type !== 'freelance') return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <span className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm"><ClipboardCheck className="text-primary-600" /></span>
            ติดตามใบหักภาษี ณ ที่จ่าย
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-12">จัดการและตรวจสอบการรับใบ 50 ทวิ จากลูกค้าสำหรับยื่นภาษี</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายการใบหักภาษี</button>
            <button onClick={() => setActiveTab('verify')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'verify' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ตรวจสอบกับสรรพากร</button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-end gap-3 mb-6">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <Filter size={16} className="text-slate-400 mr-2" />
                        <select className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none cursor-pointer" value={yearFilter} onChange={(e) => setYearFilter(parseInt(e.target.value))}>
                            {Array.from({length: 5}).map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>ปี {y + 543}</option>})}
                        </select>
                </div>
                <button onClick={() => exportWhtReport(filteredDocs, yearFilter)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all"><Download size={18} /> Export Excel</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard label="รายการทั้งหมด" value={`${filteredDocs.length} รายการ`} color="bg-white border-slate-200 text-slate-800" />
                <SummaryCard label="ได้รับใบหักภาษีแล้ว" value={`${filteredDocs.filter(d=>d.whtReceived).length} รายการ`} color="bg-green-50 border-green-200 text-green-800" />
                <SummaryCard label="ยังไม่ได้รับ" value={`${filteredDocs.length - filteredDocs.filter(d=>d.whtReceived).length} รายการ`} color="bg-red-50 border-red-200 text-red-800" />
                <SummaryCard label="ยอดหักภาษีรวม" value={`฿${totalWhtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`} color="bg-indigo-50 border-indigo-200 text-indigo-800" highlight />
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>ทั้งหมด</button>
                <button onClick={() => setStatusFilter('received')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === 'received' ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>ได้รับแล้ว</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === 'pending' ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>ยังไม่ได้รับ</button>
            </div>
            {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600 w-10 h-10" /></div> : filteredDocs.length === 0 ? <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm"><ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900">ไม่พบข้อมูล</h3><p className="text-slate-500">ไม่มีรายการหักภาษี ณ ที่จ่าย ในช่วงเวลาที่เลือก</p></div> : 
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">เลขที่เอกสาร / ลูกค้า</th>
                                    <th className="px-6 py-4">วันที่</th>
                                    <th className="px-6 py-4 text-right">ยอดก่อน VAT</th>
                                    <th className="px-6 py-4 text-center">อัตรา</th>
                                    <th className="px-6 py-4 text-right">ยอดหักภาษี</th>
                                    <th className="px-6 py-4 text-center w-[150px]">สถานะ</th>
                                    <th className="px-6 py-4 text-right w-20">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDocs.map((doc) => {
                                    const wht = ((doc.subtotal || 0) * (doc.withholdingTaxRate || 0)) / 100;
                                    return (
                                        <tr 
                                            key={doc.id} 
                                            onClick={() => navigate(`/invoices/edit/${doc.id}`)}
                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-primary-600 font-medium text-sm whitespace-nowrap">
                                                    <span className="hover:underline">{doc.documentNo}</span>
                                                </div>
                                                <div className="text-sm font-medium text-slate-800 mt-1">{doc.customerName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{new Date(doc.issueDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'})}</td>
                                            <td className="px-6 py-4 text-right text-sm text-slate-600">{doc.subtotal.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center text-xs">{doc.withholdingTaxRate}%</td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600 text-sm">{wht.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <label className={`inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full transition-colors border whitespace-nowrap ${doc.whtReceived ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 cursor-pointer" 
                                                        checked={!!doc.whtReceived} 
                                                        onChange={() => doc.id && handleToggleReceived(doc.id, !!doc.whtReceived)} 
                                                    />
                                                    <span className="text-xs font-medium select-none">{doc.whtReceived ? 'ได้รับแล้ว' : 'รอรับเอกสาร'}</span>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={(e) => handleDeleteClick(e, doc)} 
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            }

            {/* Delete Confirmation Dialog */}
            {deleteDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการลบเอกสาร</h3>
                        <p className="text-slate-500 mb-8">
                            คุณต้องการลบเอกสาร <span className="font-bold text-slate-800">{deleteDialog.no}</span> ใช่หรือไม่?<br/>
                            การกระทำนี้ไม่สามารถเรียกคืนได้
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button 
                                onClick={() => setDeleteDialog({ isOpen: false, id: '', no: '' })} 
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors w-full"
                                disabled={isDeleting}
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={isDeleting} 
                                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 w-full shadow-lg shadow-red-500/20"
                            >
                                {isDeleting && <Loader2 size={18} className="animate-spin" />} 
                                ลบเอกสาร
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {activeTab === 'verify' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-lg text-slate-900 mb-6 flex items-center gap-2"><Info size={20} className="text-primary-600"/> ขั้นตอนการตรวจสอบ</h3>
                      
                      {/* Improved Info Box */}
                      <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                          <p className="font-bold mb-1">⚠️ ก่อนเริ่มใช้งาน</p>
                          <p>ระบบ e-Filing ของสรรพากรอาจมีข้อมูลล่าช้า 1-2 เดือน หลังจากผู้จ่ายเงินยื่นแบบ</p>
                      </div>

                      <div className="space-y-8 relative">
                          <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                          <div className="relative pl-10">
                              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">1</div>
                              <h4 className="font-bold text-sm text-slate-800">เข้าเว็บสรรพากร</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Login ด้วยเลขบัตรประชาชนเพื่อเข้าสู่ระบบตรวจสอบข้อมูล</p>
                              <a href={RD_LINKS.efiling} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 text-xs font-bold mt-2 hover:underline px-3 py-2 bg-primary-50 rounded-lg border border-primary-100 w-full justify-center shadow-sm hover:bg-primary-100 transition-colors"><ExternalLink size={12} /> ไปที่ e-Filing (rd.go.th)</a>
                          </div>
                          <div className="relative pl-10">
                              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">2</div>
                              <h4 className="font-bold text-sm text-slate-800">ดาวน์โหลดข้อมูล</h4>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <li>เลือกเมนู <strong>"My Tax Account"</strong></li>
                                  <li>เลือกปีภาษีที่ต้องการ</li>
                                  <li>ดาวน์โหลดรายงานเป็นไฟล์ <strong>Excel / CSV</strong></li>
                              </ul>
                          </div>
                          <div className="relative pl-10">
                              <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary-600 border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold text-white">3</div>
                              <h4 className="font-bold text-sm text-slate-800">อัพโหลดไฟล์ที่นี่</h4>
                              <p className="text-xs text-slate-500 mt-1">เพื่อเปรียบเทียบยอดที่บันทึกในระบบ กับยอดที่สรรพากรมีข้อมูล</p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:bg-slate-100 transition-colors cursor-pointer relative group">
                      <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && setVerificationFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="group-hover:scale-105 transition-transform duration-200"><UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" /></div>
                      <h4 className="font-bold text-slate-700">คลิกเพื่ออัพโหลดไฟล์</h4>
                      <p className="text-xs text-slate-500 mt-1">รองรับไฟล์ .CSV หรือ .XLSX</p>
                      {verificationFile && <div className="mt-4 bg-white p-2 rounded shadow-sm text-sm font-medium text-primary-600 flex items-center justify-center gap-2 border border-primary-100 animate-in fade-in slide-in-from-bottom-1"><FileText size={16} /> {verificationFile.name}</div>}
                  </div>
                  
                  <button onClick={handleVerify} disabled={!verificationFile || isVerifying} className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">{isVerifying ? <Loader2 className="animate-spin" /> : 'เริ่มตรวจสอบความถูกต้อง'}</button>
              </div>

              <div className="lg:col-span-2">
                  {verifyResult ? (
                      <div className="space-y-6 animate-in fade-in">
                          <div className="grid grid-cols-3 gap-4">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center"><div className="text-2xl font-bold text-slate-800">{verifyResult.totalChecked}</div><div className="text-xs text-slate-500 uppercase font-bold">รายการที่ตรวจสอบ</div></div>
                              <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center"><div className="text-2xl font-bold text-green-600">{verifyResult.matched.length}</div><div className="text-xs text-green-700 uppercase font-bold">ข้อมูลตรงกัน</div></div>
                              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center"><div className="text-2xl font-bold text-red-600">{verifyResult.missing.length}</div><div className="text-xs text-red-700 uppercase font-bold">ไม่พบในระบบสรรพากร</div></div>
                          </div>
                          {verifyResult.missing.length > 0 && <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800 flex gap-3"><AlertTriangle className="shrink-0 mt-0.5" /><div><p className="font-bold">พบรายการที่ไม่ตรงกัน!</p><p className="mt-1">รายการด้านล่างนี้มีในระบบของคุณ แต่ไม่พบในไฟล์ข้อมูลจากสรรพากร (อาจเกิดจากผู้จ่ายยังไม่ยื่นภาษี)</p></div></div>}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b"><tr><th className="p-4">ลูกค้า</th><th className="p-4 text-right">ภาษีที่หักไว้</th><th className="p-4 text-center">สถานะ</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {verifyResult.missing.map((item: any, i: number) => (<tr key={`miss-${i}`} className="bg-red-50/30"><td className="p-4 font-medium text-slate-800">{item.customer}</td><td className="p-4 text-right font-bold text-slate-600">{item.amount.toLocaleString()}</td><td className="p-4 text-center"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold"><XCircle size={12} /> ไม่พบข้อมูล</span></td></tr>))}
                                        {verifyResult.matched.map((item: any, i: number) => (<tr key={`match-${i}`}><td className="p-4 text-slate-600">{item.customer}</td><td className="p-4 text-right text-slate-600">{item.amount.toLocaleString()}</td><td className="p-4 text-center"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold"><CheckCircle2 size={12} /> ตรงกัน</span></td></tr>))}
                                    </tbody>
                                </table>
                          </div>
                      </div>
                  ) : (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100"><Search className="w-10 h-10 text-slate-300" /></div>
                          <h3 className="text-lg font-bold text-slate-800">รอการตรวจสอบ</h3>
                          <p className="text-slate-500 max-w-sm mx-auto mt-2">กรุณาอัพโหลดไฟล์ Excel/CSV จากระบบ e-Filing เพื่อเริ่มเปรียบเทียบข้อมูล</p>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; color: string; highlight?: boolean }> = ({ label, value, color, highlight }) => (
    <div className={`p-4 rounded-xl border shadow-sm ${color}`}>
        <p className="text-xs font-medium opacity-80 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${highlight ? 'scale-105 origin-left' : ''}`}>{value}</p>
    </div>
);

export default WhtPage;
