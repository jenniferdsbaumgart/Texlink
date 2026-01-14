import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Supplier pages
const SupplierKanbanDashboard = React.lazy(() => import('./pages/supplier/KanbanDashboard'));
const SupplierOrdersList = React.lazy(() => import('./pages/supplier/OrdersListPage'));
const SupplierOrderDetails = React.lazy(() => import('./pages/supplier/OrderDetailsPage'));
const SupplierOpportunities = React.lazy(() => import('./pages/supplier/OpportunitiesPage'));
const SupplierFinancial = React.lazy(() => import('./pages/supplier/FinancialDashboardPage'));
const SupplierCapacity = React.lazy(() => import('./pages/supplier/CapacityDashboardPage'));

// Brand pages
const BrandKanbanDashboard = React.lazy(() => import('./pages/brand/KanbanDashboard'));
const BrandOrdersList = React.lazy(() => import('./pages/brand/OrdersListPage'));
const BrandCreateOrder = React.lazy(() => import('./pages/brand/CreateOrderPage'));
const BrandSuppliers = React.lazy(() => import('./pages/brand/SuppliersPage'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminApprovals = React.lazy(() => import('./pages/admin/ApprovalsPage'));
const AdminSuppliers = React.lazy(() => import('./pages/admin/SuppliersPage'));

// Portal do Parceiro pages
const PortalLayout = React.lazy(() => import('./components/portal/PortalLayout'));
const PortalDashboard = React.lazy(() => import('./pages/portal/PortalDashboard'));
const PerformancePage = React.lazy(() => import('./pages/portal/PerformancePage'));
const ReportsPage = React.lazy(() => import('./pages/portal/ReportsPage'));
const DepositsPage = React.lazy(() => import('./pages/portal/financial/DepositsPage'));
const DepositDetailPage = React.lazy(() => import('./pages/portal/financial/DepositDetailPage'));
const BankDetailsPage = React.lazy(() => import('./pages/portal/financial/BankDetailsPage'));
const PayoutFrequencyPage = React.lazy(() => import('./pages/portal/financial/PayoutFrequencyPage'));
const AdvancePage = React.lazy(() => import('./pages/portal/financial/AdvancePage'));

// Onboarding pages
const OnboardingLayout = React.lazy(() => import('./components/onboarding/OnboardingLayout'));
const Phase2Page = React.lazy(() => import('./pages/onboarding/Phase2Page'));
const Phase3Page = React.lazy(() => import('./pages/onboarding/Phase3Page'));


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <React.Suspense
                        fallback={
                            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }
                    >
                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />

                            {/* Onboarding routes (protected, supplier only) */}
                            <Route path="/onboarding" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><OnboardingLayout /></ProtectedRoute>}>
                                <Route path="phase2" element={<Phase2Page />} />
                                <Route path="phase3" element={<Phase3Page />} />
                            </Route>

                            {/* Dashboard redirect */}
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

                            {/* Portal do Parceiro routes - includes all supplier pages with sidebar */}
                            <Route path="/portal" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><PortalLayout /></ProtectedRoute>}>
                                <Route index element={<Navigate to="/portal/inicio" replace />} />
                                <Route path="inicio" element={<PortalDashboard />} />
                                <Route path="desempenho" element={<PerformancePage />} />
                                <Route path="relatorios" element={<ReportsPage />} />
                                {/* Pedidos - integrated supplier pages */}
                                <Route path="pedidos" element={<SupplierKanbanDashboard />} />
                                <Route path="pedidos/lista" element={<SupplierOrdersList />} />
                                <Route path="pedidos/:id" element={<SupplierOrderDetails />} />
                                <Route path="oportunidades" element={<SupplierOpportunities />} />
                                <Route path="capacidade" element={<SupplierCapacity />} />
                                {/* Financeiro */}
                                <Route path="financeiro/depositos" element={<DepositsPage />} />
                                <Route path="financeiro/depositos/:id" element={<DepositDetailPage />} />
                                <Route path="financeiro/dados-bancarios" element={<BankDetailsPage />} />
                                <Route path="financeiro/frequencia" element={<PayoutFrequencyPage />} />
                                <Route path="financeiro/antecipacao" element={<AdvancePage />} />
                            </Route>

                            {/* Legacy supplier routes - redirect to portal */}
                            <Route path="/supplier" element={<Navigate to="/portal/pedidos" replace />} />
                            <Route path="/supplier/orders" element={<Navigate to="/portal/pedidos/lista" replace />} />
                            <Route path="/supplier/orders/:id" element={<ProtectedRoute allowedRoles={['SUPPLIER']}><SupplierOrderDetails /></ProtectedRoute>} />
                            <Route path="/supplier/opportunities" element={<Navigate to="/portal/oportunidades" replace />} />
                            <Route path="/supplier/financial" element={<Navigate to="/portal/financeiro/depositos" replace />} />
                            <Route path="/supplier/capacity" element={<Navigate to="/portal/capacidade" replace />} />

                            {/* Brand routes */}
                            <Route path="/brand" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandKanbanDashboard /></ProtectedRoute>} />
                            <Route path="/brand/orders" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandOrdersList /></ProtectedRoute>} />
                            <Route path="/brand/orders/new" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandCreateOrder /></ProtectedRoute>} />
                            <Route path="/brand/suppliers" element={<ProtectedRoute allowedRoles={['BRAND']}><BrandSuppliers /></ProtectedRoute>} />

                            {/* Admin routes */}
                            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                            <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminApprovals /></ProtectedRoute>} />
                            <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminSuppliers /></ProtectedRoute>} />

                            {/* Default redirect */}
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </React.Suspense>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
};

const DashboardRouter: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;

    switch (user.role) {
        case 'SUPPLIER':
            return <Navigate to="/portal/inicio" replace />;
        case 'BRAND':
            return <Navigate to="/brand" replace />;
        case 'ADMIN':
            return <Navigate to="/admin" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default App;

