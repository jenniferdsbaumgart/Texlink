import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, Clock, DollarSign, ArrowRight, Loader2 } from 'lucide-react';
import { onboardingService, Phase2Data } from '../../services/onboarding.service';

const interestOptions = [
    'Aumentar faturamento',
    'Diversificar clientes',
    'Otimizar capacidade ociosa',
    'Crescer o negócio',
    'Outros',
];

const maturityOptions = [
    { value: 'iniciante', label: 'Iniciante - Começando a estruturar' },
    { value: 'basico', label: 'Básico - Processos informais' },
    { value: 'intermediario', label: 'Intermediário - Processos definidos' },
    { value: 'avancado', label: 'Avançado - Processos otimizados' },
];

const timeInMarketOptions = [
    'Menos de 1 ano',
    '1 a 3 anos',
    '3 a 5 anos',
    '5 a 10 anos',
    'Mais de 10 anos',
];

const revenueOptions = [
    { value: 10000, label: 'Até R$ 10.000/mês' },
    { value: 30000, label: 'R$ 10.000 - R$ 30.000/mês' },
    { value: 50000, label: 'R$ 30.000 - R$ 50.000/mês' },
    { value: 100000, label: 'R$ 50.000 - R$ 100.000/mês' },
    { value: 200000, label: 'Mais de R$ 100.000/mês' },
];

const Phase2Page: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<Phase2Data>({
        interesse: '',
        faturamentoDesejado: undefined,
        maturidadeGestao: '',
        qtdColaboradores: undefined,
        tempoMercado: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await onboardingService.updatePhase2(formData);
            navigate('/onboarding/phase3');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao salvar dados');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-2">Qualificação do Negócio</h2>
            <p className="text-brand-300 mb-8">
                Conte-nos mais sobre sua facção para entendermos melhor seu perfil.
            </p>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Interesse */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Briefcase className="w-4 h-4" />
                        Por que deseja se cadastrar na plataforma?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {interestOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({ ...formData, interesse: option })}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.interesse === option
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-white/5 text-brand-300 border border-white/10 hover:border-brand-500'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Maturidade de Gestão */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Clock className="w-4 h-4" />
                        Nível de maturidade na gestão
                    </label>
                    <select
                        value={formData.maturidadeGestao}
                        onChange={(e) => setFormData({ ...formData, maturidadeGestao: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="" className="bg-brand-900">Selecione...</option>
                        {maturityOptions.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-brand-900">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tempo no Mercado */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Clock className="w-4 h-4" />
                        Tempo de atuação no mercado
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {timeInMarketOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({ ...formData, tempoMercado: option })}
                                className={`px-3 py-2 rounded-lg text-sm transition-all ${formData.tempoMercado === option
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-white/5 text-brand-300 border border-white/10 hover:border-brand-500'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Colaboradores */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Users className="w-4 h-4" />
                        Número de colaboradores
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={formData.qtdColaboradores || ''}
                        onChange={(e) => setFormData({ ...formData, qtdColaboradores: parseInt(e.target.value) || undefined })}
                        placeholder="Ex: 15"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                {/* Faturamento Desejado */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <DollarSign className="w-4 h-4" />
                        Faturamento mensal desejado
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {revenueOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, faturamentoDesejado: opt.value })}
                                className={`px-4 py-3 rounded-lg text-sm text-left transition-all ${formData.faturamentoDesejado === opt.value
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-white/5 text-brand-300 border border-white/10 hover:border-brand-500'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Próximo Passo
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default Phase2Page;
