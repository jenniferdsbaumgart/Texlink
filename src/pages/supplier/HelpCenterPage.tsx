import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, HelpCircle, Plus, Search, Filter,
    MessageSquare, Clock, CheckCircle, AlertCircle,
    Package, CreditCard, Key, Wrench, MoreHorizontal,
    ChevronRight, RefreshCw, X
} from 'lucide-react';
import { supportTicketsService, CreateTicketDto } from '../../services/supportTickets.service';
import type { SupportTicket, SupportTicketStatus, SupportTicketCategory } from '../../types';
import { TICKET_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from '../../types';

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

const PRIORITY_COLORS: Record<string, string> = {
    BAIXA: 'text-gray-400',
    MEDIA: 'text-blue-400',
    ALTA: 'text-orange-400',
    URGENTE: 'text-red-400',
};

const HelpCenterPage: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<SupportTicketStatus | ''>('');
    const [selectedCategory, setSelectedCategory] = useState<SupportTicketCategory | ''>('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadTickets();
    }, [selectedStatus, selectedCategory]);

    const loadTickets = async () => {
        try {
            setIsLoading(true);
            const data = await supportTicketsService.getMyTickets(
                selectedStatus || undefined,
                selectedCategory || undefined,
            );
            setTickets(data);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.displayId.toLowerCase().includes(searchQuery.toLowerCase())
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
            <header className="bg-gradient-to-r from-brand-900 to-brand-800 border-b border-brand-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/portal" className="text-brand-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="p-3 bg-brand-500/20 rounded-xl">
                                <HelpCircle className="w-8 h-8 text-brand-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Central de Ajuda</h1>
                                <p className="text-brand-300">
                                    Abra e acompanhe seus chamados de suporte
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Novo Chamado</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-500" />
                        <input
                            type="text"
                            placeholder="Buscar por título ou número..."
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

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as SupportTicketCategory | '')}
                        className="px-4 py-3 bg-brand-900/50 border border-brand-800 rounded-xl text-white focus:outline-none focus:border-brand-500"
                    >
                        <option value="">Todas as Categorias</option>
                        {Object.entries(TICKET_CATEGORY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tickets List */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 bg-brand-900/50 rounded-2xl border border-brand-800">
                        <HelpCircle className="w-12 h-12 text-brand-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                            Nenhum chamado encontrado
                        </h3>
                        <p className="text-brand-400 mb-6">
                            {searchQuery || selectedStatus || selectedCategory
                                ? 'Tente ajustar os filtros de busca.'
                                : 'Você ainda não abriu nenhum chamado.'}
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Abrir Novo Chamado
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTickets.map((ticket) => {
                            const CategoryIcon = CATEGORY_ICONS[ticket.category];
                            const statusColors = STATUS_COLORS[ticket.status];

                            return (
                                <Link
                                    key={ticket.id}
                                    to={`/portal/suporte/${ticket.id}`}
                                    className="block bg-brand-900/50 rounded-2xl border border-brand-800 p-6 hover:border-brand-600 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="p-2 bg-brand-800 rounded-xl">
                                                <CategoryIcon className="w-5 h-5 text-brand-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-sm font-mono text-brand-500">
                                                        #{ticket.displayId}
                                                    </span>
                                                    <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                                                        {TICKET_PRIORITY_LABELS[ticket.priority]}
                                                    </span>
                                                </div>
                                                <h3 className="text-white font-medium truncate group-hover:text-brand-400 transition-colors">
                                                    {ticket.title}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-brand-400">
                                                    <span className="flex items-center gap-1">
                                                        <CategoryIcon className="w-4 h-4" />
                                                        {TICKET_CATEGORY_LABELS[ticket.category]}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {formatDate(ticket.createdAt)}
                                                    </span>
                                                    {ticket._count?.messages && ticket._count.messages > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="w-4 h-4" />
                                                            {ticket._count.messages}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusColors.bg} ${statusColors.text}`}>
                                                <span className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
                                                {TICKET_STATUS_LABELS[ticket.status]}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-brand-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <CreateTicketModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(ticket) => {
                        setShowCreateModal(false);
                        navigate(`/portal/suporte/${ticket.id}`);
                    }}
                />
            )}
        </div>
    );
};

// Create Ticket Modal Component
interface CreateTicketModalProps {
    onClose: () => void;
    onCreated: (ticket: SupportTicket) => void;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onCreated }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateTicketDto>({
        title: '',
        description: '',
        category: 'OUTROS',
        priority: 'MEDIA',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) return;

        try {
            setIsSubmitting(true);
            const ticket = await supportTicketsService.create(formData);
            onCreated(ticket);
        } catch (error) {
            console.error('Error creating ticket:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-900 border border-brand-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-brand-800">
                    <h2 className="text-xl font-bold text-white">Novo Chamado</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-brand-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-brand-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-brand-300 mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Descreva brevemente o problema"
                            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:border-brand-500"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-brand-300 mb-2">
                            Categoria *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as SupportTicketCategory })}
                            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                        >
                            {Object.entries(TICKET_CATEGORY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-brand-300 mb-2">
                            Prioridade
                        </label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                        >
                            {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-brand-300 mb-2">
                            Descrição *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descreva o problema em detalhes..."
                            rows={5}
                            className="w-full px-4 py-3 bg-brand-800/50 border border-brand-700 rounded-xl text-white placeholder-brand-500 focus:outline-none focus:border-brand-500 resize-none"
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-brand-800 hover:bg-brand-700 text-white rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                            className="flex-1 px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Criar Chamado
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HelpCenterPage;
