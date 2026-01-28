import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RiskLevel } from '@prisma/client';
import {
    ICreditProvider,
    CreditAnalysisResult,
    CreditNegative,
    CreditProtesto,
} from './credit-provider.interface';

/**
 * Mock provider de análise de crédito para desenvolvimento/testes
 * 
 * Em produção, deve ser substituído por integrações reais com:
 * - Serasa Experian
 * - SPC Brasil
 * - Boa Vista SCPC
 * - Quod
 */
@Injectable()
export class MockCreditProvider implements ICreditProvider {
    readonly name = 'MOCK_CREDIT';

    private readonly logger = new Logger(MockCreditProvider.name);
    private readonly isEnabled: boolean;

    constructor(private readonly configService: ConfigService) {
        // Só habilita em ambiente de desenvolvimento
        const env = this.configService.get<string>('NODE_ENV', 'development');
        this.isEnabled = env === 'development' || env === 'test';
    }

    async isAvailable(): Promise<boolean> {
        return this.isEnabled;
    }

    async analyze(cnpj: string): Promise<CreditAnalysisResult> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        this.logger.log(`[MOCK] Analisando crédito do CNPJ ${this.maskCnpj(cleanCnpj)}`);

        // Simula delay de API real
        await this.simulateDelay(500, 1500);

        // Gera resultado baseado no CNPJ para ter resultados consistentes
        const seed = this.generateSeed(cleanCnpj);

        return this.generateMockResult(cleanCnpj, seed);
    }

    private generateMockResult(cnpj: string, seed: number): CreditAnalysisResult {
        // Usa o seed para gerar resultados determinísticos
        const hasNegatives = seed % 4 === 0; // 25% chance de ter negativações
        const hasProtestos = seed % 5 === 0; // 20% chance de ter protestos

        // Score baseado no seed (300-950)
        const baseScore = 300 + (seed % 650);
        let score = hasNegatives ? Math.max(300, baseScore - 200) : baseScore;
        score = hasProtestos ? Math.max(300, score - 100) : score;

        // Determina risk level
        const riskLevel = this.calculateRiskLevel(score, hasNegatives, hasProtestos);

        // Gera negativações mock
        const negatives: CreditNegative[] = hasNegatives
            ? this.generateMockNegatives(seed)
            : [];

        // Gera protestos mock
        const protestos: CreditProtesto[] = hasProtestos
            ? this.generateMockProtestos(seed)
            : [];

        // Gera recomendações
        const recommendations = this.generateRecommendations(score, hasNegatives, hasProtestos);

        return {
            score,
            riskLevel,
            hasNegatives,
            negatives: negatives.length > 0 ? negatives : undefined,
            protestos: protestos.length > 0 ? protestos : undefined,
            summary: {
                totalDividas: negatives.reduce((sum, n) => sum + n.valor, 0) +
                    protestos.reduce((sum, p) => sum + p.valor, 0),
                quantidadeNegativacoes: negatives.length,
                quantidadeProtestos: protestos.length,
                quantidadeChequesSemFundo: 0,
                maiorDivida: Math.max(
                    ...negatives.map(n => n.valor),
                    ...protestos.map(p => p.valor),
                    0
                ),
            },
            recommendations,
            source: this.name,
            timestamp: new Date(),
            rawResponse: {
                _mock: true,
                _seed: seed,
                _cnpj: cnpj,
            },
        };
    }

    private calculateRiskLevel(score: number, hasNegatives: boolean, hasProtestos: boolean): RiskLevel {
        if (score < 400 || (hasNegatives && hasProtestos)) {
            return RiskLevel.CRITICAL;
        }
        if (score < 550 || hasNegatives) {
            return RiskLevel.HIGH;
        }
        if (score < 700 || hasProtestos) {
            return RiskLevel.MEDIUM;
        }
        return RiskLevel.LOW;
    }

    private generateMockNegatives(seed: number): CreditNegative[] {
        const count = 1 + (seed % 3); // 1-3 negativações
        const negatives: CreditNegative[] = [];

        const tipos = ['PEFIN', 'REFIN', 'CCF', 'CHEQUE_SEM_FUNDO'];
        const credores = ['Banco do Brasil', 'Bradesco', 'Itaú', 'Santander', 'Caixa'];

        for (let i = 0; i < count; i++) {
            const daysAgo = 30 + (seed % 365) + (i * 60);
            const dataOcorrencia = new Date();
            dataOcorrencia.setDate(dataOcorrencia.getDate() - daysAgo);

            negatives.push({
                tipo: tipos[(seed + i) % tipos.length],
                valor: 1000 + ((seed * (i + 1)) % 50000),
                dataOcorrencia: dataOcorrencia.toISOString().split('T')[0],
                credor: credores[(seed + i) % credores.length],
                cidade: 'São Paulo',
                uf: 'SP',
            });
        }

        return negatives;
    }

    private generateMockProtestos(seed: number): CreditProtesto[] {
        const count = 1 + (seed % 2); // 1-2 protestos
        const protestos: CreditProtesto[] = [];

        const cartorios = ['1º Tabelionato', '2º Tabelionato', '3º Tabelionato'];

        for (let i = 0; i < count; i++) {
            const daysAgo = 60 + (seed % 180) + (i * 30);
            const dataProtesto = new Date();
            dataProtesto.setDate(dataProtesto.getDate() - daysAgo);

            protestos.push({
                valor: 500 + ((seed * (i + 1)) % 10000),
                dataProtesto: dataProtesto.toISOString().split('T')[0],
                cartorio: cartorios[(seed + i) % cartorios.length],
                cidade: 'São Paulo',
                uf: 'SP',
            });
        }

        return protestos;
    }

    private generateRecommendations(score: number, hasNegatives: boolean, hasProtestos: boolean): string[] {
        const recommendations: string[] = [];

        if (score >= 700 && !hasNegatives && !hasProtestos) {
            recommendations.push('Empresa com bom histórico de crédito');
            recommendations.push('Baixo risco para parceria comercial');
        } else if (score >= 550) {
            recommendations.push('Recomendado solicitar garantias adicionais');
            if (hasNegatives) {
                recommendations.push('Verificar regularização das pendências');
            }
        } else {
            recommendations.push('Alto risco - recomendado revisão manual');
            recommendations.push('Exigir garantias ou pagamento antecipado');
            if (hasNegatives) {
                recommendations.push('Aguardar regularização das pendências');
            }
        }

        if (hasProtestos) {
            recommendations.push('Verificar se protestos foram regularizados');
        }

        return recommendations;
    }

    private generateSeed(cnpj: string): number {
        // Gera um número determinístico baseado no CNPJ
        let hash = 0;
        for (let i = 0; i < cnpj.length; i++) {
            const char = cnpj.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    private async simulateDelay(min: number, max: number): Promise<void> {
        const delay = min + Math.random() * (max - min);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    private maskCnpj(cnpj: string): string {
        if (cnpj.length !== 14) return cnpj;
        return `${cnpj.slice(0, 5)}.***/****-**`;
    }
}
