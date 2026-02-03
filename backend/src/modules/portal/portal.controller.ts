import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ThrottleApi } from '../../common/decorators/throttle.decorator';

@ApiTags('Portal do Fornecedor')
@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPLIER)
@ThrottleApi()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Resumo do dashboard do portal',
    description:
      'Retorna métricas resumidas para o dashboard do fornecedor: ' +
      'pedidos ativos, aguardando aceite, entregas próximas, documentos pendentes e alertas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo do portal',
    schema: {
      example: {
        activeOrders: 8,
        pendingAccept: 3,
        upcomingDeliveries: 2,
        pendingDocuments: 1,
        bankDataComplete: false,
        alerts: [
          {
            id: 'bank-incomplete',
            type: 'warning',
            title: 'Complete seus dados bancários',
            message: 'Para receber repasses, preencha suas informações bancárias.',
            actionLabel: 'Atualizar dados',
            actionPath: '/portal/configuracoes',
          },
        ],
      },
    },
  })
  async getSummary(@CurrentUser('id') userId: string) {
    return this.portalService.getSummary(userId);
  }

  @Get('performance')
  @ApiOperation({
    summary: 'Métricas de performance do fornecedor',
    description:
      'Retorna métricas de desempenho: pedidos concluídos, taxa de aceite, ' +
      'tempo médio, taxa de cancelamento, receita total e dados para gráficos.',
  })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Data inicial (ISO 8601)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'Data final (ISO 8601)',
    example: '2026-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados de performance',
  })
  async getPerformance(
    @CurrentUser('id') userId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.portalService.getPerformance(
      userId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
  }

  @Get('revenue-history')
  @ApiOperation({
    summary: 'Histórico de receita mensal',
    description:
      'Retorna histórico de receita dos últimos N meses para gráficos.',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Número de meses (padrão: 6)',
    example: 6,
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico mensal',
    schema: {
      example: [
        { month: 'Jan', revenue: 25000, orders: 12 },
        { month: 'Fev', revenue: 32000, orders: 15 },
        { month: 'Mar', revenue: 28000, orders: 14 },
      ],
    },
  })
  async getRevenueHistory(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
  ) {
    return this.portalService.getRevenueHistory(
      userId,
      months ? parseInt(months, 10) : 6,
    );
  }
}
