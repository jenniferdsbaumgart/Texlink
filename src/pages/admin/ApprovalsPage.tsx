import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, PendingApproval } from '../../services';
import {
    ArrowLeft, CheckCircle, XCircle, Factory,
    Mail, MapPin, Calendar, Loader2, AlertCircle
} from 'lucide-react';

const ApprovalsPage: React.FC = () => {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        try {
            const data = await adminService.getPendingApprovals();
            setApprovals(data);
        } catch (error) {
            console.error('Error loading approvals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await adminService.updateSupplierStatus(id, 'ACTIVE');
            setApprovals(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error approving:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await adminService.updateSupplierStatus(id, 'SUSPENDED');
            setApprovals(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error rejecting:', error);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="animate-fade-in">
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/admin" className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aprovações Pendentes</h1>
                        <p className="text-gray-500 dark:text-gray-400">{approvals.length} facções aguardando revisão</p>
                    </div>
                </div>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : approvals.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                        <p className="text-brand-300">Nenhuma aprovação pendente</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {approvals.map((approval) => (
                            <div
                                key={approval.id}
                                className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                            <Factory className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-gray-900 dark:text-white font-semibold">{approval.tradeName || approval.legalName}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{approval.document}</p>

                                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {approval.city}, {approval.state}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-4 h-4" />
                                                    {approval.companyUsers[0]?.user.email}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(approval.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>

                                            {approval.supplierProfile && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {approval.supplierProfile.productTypes?.map((type) => (
                                                        <span
                                                            key={type}
                                                            className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/[0.06]"
                                                        >
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleReject(approval.id)}
                                            disabled={processingId === approval.id}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === approval.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <XCircle className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleApprove(approval.id)}
                                            disabled={processingId === approval.id}
                                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === approval.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ApprovalsPage;
