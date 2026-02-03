import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import {
    ArrowLeft, Factory, Star, Package, Filter,
    CheckCircle, Clock, XCircle, Loader2
} from 'lucide-react';

interface Supplier {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    avgRating: number;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    supplierProfile?: {
        productTypes: string[];
        monthlyCapacity: number;
        onboardingComplete: boolean;
    };
    _count: { ordersAsSupplier: number };
}

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');

    useEffect(() => {
        loadSuppliers();
    }, [filter]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await adminService.getSuppliers(filter || undefined);
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
        try {
            await adminService.updateSupplierStatus(id, status);
            loadSuppliers();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facções</h1>
                        <p className="text-gray-500 dark:text-gray-400">{suppliers.length} facções cadastradas no sistema</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-10 pr-8 py-2 w-full sm:w-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded-xl text-gray-700 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
                            >
                                <option value="">Todos os status</option>
                                <option value="ACTIVE">Somente Ativas</option>
                                <option value="PENDING">Somente Pendentes</option>
                                <option value="SUSPENDED">Somente Suspensas</option>
                            </select>
                        </div>
                    </div>
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="text-center py-12">
                        <Factory className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma facção encontrada</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.map((supplier) => (
                            <div
                                key={supplier.id}
                                className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Factory className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-gray-900 dark:text-white font-medium">{supplier.tradeName || supplier.legalName}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{supplier.city}, {supplier.state}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={supplier.status} />
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        <span className="font-medium text-gray-900 dark:text-white">{supplier.avgRating?.toFixed(1) || 'N/A'}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4 text-sky-500" />
                                        {supplier._count?.ordersAsSupplier || 0} pedidos
                                    </span>
                                </div>

                                {supplier.supplierProfile?.productTypes && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {supplier.supplierProfile.productTypes.slice(0, 3).map((type) => (
                                            <span
                                                key={type}
                                                className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-white/[0.06] rounded text-[10px] font-medium text-gray-600 dark:text-gray-400"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {supplier.status === 'ACTIVE' ? (
                                        <button
                                            onClick={() => handleStatusChange(supplier.id, 'SUSPENDED')}
                                            className="flex-1 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors"
                                        >
                                            Suspender
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStatusChange(supplier.id, 'ACTIVE')}
                                            className="flex-1 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors"
                                        >
                                            Ativar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
        ACTIVE: { icon: CheckCircle, color: 'text-green-400' },
        PENDING: { icon: Clock, color: 'text-amber-400' },
        SUSPENDED: { icon: XCircle, color: 'text-red-400' },
    };
    const { icon: Icon, color } = config[status] || config.PENDING;
    return <Icon className={`w-5 h-5 ${color}`} />;
};

export default SuppliersPage;
