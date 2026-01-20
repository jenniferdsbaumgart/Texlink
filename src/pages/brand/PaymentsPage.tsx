import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order } from '../../services';
import {
    DollarSign, Loader2, Package, Clock, CheckCircle,
    AlertCircle, Filter, ArrowRight
} from 'lucide-react';

const PaymentsPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getBrandOrders();
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter orders for payment view
    const paymentOrders = orders.filter(o =>
        o.status !== 'LANCADO_PELA_MARCA' &&
        o.status !== 'RECUSADO_PELA_FACCAO'
    );

    const filteredOrders = paymentOrders.filter(o => {
        if (filter === 'pending') return o.status !== 'FINALIZADO';
        if (filter === 'paid') return o.status === 'FINALIZADO';
        return true;
    });

    const stats = {
        total: paymentOrders.reduce((sum, o) => sum + Number(o.totalValue), 0),
        pending: paymentOrders.filter(o => o.status !== 'FINALIZADO').reduce((sum, o) => sum + Number(o.totalValue), 0),
        paid: paymentOrders.filter(o => o.status === 'FINALIZADO').reduce((sum, o) => sum + Number(o.totalValue), 0),
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagamentos</h1>
                <p className="text-gray-500 dark:text-gray-400">Gerencie os pagamentos dos seus pedidos</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(stats.total)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pendente</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(stats.pending)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Pago</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(stats.paid)}
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {(['all', 'pending', 'paid'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Pagos'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum pagamento encontrado</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredOrders.map(order => (
                        <Link
                            key={order.id}
                            to={`/brand/pedidos/${order.id}`}
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === 'FINALIZADO'
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-amber-100 dark:bg-amber-900/30'
                                }`}>
                                {order.status === 'FINALIZADO' ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {order.displayId}
                                    </p>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${order.status === 'FINALIZADO'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {order.status === 'FINALIZADO' ? 'Pago' : 'Pendente'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {order.productName} • {order.supplier?.tradeName || 'Aguardando'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(Number(order.totalValue))}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {order.paymentTerms || 'À combinar'}
                                </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default PaymentsPage;
