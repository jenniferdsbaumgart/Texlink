import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { suppliersService, ordersService, Order } from '../../services';
import type { SupplierDocument, SupplierDocumentStatus } from '../../types';
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from '../../types';
import {
    ArrowLeft, Factory, Star, MapPin, Package,
    Loader2, Calendar, Clock, Phone, Mail,
    CheckCircle, TrendingUp, FileText, AlertTriangle, XCircle,
    Eye, Download, ChevronDown, ChevronUp
} from 'lucide-react';

interface SupplierDetail {
    id: string;
    tradeName: string;
    legalName: string;
    city: string;
    state: string;
    phone?: string;
    email?: string;
    avgRating: number;
    supplierProfile?: {
        productTypes: string[];
        specialties: string[];
        monthlyCapacity: number;
        currentOccupancy: number;
    };
}

const SupplierProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
    const [orderHistory, setOrderHistory] = useState<Order[]>([]);
    const [documents, setDocuments] = useState<SupplierDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [docsError, setDocsError] = useState<string | null>(null);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    useEffect(() => {
        if (id && activeTab === 'documents' && documents.length === 0 && !isLoadingDocs) {
            loadDocuments();
        }
    }, [id, activeTab]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            // Load supplier details
            const suppliers = await suppliersService.search({});
            const found = suppliers.find((s: any) => s.id === id);
            setSupplier(found || null);

            // Load order history with this supplier
            const orders = await ordersService.getBrandOrders();
            setOrderHistory(orders.filter((o: Order) => o.supplierId === id));
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadDocuments = async () => {
        if (!id) return;
        try {
            setIsLoadingDocs(true);
            setDocsError(null);
            const docs = await suppliersService.getSupplierDocuments(id);
            setDocuments(docs);
        } catch (error: any) {
            console.error('Error loading documents:', error);
            if (error.response?.status === 403) {
                setDocsError('Você não possui relacionamento ativo com esta facção para visualizar documentos.');
            } else {
                setDocsError('Erro ao carregar documentos.');
            }
        } finally {
            setIsLoadingDocs(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Facção não encontrada</p>
            </div>
        );
    }

    const completedOrders = orderHistory.filter(o => o.status === 'FINALIZADO').length;
    const availability = 100 - (supplier.supplierProfile?.currentOccupancy || 0);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/brand/faccoes" className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.tradeName || supplier.legalName}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {supplier.city}, {supplier.state}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-amber-500">
                            <Star className="w-4 h-4 fill-current" />
                            {supplier.avgRating?.toFixed(1) || 'N/A'}
                        </span>
                    </div>
                </div>
                <Link
                    to={`/brand/pedidos/novo?supplierId=${supplier.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl transition-all"
                >
                    <Package className="h-4 w-4" />
                    Criar Pedido
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'details'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    Detalhes
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        activeTab === 'documents'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    Documentos
                </button>
            </div>

            {activeTab === 'documents' ? (
                <DocumentsSection
                    documents={documents}
                    isLoading={isLoadingDocs}
                    error={docsError}
                />
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<TrendingUp className="h-5 w-5" />}
                            label="Disponibilidade"
                            value={`${availability}%`}
                            color={availability > 50 ? 'green' : availability > 20 ? 'amber' : 'red'}
                        />
                        <StatCard
                            icon={<Package className="h-5 w-5" />}
                            label="Capacidade/Mês"
                            value={`${(supplier.supplierProfile?.monthlyCapacity || 0).toLocaleString()}`}
                            color="brand"
                        />
                        <StatCard
                            icon={<CheckCircle className="h-5 w-5" />}
                            label="Pedidos Concluídos"
                            value={completedOrders}
                            color="blue"
                        />
                        <StatCard
                            icon={<Star className="h-5 w-5" />}
                            label="Avaliação"
                            value={supplier.avgRating?.toFixed(1) || 'N/A'}
                            color="amber"
                        />
                    </div>

                    {/* Specialties */}
                    {supplier.supplierProfile && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Especialidades</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tipos de Produto</p>
                                    <div className="flex flex-wrap gap-2">
                                        {supplier.supplierProfile.productTypes?.map(type => (
                                            <span key={type} className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm">
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {supplier.supplierProfile.specialties?.length > 0 && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Especialidades</p>
                                        <div className="flex flex-wrap gap-2">
                                            {supplier.supplierProfile.specialties.map(spec => (
                                                <span key={spec} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order History */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Histórico de Pedidos ({orderHistory.length})
                        </h2>
                        {orderHistory.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                Nenhum pedido com esta facção ainda
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {orderHistory.slice(0, 10).map(order => (
                                    <Link
                                        key={order.id}
                                        to={`/brand/pedidos/${order.id}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Package className="h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {order.displayId}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {order.productName} • {order.quantity} pçs
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contato</h2>
                        <div className="space-y-3">
                            {supplier.phone && (
                                <a href={`tel:${supplier.phone}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-brand-500">
                                    <Phone className="w-5 h-5" />
                                    <span>{supplier.phone}</span>
                                </a>
                            )}
                            {supplier.email && (
                                <a href={`mailto:${supplier.email}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-brand-500">
                                    <Mail className="w-5 h-5" />
                                    <span className="truncate">{supplier.email}</span>
                                </a>
                            )}
                            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                <MapPin className="w-5 h-5" />
                                <span>{supplier.city}, {supplier.state}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action */}
                    <Link
                        to={`/brand/pedidos/novo?supplierId=${supplier.id}`}
                        className="block w-full text-center py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-2xl transition-all shadow-sm"
                    >
                        Criar Pedido para esta Facção
                    </Link>
                </div>
            </div>
            )}
        </div>
    );
};

