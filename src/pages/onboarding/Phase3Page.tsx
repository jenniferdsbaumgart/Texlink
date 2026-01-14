import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Sparkles, Gauge, ArrowRight, Loader2, PartyPopper } from 'lucide-react';
import { onboardingService, Phase3Data } from '../../services/onboarding.service';

const productTypeOptions = [
    'Infantil',
    'Adulto Feminino',
    'Adulto Masculino',
    'Fitness/Activewear',
    'Moda Praia',
    'Pijamas/Loungewear',
    'Uniformes',
    'Jeans/Denim',
];

const specialtyOptions = [
    'Malha',
    'Tricô',
    'Jeans',
    'Alfaiataria',
    'Moletom',
    'Tecido Plano',
    'Lingerie',
    'Bordados',
    'Estamparia',
];

const Phase3Page: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    const [formData, setFormData] = useState<Phase3Data>({
        productTypes: [],
        specialties: [],
        monthlyCapacity: 0,
        currentOccupancy: 0,
    });

    const toggleProductType = (type: string) => {
        setFormData((prev) => ({
            ...prev,
            productTypes: prev.productTypes.includes(type)
                ? prev.productTypes.filter((t) => t !== type)
                : [...prev.productTypes, type],
        }));
    };

    const toggleSpecialty = (specialty: string) => {
        setFormData((prev) => ({
            ...prev,
            specialties: prev.specialties?.includes(specialty)
                ? prev.specialties.filter((s) => s !== specialty)
                : [...(prev.specialties || []), specialty],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.productTypes.length === 0) {
            setError('Selecione pelo menos um tipo de produto');
            return;
        }

        if (formData.monthlyCapacity < 100) {
            setError('Capacidade mínima é 100 peças/mês');
            return;
        }

        setIsLoading(true);

        try {
            await onboardingService.updatePhase3({
                ...formData,
                onboardingComplete: true,
            });
            setIsComplete(true);
            setTimeout(() => {
                navigate('/portal/inicio');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao salvar dados');
        } finally {
            setIsLoading(false);
        }
    };

    if (isComplete) {
        return (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 text-center">
                <PartyPopper className="w-20 h-20 text-green-400 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4">Cadastro Completo! 🎉</h2>
                <p className="text-brand-300 text-lg mb-8">
                    Sua facção está pronta para receber pedidos. Redirecionando para o painel...
                </p>
                <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-2">Produção e Capacidade</h2>
            <p className="text-brand-300 mb-8">
                Informe o que você produz e sua capacidade para encontrarmos os melhores pedidos.
            </p>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-6">
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Tipos de Produto */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Package className="w-4 h-4" />
                        O que você produz? (selecione todos que se aplicam)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {productTypeOptions.map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleProductType(type)}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.productTypes.includes(type)
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-white/5 text-brand-300 border border-white/10 hover:border-brand-500'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Especialidades */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Sparkles className="w-4 h-4" />
                        Especialidades (opcional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {specialtyOptions.map((specialty) => (
                            <button
                                key={specialty}
                                type="button"
                                onClick={() => toggleSpecialty(specialty)}
                                className={`px-4 py-2 rounded-full text-sm transition-all ${formData.specialties?.includes(specialty)
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-white/5 text-brand-300 border border-white/10 hover:border-teal-500'
                                    }`}
                            >
                                {specialty}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Capacidade Mensal */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Gauge className="w-4 h-4" />
                        Capacidade mensal (peças/mês)
                    </label>
                    <input
                        type="number"
                        min="100"
                        step="100"
                        value={formData.monthlyCapacity || ''}
                        onChange={(e) => setFormData({ ...formData, monthlyCapacity: parseInt(e.target.value) || 0 })}
                        placeholder="Ex: 5000"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>

                {/* Ocupação Atual */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-brand-200 mb-3">
                        <Gauge className="w-4 h-4" />
                        Ocupação atual: {formData.currentOccupancy}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.currentOccupancy}
                        onChange={(e) => setFormData({ ...formData, currentOccupancy: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-xs text-brand-400 mt-1">
                        <span>0% (Ocioso)</span>
                        <span>50%</span>
                        <span>100% (Lotado)</span>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Concluir Cadastro
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default Phase3Page;
