import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Building,
    User,
    Wallet,
    Save,
    Loader2,
    X,
    Check,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import { BankAccount, AccountType, PixKeyType, ACCOUNT_TYPE_LABELS, PIX_KEY_TYPE_LABELS } from '../../types';

// Common Brazilian banks
const BANKS = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '033', name: 'Santander' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '237', name: 'Bradesco' },
    { code: '341', name: 'Itaú Unibanco' },
    { code: '422', name: 'Banco Safra' },
    { code: '745', name: 'Citibank' },
    { code: '077', name: 'Banco Inter' },
    { code: '260', name: 'Nubank' },
    { code: '336', name: 'C6 Bank' },
    { code: '212', name: 'Banco Original' },
    { code: '756', name: 'Sicoob' },
];

const BankDetailsSection: React.FC = () => {
    const [data, setData] = useState<BankAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        bankCode: '',
        bankName: '',
        agency: '',
        accountNumber: '',
        accountType: 'CORRENTE' as AccountType,
        accountHolder: '',
        holderDocument: '',
        pixKeyType: '' as PixKeyType | '',
        pixKey: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const bankAccount = await settingsService.getBankAccount();
            setData(bankAccount);
            if (bankAccount) {
                setFormData({
                    bankCode: bankAccount.bankCode,
                    bankName: bankAccount.bankName,
                    agency: bankAccount.agency,
                    accountNumber: bankAccount.accountNumber,
                    accountType: bankAccount.accountType,
                    accountHolder: bankAccount.accountHolder,
                    holderDocument: formatDocument(bankAccount.holderDocument),
                    pixKeyType: bankAccount.pixKeyType || '',
                    pixKey: bankAccount.pixKey || '',
                });
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados bancários');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDocument = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 11) {
            // CPF: 000.000.000-00
            return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        // CNPJ: 00.000.000/0000-00
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'bankCode') {
            const bank = BANKS.find(b => b.code === value);
            setFormData(prev => ({
                ...prev,
                bankCode: value,
                bankName: bank?.name || '',
            }));
        } else if (name === 'holderDocument') {
            setFormData(prev => ({ ...prev, [name]: formatDocument(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            setIsSaving(true);
            const updated = await settingsService.updateBankAccount({
                bankCode: formData.bankCode,
                bankName: formData.bankName,
                agency: formData.agency,
                accountNumber: formData.accountNumber,
                accountType: formData.accountType,
                accountHolder: formData.accountHolder,
                holderDocument: formData.holderDocument.replace(/\D/g, ''),
                pixKeyType: formData.pixKeyType || undefined,
                pixKey: formData.pixKey || undefined,
            });
            setData(updated);
            setSuccess('Dados bancários atualizados com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar dados bancários');
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
                    <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados Bancários</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Informações para recebimento de pagamentos
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
                {/* Bank Info */}
                <div>
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Building className="w-4 h-4" />
                        Conta Bancária
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Banco
                            </label>
                            <select
                                name="bankCode"
                                value={formData.bankCode}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="">Selecione o banco</option>
                                {BANKS.map(bank => (
                                    <option key={bank.code} value={bank.code}>
                                        {bank.code} - {bank.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Agência
                            </label>
                            <input
                                type="text"
                                name="agency"
                                value={formData.agency}
                                onChange={handleChange}
                                required
                                placeholder="0000"
                                maxLength={10}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Conta
                            </label>
                            <input
                                type="text"
                                name="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleChange}
                                required
                                placeholder="00000-0"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Conta
                            </label>
                            <select
                                name="accountType"
                                value={formData.accountType}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(type => (
                                    <option key={type} value={type}>
                                        {ACCOUNT_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Account Holder */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <User className="w-4 h-4" />
                        Titular da Conta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome do Titular
                            </label>
                            <input
                                type="text"
                                name="accountHolder"
                                value={formData.accountHolder}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                CPF/CNPJ do Titular
                            </label>
                            <input
                                type="text"
                                name="holderDocument"
                                value={formData.holderDocument}
                                onChange={handleChange}
                                required
                                placeholder="000.000.000-00"
                                maxLength={18}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* PIX */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="flex items-center gap-2 text-md font-medium text-gray-900 dark:text-white mb-4">
                        <Wallet className="w-4 h-4" />
                        Chave PIX (opcional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Chave
                            </label>
                            <select
                                name="pixKeyType"
                                value={formData.pixKeyType}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="">Selecione (opcional)</option>
                                {(Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[]).map(type => (
                                    <option key={type} value={type}>
                                        {PIX_KEY_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Chave PIX
                            </label>
                            <input
                                type="text"
                                name="pixKey"
                                value={formData.pixKey}
                                onChange={handleChange}
                                disabled={!formData.pixKeyType}
                                placeholder={formData.pixKeyType ? 'Digite sua chave PIX' : 'Selecione o tipo primeiro'}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 disabled:dark:bg-gray-600 disabled:cursor-not-allowed"
                            />
                        </div>
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
                        Salvar Dados Bancários
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BankDetailsSection;