// Helper Components
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
    const colorClasses: Record<string, string> = {
        brand: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
                {icon}
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { label: string; color: string }> = {
        FINALIZADO: { label: 'Finalizado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        EM_PRODUCAO: { label: 'Produção', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        LANCADO_PELA_MARCA: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    };
    const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 text-xs font-medium rounded-lg ${color}`}>{label}</span>;
};

// Documents Status Config
const DOC_STATUS_CONFIG: Record<SupplierDocumentStatus, {
    label: string;
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
}> = {
    VALID: {
        label: 'Válido',
        icon: CheckCircle,
        bgColor: 'bg-green-100 dark:bg-green-500/10',
        textColor: 'text-green-700 dark:text-green-400',
    },
    EXPIRING_SOON: {
        label: 'Vencendo',
        icon: AlertTriangle,
        bgColor: 'bg-yellow-100 dark:bg-yellow-500/10',
        textColor: 'text-yellow-700 dark:text-yellow-400',
    },
    EXPIRED: {
        label: 'Vencido',
        icon: XCircle,
        bgColor: 'bg-red-100 dark:bg-red-500/10',
        textColor: 'text-red-700 dark:text-red-400',
    },
    PENDING: {
        label: 'Pendente',
        icon: Clock,
        bgColor: 'bg-gray-100 dark:bg-gray-500/10',
        textColor: 'text-gray-700 dark:text-gray-400',
    },
};

// Documents Section Component
interface DocumentsSectionProps {
    documents: SupplierDocument[];
    isLoading: boolean;
    error: string | null;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ documents, isLoading, error }) => {
    const [expandedCategories, setExpandedCategories] = useState<string[]>(['compliance', 'licenses', 'safety']);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-white font-medium mb-2">Acesso Restrito</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-white font-medium">Nenhum documento disponível</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Esta facção ainda não enviou documentos de compliance.
                </p>
            </div>
        );
    }

    // Group documents by category
    const complianceDocs = documents.filter(d =>
        ['CNPJ_ATIVO', 'CND_FEDERAL', 'CRF_FGTS', 'CONTRATO_SOCIAL', 'INSCRICAO_MUNICIPAL', 'ABVTEX_TERMO'].includes(d.type)
    );
    const licenseDocs = documents.filter(d =>
        ['LICENCA_FUNCIONAMENTO', 'AVCB', 'LICENCA_AMBIENTAL'].includes(d.type)
    );
    const safetyDocs = documents.filter(d =>
        ['LAUDO_NR1_GRO_PGR', 'LAUDO_NR7_PCMSO', 'LAUDO_NR10_SEGURANCA_ELETRICA', 'LAUDO_NR15_INSALUBRIDADE', 'LAUDO_NR17_AET'].includes(d.type)
    );
    const monthlyDocs = documents.filter(d =>
        ['GUIA_INSS', 'GUIA_FGTS', 'GUIA_SIMPLES_DAS', 'RELATORIO_EMPREGADOS'].includes(d.type)
    );
    const otherDocs = documents.filter(d =>
        ['RELACAO_SUBCONTRATADOS', 'OUTRO'].includes(d.type)
    );

    // Summary stats
    const validCount = documents.filter(d => d.status === 'VALID').length;
    const expiringCount = documents.filter(d => d.status === 'EXPIRING_SOON').length;
    const expiredCount = documents.filter(d => d.status === 'EXPIRED').length;
    const pendingCount = documents.filter(d => d.status === 'PENDING').length;

    const DocumentCategory = ({ id, title, docs }: { id: string; title: string; docs: SupplierDocument[] }) => {
        if (docs.length === 0) return null;
        const isExpanded = expandedCategories.includes(id);

        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                    onClick={() => toggleCategory(id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({docs.length})</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </button>
                {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {docs.map((doc) => {
                            const statusConfig = DOC_STATUS_CONFIG[doc.status];
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div key={doc.id} className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`p-1.5 rounded ${statusConfig.bgColor}`}>
                                            <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {SUPPLIER_DOCUMENT_TYPE_LABELS[doc.type]}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {doc.expiresAt ? `Vence: ${formatDate(doc.expiresAt)}` : 'Sem vencimento'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                            {statusConfig.label}
                                        </span>
                                        {doc.fileUrl && (
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title="Visualizar"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-500" />
                                                </a>
                                                <a
                                                    href={doc.fileUrl}
                                                    download
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4 text-gray-500" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Válidos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{validCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Vencendo</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{expiringCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Vencidos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{expiredCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pendentes</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                </div>
            </div>

            {/* Document Categories */}
            <div className="space-y-4">
                <DocumentCategory id="compliance" title="Compliance e Regularidade" docs={complianceDocs} />
                <DocumentCategory id="licenses" title="Licenças e Autorizações" docs={licenseDocs} />
                <DocumentCategory id="safety" title="Segurança do Trabalho" docs={safetyDocs} />
                <DocumentCategory id="monthly" title="Documentos Mensais" docs={monthlyDocs} />
                <DocumentCategory id="other" title="Outros Documentos" docs={otherDocs} />
            </div>
        </div>
    );
};

export default SupplierProfilePage;
