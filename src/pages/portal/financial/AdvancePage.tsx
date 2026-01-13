import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Clock, DollarSign } from 'lucide-react';

const AdvancePage: React.FC = () => {
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
                        Antecipação de Recebíveis
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Receba seus pagamentos antes do prazo
                    </p>
                </div>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-gradient-to-br from-purple-500 to-brand-600 rounded-2xl p-8 text-white text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Em breve!</h2>
                <p className="text-purple-100 max-w-md mx-auto mb-8">
                    Estamos desenvolvendo uma funcionalidade de antecipação de recebíveis para ajudar seu
                    fluxo de caixa. Em breve você poderá antecipar os valores de pedidos finalizados.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="bg-white/10 rounded-xl p-4">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-200" />
                        <p className="text-sm font-medium">Taxas Competitivas</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-purple-200" />
                        <p className="text-sm font-medium">Crédito em 24h</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-200" />
                        <p className="text-sm font-medium">100% Digital</p>
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Como funcionará?
                </h3>
                <div className="space-y-4 text-gray-600 dark:text-gray-400">
                    <p>
                        <strong className="text-gray-900 dark:text-white">1.</strong> Você terá pedidos finalizados
                        com pagamento programado para datas futuras.
                    </p>
                    <p>
                        <strong className="text-gray-900 dark:text-white">2.</strong> Poderá solicitar a antecipação
                        de um ou mais desses valores mediante uma pequena taxa.
                    </p>
                    <p>
                        <strong className="text-gray-900 dark:text-white">3.</strong> O valor será creditado na sua
                        conta em até 24 horas úteis.
                    </p>
                </div>
            </div>

            {/* Notify Me */}
            <div className="mt-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Quer ser avisado quando a antecipação estiver disponível?
                </p>
                <button className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors">
                    Me avise quando lançar
                </button>
            </div>
        </div>
    );
};

export default AdvancePage;
