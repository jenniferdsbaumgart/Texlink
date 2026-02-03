import React, { useState, useEffect } from 'react';
import {
    Bell,
    Mail,
    MessageSquare,
    Package,
    DollarSign,
    Clock,
    Info,
    Save,
    Loader2,
    X,
    Check,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { NotificationSettings } from '../../types';

interface NotificationToggleProps {
    label: string;
    description?: string;
    icon: React.ReactNode;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    emailChecked: boolean;
    whatsappChecked: boolean;
    onEmailChange: (checked: boolean) => void;
    onWhatsappChange: (checked: boolean) => void;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
    label,
    description,
    icon,
    emailEnabled,
    whatsappEnabled,
    emailChecked,
    whatsappChecked,
    onEmailChange,
    onWhatsappChange,
}) => (
    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {icon}
            </div>
            <div>
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                {description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                )}
            </div>
        </div>
        <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={emailChecked}
                    onChange={(e) => onEmailChange(e.target.checked)}
                    disabled={!emailEnabled}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 disabled:opacity-50"
                />
                <Mail className={`w-4 h-4 ${emailEnabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}`} />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={whatsappChecked}
                    onChange={(e) => onWhatsappChange(e.target.checked)}
                    disabled={!whatsappEnabled}
                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 disabled:opacity-50"
                />
                <MessageSquare className={`w-4 h-4 ${whatsappEnabled ? 'text-green-600' : 'text-gray-300 dark:text-gray-600'}`} />
            </label>
        </div>
    </div>
);

const NotificationsSection: React.FC = () => {
    const [data, setData] = useState<NotificationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        emailEnabled: true,
        whatsappEnabled: false,
        newOrdersEmail: true,
        newOrdersWhatsapp: true,
        messagesEmail: true,
        messagesWhatsapp: false,
        paymentsEmail: true,
        paymentsWhatsapp: true,
        deadlineReminders: true,
        systemUpdates: true,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const settings = await settingsService.getNotificationSettings();
            setData(settings);
            setFormData({
                emailEnabled: settings.emailEnabled,
                whatsappEnabled: settings.whatsappEnabled,
                newOrdersEmail: settings.newOrdersEmail,
                newOrdersWhatsapp: settings.newOrdersWhatsapp,
                messagesEmail: settings.messagesEmail,
                messagesWhatsapp: settings.messagesWhatsapp,
                paymentsEmail: settings.paymentsEmail,
                paymentsWhatsapp: settings.paymentsWhatsapp,
                deadlineReminders: settings.deadlineReminders,
                systemUpdates: settings.systemUpdates,
            });
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar configurações');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            setIsSaving(true);
            const updated = await settingsService.updateNotificationSettings(formData);
            setData(updated);
            setSuccess('Preferências de notificação atualizadas!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar configurações');
        } finally {
            setIsSaving(false);
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
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notificações</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configure como deseja receber notificações
                    </p>
                </div>
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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Global Channels */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Canais de Notificação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-brand-500 transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.emailEnabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                                className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                            />
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-brand-600" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">E-mail</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Receber por e-mail</p>
                                </div>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:border-green-500 transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.whatsappEnabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                                className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">WhatsApp</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Receber por WhatsApp</p>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Notification Types */}
                <div>
                    <div className="flex items-center justify-between px-1 mb-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">Tipos de Notificação</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> WhatsApp
                            </span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                        <NotificationToggle
                            label="Novos Pedidos"
                            description="Quando um novo pedido for enviado para você"
                            icon={<Package className="w-4 h-4 text-blue-600" />}
                            emailEnabled={formData.emailEnabled}
                            whatsappEnabled={formData.whatsappEnabled}
                            emailChecked={formData.newOrdersEmail}
                            whatsappChecked={formData.newOrdersWhatsapp}
                            onEmailChange={(checked) => setFormData(prev => ({ ...prev, newOrdersEmail: checked }))}
                            onWhatsappChange={(checked) => setFormData(prev => ({ ...prev, newOrdersWhatsapp: checked }))}
                        />
                        <NotificationToggle
                            label="Mensagens"
                            description="Quando receber uma nova mensagem"
                            icon={<MessageSquare className="w-4 h-4 text-purple-600" />}
                            emailEnabled={formData.emailEnabled}
                            whatsappEnabled={formData.whatsappEnabled}
                            emailChecked={formData.messagesEmail}
                            whatsappChecked={formData.messagesWhatsapp}
                            onEmailChange={(checked) => setFormData(prev => ({ ...prev, messagesEmail: checked }))}
                            onWhatsappChange={(checked) => setFormData(prev => ({ ...prev, messagesWhatsapp: checked }))}
                        />
                        <NotificationToggle
                            label="Pagamentos"
                            description="Atualizações sobre pagamentos"
                            icon={<DollarSign className="w-4 h-4 text-green-600" />}
                            emailEnabled={formData.emailEnabled}
                            whatsappEnabled={formData.whatsappEnabled}
                            emailChecked={formData.paymentsEmail}
                            whatsappChecked={formData.paymentsWhatsapp}
                            onEmailChange={(checked) => setFormData(prev => ({ ...prev, paymentsEmail: checked }))}
                            onWhatsappChange={(checked) => setFormData(prev => ({ ...prev, paymentsWhatsapp: checked }))}
                        />
                    </div>
                </div>

                {/* Other Settings */}
                <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Outras Notificações</h3>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-orange-600" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Lembretes de Prazo</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Alertas quando prazos estiverem próximos</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.deadlineReminders}
                                onChange={(e) => setFormData(prev => ({ ...prev, deadlineReminders: e.target.checked }))}
                                className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <Info className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Atualizações do Sistema</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Novidades e melhorias da plataforma</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.systemUpdates}
                                onChange={(e) => setFormData(prev => ({ ...prev, systemUpdates: e.target.checked }))}
                                className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                            />
                        </label>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Salvar Preferências
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NotificationsSection;
