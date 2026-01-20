import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService, Order } from '../../services';
import {
    DollarSign, Loader2, Package, Calendar, ArrowRight,
    CheckCircle, Clock
} from 'lucide-react';

const PaymentHistoryPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersService.getBrandOrders();
            // Only show finalized orders (completed payments)
            setOrders(data.filter((o: Order) => o.status === 'FINALIZADO'));
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPaid = orders.reduce((sum, o) => sum + Number(o.totalValue), 0);

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico de Pagamentos</h1>
                <p className="text-gray-500 dark:text-gray-400">Pedidos finalizados e pagos</p>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-100 text-sm">Total Pago</p>
                        <p className="text-3xl font-bold mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{orders.length}</p>
                            <p className="text-xs text-green-100">Pedidos</p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-green-200" />
                    </div>
                </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum pagamento no histórico</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.map(order => (
                        <Link
                            key={order.id}
                            to={`/brand/pedidos/${order.id}`}
                            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {order.displayId}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {order.productName} • {order.supplier?.tradeName}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-green-600 dark:text-green-400">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.totalValue))}
                                </p>
                                <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
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

export default PaymentHistoryPage;
