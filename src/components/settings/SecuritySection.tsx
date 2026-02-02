import React, { useState } from 'react';
import {
    Shield,
    Key,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    X,
    Check,
    AlertTriangle,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import ChangePasswordModal from './ChangePasswordModal';

const SecuritySection: React.FC = () => {
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

    const handlePasswordChanged = () => {
        setPasswordChangeSuccess(true);
        setShowPasswordModal(false);
        setTimeout(() => setPasswordChangeSuccess(false), 5000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Segurança</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gerencie a segurança da sua conta
                    </p>
                </div>
            </div>

            {/* Success Alert */}
            {passwordChangeSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    Senha alterada com sucesso!
                </div>
            )}

            {/* Password Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Senha</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Altere sua senha regularmente para manter sua conta segura
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        Alterar Senha
                    </button>
                </div>
            </div>

            {/* Security Tips */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-300">Dicas de Segurança</h4>
                        <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400">
                            <li>Use uma senha forte com pelo menos 8 caracteres</li>
                            <li>Combine letras maiúsculas, minúsculas, números e símbolos</li>
                            <li>Não compartilhe sua senha com outras pessoas</li>
                            <li>Altere sua senha regularmente (a cada 3-6 meses)</li>
                            <li>Não use a mesma senha em outros sites ou aplicativos</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Two-Factor Authentication (Coming Soon) */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-lg">
                            <Lock className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                Autenticação em Dois Fatores
                                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                                    Em breve
                                </span>
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Adicione uma camada extra de segurança à sua conta
                            </p>
                        </div>
                    </div>
                    <button
                        disabled
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                        Configurar
                    </button>
                </div>
            </div>

            {/* Session Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Informações da Sessão</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Último acesso</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                            {new Date().toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Dispositivo</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                            {navigator.userAgent.includes('Mobile') ? 'Dispositivo Móvel' : 'Computador'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowPasswordModal(false)}
                    onSuccess={handlePasswordChanged}
                />
            )}
        </div>
    );
};

export default SecuritySection;
