import React, { useState } from 'react';
import {
    X,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Check,
    AlertCircle,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';

interface ChangePasswordModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const validatePassword = (password: string): string[] => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('Mínimo 8 caracteres');
        if (!/[A-Z]/.test(password)) errors.push('Uma letra maiúscula');
        if (!/[a-z]/.test(password)) errors.push('Uma letra minúscula');
        if (!/[0-9]/.test(password)) errors.push('Um número');
        return errors;
    };

    const passwordErrors = validatePassword(formData.newPassword);
    const passwordsMatch = formData.newPassword === formData.confirmPassword;
    const isValid = formData.currentPassword && formData.newPassword && formData.confirmPassword && passwordErrors.length === 0 && passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setError(null);
        setIsLoading(true);

        try {
            await settingsService.changePassword(
                formData.currentPassword,
                formData.newPassword,
                formData.confirmPassword
            );
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Erro ao alterar senha');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                            <Lock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alterar Senha</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Error Alert */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Senha Atual
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {/* Password Requirements */}
                        {formData.newPassword && (
                            <div className="mt-2 space-y-1">
                                {['Mínimo 8 caracteres', 'Uma letra maiúscula', 'Uma letra minúscula', 'Um número'].map(req => {
                                    const isMet = !passwordErrors.includes(req);
                                    return (
                                        <div
                                            key={req}
                                            className={`flex items-center gap-2 text-xs ${
                                                isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                                            }`}
                                        >
                                            <Check className={`w-3 h-3 ${isMet ? 'opacity-100' : 'opacity-30'}`} />
                                            {req}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirmar Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className={`w-full px-4 py-2 pr-10 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                                    formData.confirmPassword && !passwordsMatch
                                        ? 'border-red-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {formData.confirmPassword && !passwordsMatch && (
                            <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Alterar Senha
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
