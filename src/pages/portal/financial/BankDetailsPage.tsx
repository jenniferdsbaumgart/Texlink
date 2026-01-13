import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
    ArrowLeft,
    Save,
    Building2,
    CreditCard,
    Key,
    User,
    FileText,
    CheckCircle,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BankData {
    bankName: string;
    bankAgency: string;
    bankAccount: string;
    bankAccountType: 'CORRENTE' | 'POUPANCA';
    pixKey: string;
    pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
    accountHolder: string;
    accountDocument: string;
    lastUpdated?: string;
}

interface CompanyData {
    legalName: string;
    tradeName: string;
    document: string;
    city: string;
    state: string;
    email: string;
    phone: string;
}

const BANKS = [
    { code: '001', name: 'Banco do Brasil' },
    { code: '033', name: 'Santander' },
    { code: '104', name: 'Caixa Econômica' },
    { code: '237', name: 'Bradesco' },
    { code: '341', name: 'Itaú' },
    { code: '756', name: 'Sicoob' },
    { code: '077', name: 'Inter' },
    { code: '260', name: 'Nubank' },
    { code: '290', name: 'PagBank' },
];

const BankDetailsPage: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'bank' | 'company'>('bank');

    const [bankData, setBankData] = useState<BankData>({
        bankName: '',
        bankAgency: '',
        bankAccount: '',
        bankAccountType: 'CORRENTE',
        pixKey: '',
        pixKeyType: 'CPF',
        accountHolder: '',
        accountDocument: '',
    });

    const [companyData, setCompanyData] = useState<CompanyData>({
        legalName: '',
        tradeName: '',
        document: '',
        city: '',
        state: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            // Mock data - would be from API
            setBankData({
                bankName: '',
                bankAgency: '',
                bankAccount: '',
                bankAccountType: 'CORRENTE',
                pixKey: '',
                pixKeyType: 'CPF',
                accountHolder: user?.name || '',
                accountDocument: '',
                lastUpdated: undefined,
            });
            setCompanyData({
                legalName: 'Confecção Exemplo LTDA',
                tradeName: 'Confecção Exemplo',
                document: '12.345.678/0001-90',
                city: 'São Paulo',
                state: 'SP',
                email: user?.email || '',
                phone: '(11) 99999-9999',
            });
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            // Would call API here
            await new Promise(resolve => setTimeout(resolve, 1000));
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isComplete = bankData.bankName && bankData.bankAgency && bankData.bankAccount && bankData.accountHolder;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    to="/portal/inicio"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Dados Bancários e Contratuais
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Configure suas informações para receber repasses
                    </p>
                </div>
            </div>

            {/* Status Banner */}
            {!isComplete && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Dados bancários incompletos
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Complete suas informações bancárias para receber os repasses dos pedidos.
                        </p>
                    </div>
                </div>
            )}

            {/* Success Banner */}
            {showSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-green-800 dark:text-green-200">
                        Dados salvos com sucesso!
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'bank'
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <CreditCard className="h-4 w-4 inline-block mr-2" />
                        Dados Bancários
                    </button>
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'company'
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Building2 className="h-4 w-4 inline-block mr-2" />
                        Dados Contratuais
                    </button>
                </div>
            </div>

            {/* Bank Data Form */}
            {activeTab === 'bank' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bank */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Banco *
                            </label>
                            <select
                                value={bankData.bankName}
                                onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            >
                                <option value="">Selecione o banco</option>
                                {BANKS.map(bank => (
                                    <option key={bank.code} value={bank.name}>{bank.code} - {bank.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de Conta *
                            </label>
                            <select
                                value={bankData.bankAccountType}
                                onChange={(e) => setBankData({ ...bankData, bankAccountType: e.target.value as 'CORRENTE' | 'POUPANCA' })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            >
                                <option value="CORRENTE">Conta Corrente</option>
                                <option value="POUPANCA">Conta Poupança</option>
                            </select>
                        </div>

                        {/* Agency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Agência *
                            </label>
                            <input
                                type="text"
                                value={bankData.bankAgency}
                                onChange={(e) => setBankData({ ...bankData, bankAgency: e.target.value })}
                                placeholder="0000"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Account */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Conta *
                            </label>
                            <input
                                type="text"
                                value={bankData.bankAccount}
                                onChange={(e) => setBankData({ ...bankData, bankAccount: e.target.value })}
                                placeholder="00000-0"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* PIX Key Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de Chave PIX
                            </label>
                            <select
                                value={bankData.pixKeyType}
                                onChange={(e) => setBankData({ ...bankData, pixKeyType: e.target.value as BankData['pixKeyType'] })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            >
                                <option value="CPF">CPF</option>
                                <option value="CNPJ">CNPJ</option>
                                <option value="EMAIL">E-mail</option>
                                <option value="TELEFONE">Telefone</option>
                                <option value="ALEATORIA">Chave Aleatória</option>
                            </select>
                        </div>

                        {/* PIX Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Chave PIX
                            </label>
                            <input
                                type="text"
                                value={bankData.pixKey}
                                onChange={(e) => setBankData({ ...bankData, pixKey: e.target.value })}
                                placeholder="Digite sua chave PIX"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Account Holder */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Titular da Conta *
                            </label>
                            <input
                                type="text"
                                value={bankData.accountHolder}
                                onChange={(e) => setBankData({ ...bankData, accountHolder: e.target.value })}
                                placeholder="Nome completo"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Document */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CPF/CNPJ do Titular *
                            </label>
                            <input
                                type="text"
                                value={bankData.accountDocument}
                                onChange={(e) => setBankData({ ...bankData, accountDocument: e.target.value })}
                                placeholder="000.000.000-00"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {bankData.lastUpdated && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                            Última atualização: {new Date(bankData.lastUpdated).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            )}

            {/* Company Data (Read-only) */}
            {activeTab === 'company' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Razão Social
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.legalName}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Nome Fantasia
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.tradeName}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                CNPJ
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.document}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Cidade/Estado
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.city} - {companyData.state}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                E-mail
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.email}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Telefone
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium">{companyData.phone}</p>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Para alterar dados contratuais, entre em contato com o suporte Texlink.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankDetailsPage;
