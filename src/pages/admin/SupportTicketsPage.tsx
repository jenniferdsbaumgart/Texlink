import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, HelpCircle, Search, MessageSquare, Clock,
    Package, CreditCard, Key, Wrench, MoreHorizontal,
    ChevronRight, RefreshCw, AlertCircle, User, Send,
    X, CheckCircle, Users
} from 'lucide-react';
import { supportTicketsService, SendMessageDto, UpdateTicketDto } from '../../services/supportTickets.service';
import type {
    SupportTicket,
    SupportTicketMessage,
    SupportTicketStats,
    SupportTicketStatus,
    SupportTicketCategory,
    SupportTicketPriority,
} from '../../types';
import {
    TICKET_STATUS_LABELS,
    TICKET_CATEGORY_LABELS,
    TICKET_PRIORITY_LABELS,
} from '../../types';

const CATEGORY_ICONS: Record<SupportTicketCategory, React.ElementType> = {
    PEDIDOS: Package,
    PAGAMENTOS: CreditCard,
    ACESSO: Key,
    TECNICO: Wrench,
    OUTROS: MoreHorizontal,
};

const STATUS_COLORS: Record<SupportTicketStatus, { bg: string; text: string; dot: string }> = {
    ABERTO: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
    EM_ANDAMENTO: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
    AGUARDANDO_RESPOSTA: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
    RESOLVIDO: { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400' },
    FECHADO: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
};

const PRIORITY_COLORS: Record<SupportTicketPriority, { bg: string; text: string }> = {
    BAIXA: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
    MEDIA: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    ALTA: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
    URGENTE: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

const SupportTicketsPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [stats, setStats] = useState<SupportTicketStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | ''>('');
    const [selectedPriority, setSelectedPriority] = useState<SupportTicketPriority | ''>('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedStatus, selectedPriority]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [ticketsData, statsData] = await Promise.all([
                supportTicketsService.getAllAdmin({
                    status: selectedStatus || undefined,
                    priority: selectedPriority || undefined,
                }),
                supportTicketsService.getStats(),
            ]);
            setTickets(ticketsData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.company?.tradeName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'agora há pouco';
        if (diffHours < 24) return `há ${diffHours}h`;
        if (diffDays === 1) return 'ontem';
        if (diffDays < 7) return `há ${diffDays} dias`;
        return date.toLocaleDateString('pt-BR');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-950 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-brand-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="p-2 bg-brand-500/20 rounded-xl">
                            <HelpCircle className="w-6 h-6 text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Chamados de Suporte</h1>
                            <p className="text-sm text-brand-400">Gerenciar Central de Ajuda</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="Abertos"
                            value={stats.abertos}
                            icon={AlertCircle}
                            color="blue"
                        />
                        <StatCard
                            title="Em Andamento"
                            value={stats.emAndamento}
                            icon={Clock}
                            color="yellow"
                        />
                        <StatCard
                            title="Urgentes"
                            value={stats.urgentes}
                            icon={AlertCircle}
                            color="red"
                        />
                        <StatCard
                            title="Tempo Médio"
                            value={`${stats.tempoMedioResposta}h`}
                            icon={Clock}
                            color="purple"
                        />
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-500" />
                        <input
                            type="text"
                            placeholder="Buscar por título, número ou empresa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:border-brand-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as SupportTicketStatus | '')}
                        className="px-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Todos os Status</option>
                        {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    {/* Priority Filter */}
                    <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value as SupportTicketPriority | '')}
                        className="px-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Todas as Prioridades</option>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Tickets Table */}
                <div className="bg-brand-900/50 border border-brand-800 rounded-2xl overflow-hidden">
                    {filteredTickets.length === 0 ? (
                        <div className="text-center py-12">
                            <HelpCircle className="w-12 h-12 text-brand-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">
                                Nenhum chamado encontrado
                            </h3>
                            <p className="text-brand-400">
                                Tente ajustar os filtros de busca.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-brand-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Chamado
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Empresa
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Prioridade
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Data
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-brand-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-800">
                                    {filteredTickets.map((ticket) => {
                                        const CategoryIcon = CATEGORY_ICONS[ticket.category];
                                        const statusColors = STATUS_COLORS[ticket.status];
                                        const priorityColors = PRIORITY_COLORS[ticket.priority];

                                        return (
                                            <tr
                                                key={ticket.id}
                                                className="hover:bg-brand-800/30 transition-colors cursor-pointer"
                                                onClick={() => setSelectedTicket(ticket)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-brand-800 rounded-lg">
                                                            <CategoryIcon className="w-4 h-4 text-brand-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-medium truncate max-w-xs">
                                                                {ticket.title}
                                                            </p>
                                                            <p className="text-xs text-brand-500 font-mono">
                                                                #{ticket.displayId}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-brand-300">
                                                        {ticket.company?.tradeName || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                                                        {TICKET_STATUS_LABELS[ticket.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${priorityColors.bg} ${priorityColors.text}`}>
                                                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-brand-400">
                                                        <Clock className="w-4 h-4" />
                                                        {formatDate(ticket.createdAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTicket(ticket);
                                                        }}
                                                        className="text-brand-400 hover:text-white transition-colors"
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={() => {
                        loadData();
                        setSelectedTicket(null);
                    }}
                />
            )}
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: 'blue' | 'yellow' | 'red' | 'purple' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
        yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-400',
        red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
        green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl border p-4`}>
            <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-brand-300">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

// Ticket Detail Modal Component
interface TicketDetailModalProps {
    ticket: SupportTicket;
    onClose: () => void;
    onUpdate: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, onUpdate }) => {
    const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newStatus, setNewStatus] = useState<SupportTicketStatus>(ticket.status);
    const [newPriority, setNewPriority] = useState<SupportTicketPriority>(ticket.priority);

    useEffect(() => {
        loadMessages();
    }, [ticket.id]);

    const loadMessages = async () => {
        try {
            setIsLoading(true);
            const data = await supportTicketsService.getMessages(ticket.id);
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        try {
            setIsSending(true);
            await supportTicketsService.replyAsSupport(ticket.id, {
                content: newMessage.trim(),
                isInternal,
            });
            setNewMessage('');
            setIsInternal(false);
            loadMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateTicket = async () => {
        try {
            const updateData: UpdateTicketDto = {};
            if (newStatus !== ticket.status) updateData.status = newStatus;
            if (newPriority !== ticket.priority) updateData.priority = newPriority;

            if (Object.keys(updateData).length > 0) {
                await supportTicketsService.updateTicket(ticket.id, updateData);
                onUpdate();
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const CategoryIcon = CATEGORY_ICONS[ticket.category];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-900 border border-brand-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-brand-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-800 rounded-lg">
                            <CategoryIcon className="w-5 h-5 text-brand-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">{ticket.title}</h2>
                            </div>
                            <p className="text-sm text-brand-500 font-mono">#{ticket.displayId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-brand-400" />
                    </button>
                </div>

                {/* Info Bar */}
                <div className="px-6 py-4 bg-brand-800/30 border-b border-brand-800 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-400">Empresa:</span>
                        <span className="text-sm text-white">{ticket.company?.tradeName || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-400">Criado por:</span>
                        <span className="text-sm text-white">{ticket.createdBy?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-400">Data:</span>
                        <span className="text-sm text-white">{formatDate(ticket.createdAt)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="px-6 py-4 border-b border-brand-800 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-400">Status:</span>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as SupportTicketStatus)}
                            className="px-3 py-1.5 bg-brand-800/50 border border-brand-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
                        >
                            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-400">Prioridade:</span>
                        <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                            className="px-3 py-1.5 bg-brand-800/50 border border-brand-700 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
                        >
                            {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    {(newStatus !== ticket.status || newPriority !== ticket.priority) && (
                        <button
                            onClick={handleUpdateTicket}
                            className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg transition-colors"
                        >
                            Salvar Alterações
                        </button>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Initial Description */}
                    <div className="bg-brand-800/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-brand-400" />
                            <span className="text-sm font-medium text-brand-300">
                                {ticket.createdBy?.name || 'Usuário'}
                            </span>
                            <span className="text-xs text-brand-500">{formatDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-white whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-4">
                            <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`rounded-xl p-4 ${
                                    message.isInternal
                                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                                        : message.isFromSupport
                                        ? 'bg-brand-500/10 border border-brand-500/30'
                                        : 'bg-brand-800/30'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    {message.isFromSupport ? (
                                        <HelpCircle className="w-4 h-4 text-brand-400" />
                                    ) : (
                                        <User className="w-4 h-4 text-brand-400" />
                                    )}
                                    <span className="text-sm font-medium text-brand-300">
                                        {message.sender?.name || 'Usuário'}
                                        {message.isFromSupport && ' (Suporte)'}
                                    </span>
                                    {message.isInternal && (
                                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                            Nota Interna
                                        </span>
                                    )}
                                    <span className="text-xs text-brand-500">{formatDate(message.createdAt)}</span>
                                </div>
                                <p className="text-white whitespace-pre-wrap">{message.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Reply Area */}
                {ticket.status !== 'FECHADO' && (
                    <div className="p-6 border-t border-brand-800">
                        <div className="flex items-center gap-2 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                    className="w-4 h-4 rounded border-brand-600 bg-brand-800 text-brand-500 focus:ring-brand-500"
                                />
                                <span className="text-sm text-brand-400">Nota interna (não visível para o usuário)</span>
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isInternal ? "Escreva uma nota interna..." : "Escreva sua resposta..."}
                                rows={3}
                                className="flex-1 px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:border-brand-500 resize-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isSending}
                                className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors self-end"
                            >
                                {isSending ? (
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportTicketsPage;
