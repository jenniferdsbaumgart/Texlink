import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, GraduationCap, Plus, Pencil, Trash2, Eye, EyeOff,
    Save, X, Loader2, GripVertical, ExternalLink, Video, FileText,
    Image, BookOpen
} from 'lucide-react';
import { educationalContentService, CreateEducationalContentDto, UpdateEducationalContentDto } from '../../services/educationalContent.service';
import type { EducationalContent, EducationalContentType, EducationalContentCategory } from '../../types';
import { EDUCATIONAL_CATEGORY_LABELS, EDUCATIONAL_CONTENT_TYPE_LABELS } from '../../types';

const TYPE_ICONS: Record<EducationalContentType, React.ElementType> = {
    VIDEO: Video,
    IMAGE: Image,
    DOCUMENT: FileText,
    ARTICLE: BookOpen,
};

const EMPTY_FORM: CreateEducationalContentDto = {
    title: '',
    description: '',
    contentType: 'VIDEO',
    contentUrl: '',
    thumbnailUrl: '',
    category: 'TUTORIAL_SISTEMA',
    duration: '',
    isActive: true,
    displayOrder: 0,
};

const EducationalContentPage: React.FC = () => {
    const [contents, setContents] = useState<EducationalContent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<EducationalContent | null>(null);
    const [formData, setFormData] = useState<CreateEducationalContentDto>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
    const [filterType, setFilterType] = useState<EducationalContentType | ''>('');
    const [filterCategory, setFilterCategory] = useState<EducationalContentCategory | ''>('');

    useEffect(() => {
        loadContents();
    }, [filterActive, filterType, filterCategory]);

    const loadContents = async () => {
        try {
            setIsLoading(true);
            const data = await educationalContentService.getAllAdmin(
                filterCategory || undefined,
                filterType || undefined,
                filterActive
            );
            setContents(data);
        } catch (error) {
            console.error('Error loading educational contents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingContent(null);
        setFormData({ ...EMPTY_FORM, displayOrder: contents.length });
        setIsModalOpen(true);
    };

    const openEditModal = (content: EducationalContent) => {
        setEditingContent(content);
        setFormData({
            title: content.title,
            description: content.description,
            contentType: content.contentType,
            contentUrl: content.contentUrl,
            thumbnailUrl: content.thumbnailUrl || '',
            category: content.category,
            duration: content.duration || '',
            isActive: content.isActive,
            displayOrder: content.displayOrder,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContent(null);
        setFormData(EMPTY_FORM);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const dto: CreateEducationalContentDto | UpdateEducationalContentDto = {
                ...formData,
                thumbnailUrl: formData.thumbnailUrl || undefined,
                duration: formData.duration || undefined,
            };

            if (editingContent) {
                await educationalContentService.update(editingContent.id, dto);
            } else {
                await educationalContentService.create(dto as CreateEducationalContentDto);
            }

            closeModal();
            loadContents();
        } catch (error) {
            console.error('Error saving content:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (content: EducationalContent) => {
        try {
            await educationalContentService.toggleActive(content.id);
            loadContents();
        } catch (error) {
            console.error('Error toggling content:', error);
        }
    };

    const handleDelete = async (content: EducationalContent) => {
        if (!confirm(`Tem certeza que deseja excluir "${content.title}"?`)) return;

        try {
            await educationalContentService.delete(content.id);
            loadContents();
        } catch (error) {
            console.error('Error deleting content:', error);
        }
    };

    const handlePreview = (content: EducationalContent) => {
        window.open(content.contentUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-brand-950">
            {/* Header */}
            <header className="bg-brand-900/50 border-b border-brand-800 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-brand-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Conteúdo Educacional</h1>
                                <p className="text-sm text-brand-400">{contents.length} conteúdos cadastrados</p>
                            </div>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Conteúdo
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-wrap gap-4">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as EducationalContentType | '')}
                        className="px-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todos os tipos</option>
                        {Object.entries(EDUCATIONAL_CONTENT_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as EducationalContentCategory | '')}
                        className="px-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todas as categorias</option>
                        {Object.entries(EDUCATIONAL_CATEGORY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={filterActive === undefined ? '' : String(filterActive)}
                        onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
                        className="px-4 py-2 bg-brand-800 border border-brand-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">Todos os status</option>
                        <option value="true">Ativos</option>
                        <option value="false">Inativos</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    </div>
                ) : contents.length === 0 ? (
                    <div className="text-center py-12">
                        <GraduationCap className="w-12 h-12 text-brand-400 mx-auto mb-4" />
                        <p className="text-brand-300 mb-4">Nenhum conteúdo educacional cadastrado</p>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Adicionar primeiro conteúdo
                        </button>
                    </div>
                ) : (
                    <div className="bg-brand-900/50 rounded-xl border border-brand-800 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-brand-800">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Ordem</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Conteúdo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Categoria</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-brand-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-brand-400 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-800">
                                {contents.map((content) => {
                                    const TypeIcon = TYPE_ICONS[content.contentType];
                                    return (
                                        <tr key={content.id} className="hover:bg-brand-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="w-4 h-4 text-brand-500" />
                                                    <span className="text-brand-400">{content.displayOrder + 1}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {content.thumbnailUrl ? (
                                                        <img
                                                            src={content.thumbnailUrl}
                                                            alt={content.title}
                                                            className="w-16 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-10 rounded-lg bg-brand-700 flex items-center justify-center">
                                                            <TypeIcon className="w-5 h-5 text-brand-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-white">{content.title}</p>
                                                        <p className="text-xs text-brand-400 line-clamp-1 max-w-xs">
                                                            {content.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-700/50 rounded-lg text-sm text-brand-300">
                                                    <TypeIcon className="w-4 h-4" />
                                                    {EDUCATIONAL_CONTENT_TYPE_LABELS[content.contentType]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-brand-700/50 rounded-lg text-sm text-brand-300">
                                                    {EDUCATIONAL_CATEGORY_LABELS[content.category]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {content.isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm">
                                                        <Eye className="w-4 h-4" />
                                                        Ativo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm">
                                                        <EyeOff className="w-4 h-4" />
                                                        Inativo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handlePreview(content)}
                                                        className="p-2 text-brand-400 hover:text-white hover:bg-brand-700 rounded-lg transition-colors"
                                                        title="Visualizar"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(content)}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            content.isActive
                                                                ? 'text-yellow-400 hover:bg-yellow-500/10'
                                                                : 'text-green-400 hover:bg-green-500/10'
                                                        }`}
                                                        title={content.isActive ? 'Desativar' : 'Ativar'}
                                                    >
                                                        {content.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(content)}
                                                        className="p-2 text-brand-400 hover:text-white hover:bg-brand-700 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(content)}
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-brand-900 rounded-2xl border border-brand-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-brand-700">
                            <h2 className="text-lg font-bold text-white">
                                {editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-2 text-brand-400 hover:text-white hover:bg-brand-700 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Título *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Descrição *</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Tipo *</label>
                                    <select
                                        name="contentType"
                                        value={formData.contentType}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        {Object.entries(EDUCATIONAL_CONTENT_TYPE_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Categoria *</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        {Object.entries(EDUCATIONAL_CATEGORY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">URL do Conteúdo *</label>
                                    <input
                                        type="url"
                                        name="contentUrl"
                                        value={formData.contentUrl}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="https://youtube.com/watch?v=... ou https://exemplo.com/documento.pdf"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-brand-300 mb-1">URL da Thumbnail</label>
                                    <input
                                        type="url"
                                        name="thumbnailUrl"
                                        value={formData.thumbnailUrl}
                                        onChange={handleInputChange}
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                {formData.contentType === 'VIDEO' && (
                                    <div>
                                        <label className="block text-sm font-medium text-brand-300 mb-1">Duração</label>
                                        <input
                                            type="text"
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            placeholder="12:45"
                                            className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-brand-300 mb-1">Ordem de Exibição</label>
                                    <input
                                        type="number"
                                        name="displayOrder"
                                        value={formData.displayOrder}
                                        onChange={handleInputChange}
                                        min={0}
                                        className="w-full px-4 py-2 bg-brand-800 border border-brand-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex items-center col-span-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 rounded border-brand-600 bg-brand-800 text-brand-500 focus:ring-brand-500"
                                        />
                                        <span className="text-brand-200">Conteúdo ativo</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-brand-700">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-brand-600 text-brand-300 rounded-lg hover:bg-brand-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {editingContent ? 'Salvar Alterações' : 'Criar Conteúdo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EducationalContentPage;
