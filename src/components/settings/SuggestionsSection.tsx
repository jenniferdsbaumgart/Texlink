import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Send,
    Loader2,
    X,
    Check,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import {
    Suggestion,
    SuggestionCategory,
    SuggestionStatus,
    SUGGESTION_CATEGORY_LABELS,
    SUGGESTION_STATUS_LABELS,
} from '../../types';

const STATUS_COLORS: Record<SuggestionStatus, string> = {
    ENVIADO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EM_ANALISE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    IMPLEMENTADO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJEITADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_ICONS: Record<SuggestionStatus, React.ReactNode> = {
    ENVIADO: <Clock className="w-3 h-3" />,
    EM_ANALISE: <AlertCircle className="w-3 h-3" />,
    IMPLEMENTADO: <CheckCircle className="w-3 h-3" />,
    REJEITADO: <XCircle className="w-3 h-3" />,
};

const SuggestionsSection: React.FC = () => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        category: '' as SuggestionCategory | '',
        title: '',
        description: '',
    });

    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        try {
            setIsLoading(true);
            const data = await settingsService.getSuggestions();
            setSuggestions(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar sugestões');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category || !formData.title || !formData.description) return;

        setError(null);
        setSuccess(null);
        setIsSending(true);

        try {
            const newSuggestion = await settingsService.createSuggestion({
                category: formData.category,
                title: formData.title,
                description: formData.description,
            });
            setSuggestions(prev => [newSuggestion, ...prev]);
            setFormData({ category: '', title: '', description: '' });
            setShowForm(false);
            setSuccess('Sugestão enviada com sucesso! Agradecemos seu feedback.');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar sugestão');
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sugestões de Melhorias</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Compartilhe suas ideias para melhorar a plataforma
                        </p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Sugestão
                    </button>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* New Suggestion Form */}
            {showForm && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">Nova Sugestão</h3>
                        <button
                            onClick={() => setShowForm(false)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Categoria
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {(Object.keys(SUGGESTION_CATEGORY_LABELS) as SuggestionCategory[]).map(cat => (
                                        <option key={cat} value={cat}>
                                            {SUGGESTION_CATEGORY_LABELS[cat]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="Resumo da sua sugestão"
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Descrição
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows={4}
                                placeholder="Descreva sua sugestão em detalhes. Quanto mais informações, melhor poderemos avaliar!"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Mínimo 20 caracteres ({formData.description.length}/20)
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSending || formData.description.length < 20}
                                className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Enviar Sugestão
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Suggestions History */}
            <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Histórico de Sugestões ({suggestions.length})
                </h3>

                {suggestions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Você ainda não enviou nenhuma sugestão.</p>
                        <p className="text-sm mt-1">Suas ideias são muito importantes para nós!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map(suggestion => (
                            <div
                                key={suggestion.id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                                {SUGGESTION_CATEGORY_LABELS[suggestion.category]}
                                            </span>
                                            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${STATUS_COLORS[suggestion.status]}`}>
                                                {STATUS_ICONS[suggestion.status]}
                                                {SUGGESTION_STATUS_LABELS[suggestion.status]}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                            {suggestion.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {suggestion.description}
                                        </p>
                                        {suggestion.adminNotes && (
                                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                                                    Resposta da equipe:
                                                </p>
                                                <p className="text-sm text-blue-600 dark:text-blue-300">
                                                    {suggestion.adminNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {new Date(suggestion.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuggestionsSection;
