import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersService } from '../../services';
import {
    Factory, Star, Search, Filter,
    MapPin, Package, Loader2, ArrowRight
} from 'lucide-react';

interface Supplier {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    avgRating: number;
    productTypes?: string[];
    specialties?: string[];
    monthlyCapacity?: number;
    currentOccupancy?: number;
    supplierProfile?: {
        productTypes: string[];
        specialties: string[];
        monthlyCapacity: number;
        currentOccupancy: number;
    };
}

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ state: '', productType: '' });

    useEffect(() => {
        loadSuppliers();
    }, [filters]);

    const loadSuppliers = async () => {
        try {
            setIsLoading(true);
            const data = await suppliersService.search({
                state: filters.state || undefined,
                productTypes: filters.productType ? [filters.productType] : undefined,
            });
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.legalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to get supplier profile data (can be at root or nested)
    const getProfile = (s: Supplier) => ({
        productTypes: s.productTypes || s.supplierProfile?.productTypes || [],
        monthlyCapacity: s.monthlyCapacity || s.supplierProfile?.monthlyCapacity || 0,
        currentOccupancy: s.currentOccupancy || s.supplierProfile?.currentOccupancy || 0,
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buscar Facções</h1>
                <p className="text-gray-500 dark:text-gray-400">{filteredSuppliers.length} facções disponíveis</p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        value={filters.state}
                        onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                        className="pl-11 pr-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todos os estados</option>
                        <option value="SP">São Paulo</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="PR">Paraná</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="CE">Ceará</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Factory className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma facção encontrada</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers.map((supplier) => {
                        const profile = getProfile(supplier);
                        return (
                            <Link
                                key={supplier.id}
                                to={`/brand/faccoes/${supplier.id}`}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-700 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
                                            <Factory className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {supplier.tradeName || supplier.legalName}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {supplier.city}, {supplier.state}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-500">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="text-sm font-medium">{supplier.avgRating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                </div>

                                {profile.productTypes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {profile.productTypes.slice(0, 3).map((type) => (
                                            <span
                                                key={type}
                                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                        {profile.productTypes.length > 3 && (
                                            <span className="text-xs text-gray-400">+{profile.productTypes.length - 3}</span>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        {profile.monthlyCapacity?.toLocaleString() || 0} pçs/mês
                                    </span>
                                    <span className={`font-medium ${profile.currentOccupancy > 80 ? 'text-red-500' :
                                            profile.currentOccupancy > 50 ? 'text-amber-500' : 'text-green-500'
                                        }`}>
                                        {100 - profile.currentOccupancy}% disponível
                                    </span>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-sm text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Ver perfil
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;
