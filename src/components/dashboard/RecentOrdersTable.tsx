import { Link } from 'react-router-dom';
import { Package, ChevronRight, ExternalLink } from 'lucide-react';

export interface OrderTableItem {
  id: string;
  displayId: string;
  productName: string;
  status: string;
  statusLabel: string;
  statusColor: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  value: number;
  deadline?: string;
  daysUntilDeadline?: number;
  brandName?: string;
  supplierName?: string;
}

interface RecentOrdersTableProps {
  orders: OrderTableItem[];
  linkBase: string;
  showBrand?: boolean;
  showSupplier?: boolean;
  emptyMessage?: string;
  viewAllLink?: string;
  viewAllLabel?: string;
  title?: string;
}

const statusColorConfig = {
  success: 'status-badge-success',
  warning: 'status-badge-warning',
  error: 'status-badge-error',
  info: 'status-badge-info',
  neutral: 'status-badge-neutral',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

/**
 * RecentOrdersTable - Stripe-style table for recent orders
 * With hover states, status badges, and inline actions
 */
export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  linkBase,
  showBrand = false,
  showSupplier = false,
  emptyMessage = 'Nenhum pedido encontrado',
  viewAllLink,
  viewAllLabel = 'Ver todos',
  title = 'Pedidos Recentes',
}) => {
  return (
    <div className="bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden dashboard-section">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {viewAllLabel}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Table Content */}
      {orders.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/[0.05] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/[0.02]">
                <th className="text-left">Pedido</th>
                <th className="text-left">Produto</th>
                {showBrand && <th className="text-left">Marca</th>}
                {showSupplier && <th className="text-left">Facção</th>}
                <th className="text-left">Status</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Prazo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr
                  key={order.id}
                  className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td>
                    <Link
                      to={`${linkBase}/${order.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {order.displayId}
                    </Link>
                  </td>
                  <td>
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] block">
                      {order.productName}
                    </span>
                  </td>
                  {showBrand && (
                    <td>
                      <span className="text-gray-600 dark:text-gray-400">
                        {order.brandName || '-'}
                      </span>
                    </td>
                  )}
                  {showSupplier && (
                    <td>
                      <span className="text-gray-600 dark:text-gray-400">
                        {order.supplierName || 'Aguardando'}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`status-badge ${statusColorConfig[order.statusColor]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="font-medium text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(order.value)}
                    </span>
                  </td>
                  <td className="text-right">
                    {order.daysUntilDeadline !== undefined ? (
                      <span
                        className={`text-sm font-medium ${
                          order.daysUntilDeadline <= 3
                            ? 'text-red-500'
                            : order.daysUntilDeadline <= 7
                            ? 'text-amber-500'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {order.daysUntilDeadline === 0
                          ? 'Hoje'
                          : order.daysUntilDeadline === 1
                          ? 'Amanhã'
                          : `${order.daysUntilDeadline} dias`}
                      </span>
                    ) : order.deadline ? (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {order.deadline}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <Link
                      to={`${linkBase}/${order.id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentOrdersTable;
