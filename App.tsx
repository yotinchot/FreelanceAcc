
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccountProvider, useAccount } from './context/AccountContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentFormPage from './pages/DocumentFormPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import SelectAccountPage from './pages/SelectAccountPage';
import WhtPage from './pages/WhtPage';
import TaxPage from './pages/TaxPage';
import TaxFilingPage from './pages/TaxFilingPage';
import { Loader2 } from 'lucide-react';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode, requireAccount?: boolean }> = ({ children, requireAccount = true }) => {
  const { user, loading: authLoading } = useAuth();
  const { currentAccount, loading: accountLoading } = useAccount();
  const location = useLocation();

  if (authLoading || (user && accountLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If route requires an account selected, but none is selected
  if (requireAccount && !currentAccount) {
      // Redirect to selection page
      return <Navigate to="/select-account" replace />;
  }

  // If user is on selection page but already has account selected (optional UX choice)
  // We generally allow them to visit select-account to switch/add, so no redirect AWAY from it here.

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AccountProvider>
        <HashRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 print:block print:bg-white print:h-auto print:overflow-visible">
            <div className="print:hidden">
              <Navbar />
            </div>
            <main className="flex-grow print:p-0 print:m-0 print:block print:w-full print:h-auto print:overflow-visible">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                
                <Route 
                  path="/select-account" 
                  element={
                    <ProtectedRoute requireAccount={false}>
                      <SelectAccountPage />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Transactions */}
                <Route 
                  path="/transactions" 
                  element={
                    <ProtectedRoute>
                      <TransactionsPage />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/customers" 
                  element={
                    <ProtectedRoute>
                      <CustomersPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Quotations */}
                <Route 
                  path="/quotations" 
                  element={
                    <ProtectedRoute>
                      <DocumentsPage type="quotation" title="ใบเสนอราคา" subtitle="จัดการใบเสนอราคาสำหรับลูกค้า" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/quotations/new" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="quotation" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/quotations/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="quotation" />
                    </ProtectedRoute>
                  } 
                />

                {/* Invoices */}
                <Route 
                  path="/invoices" 
                  element={
                    <ProtectedRoute>
                      <DocumentsPage type="invoice" title="ใบแจ้งหนี้ / ใบวางบิล" subtitle="จัดการการเรียกเก็บเงินลูกค้า" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/invoices/new" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="invoice" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/invoices/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="invoice" />
                    </ProtectedRoute>
                  } 
                />

                {/* Receipts (Freelance) */}
                <Route 
                  path="/receipts" 
                  element={
                    <ProtectedRoute>
                      <DocumentsPage type="receipt" title="ใบเสร็จรับเงิน" subtitle="เอกสารยืนยันการรับเงิน" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/receipts/new" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="receipt" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/receipts/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="receipt" />
                    </ProtectedRoute>
                  } 
                />

                {/* Tax Receipts (Company) */}
                <Route 
                  path="/tax-receipts" 
                  element={
                    <ProtectedRoute>
                      <DocumentsPage type="tax_receipt" title="ใบกำกับภาษี/ใบเสร็จรับเงิน" subtitle="เอกสารสำคัญหลังการชำระเงิน" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tax-receipts/new" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="tax_receipt" />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/tax-receipts/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <DocumentFormPage type="tax_receipt" />
                    </ProtectedRoute>
                  } 
                />

                {/* Withholding Tax Tracking (Freelance) */}
                <Route 
                  path="/withholding-tax" 
                  element={
                    <ProtectedRoute>
                      <WhtPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Tax Calculation */}
                <Route 
                  path="/tax" 
                  element={
                    <ProtectedRoute>
                      <TaxPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Tax Filing Assistant (Freelance) */}
                <Route 
                  path="/tax-filing" 
                  element={
                    <ProtectedRoute>
                      <TaxFilingPage />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <footer className="bg-white border-t py-8 mt-auto print:hidden">
              <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} FreelanceAcc. ระบบบัญชีที่เข้าใจฟรีแลนซ์ไทย
              </div>
            </footer>
          </div>
        </HashRouter>
      </AccountProvider>
    </AuthProvider>
  );
};

export default App;
