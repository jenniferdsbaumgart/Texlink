import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, CompanyStatus, CompanyType, SupplierDocumentType, SupplierDocumentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Get dashboard metrics
  async getDashboard() {
    const [
      totalOrders,
      activeOrders,
      completedOrders,
      totalSuppliers,
      activeSuppliers,
      pendingSuppliers,
      totalBrands,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.LANCADO_PELA_MARCA,
              OrderStatus.ACEITO_PELA_FACCAO,
              OrderStatus.EM_PRODUCAO,
            ],
          },
        },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.FINALIZADO } }),
      this.prisma.company.count({ where: { type: CompanyType.SUPPLIER } }),
      this.prisma.company.count({
        where: { type: CompanyType.SUPPLIER, status: CompanyStatus.ACTIVE },
      }),
      this.prisma.company.count({
        where: { type: CompanyType.SUPPLIER, status: CompanyStatus.PENDING },
      }),
      this.prisma.company.count({ where: { type: CompanyType.BRAND } }),
      this.prisma.order.aggregate({
        where: { status: OrderStatus.FINALIZADO },
        _sum: { totalValue: true },
      }),
    ]);

    // Recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { tradeName: true } },
        supplier: { select: { tradeName: true } },
      },
    });

    return {
      metrics: {
        totalOrders,
        activeOrders,
        completedOrders,
        totalSuppliers,
        activeSuppliers,
        pendingSuppliers,
        totalBrands,
        totalRevenue: totalRevenue._sum.totalValue || 0,
      },
      recentOrders,
    };
  }

  // Get pending supplier approvals
  async getPendingApprovals() {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        status: CompanyStatus.PENDING,
      },
      include: {
        supplierProfile: true,
        companyUsers: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Approve or suspend a supplier
  async updateSupplierStatus(companyId: string, status: CompanyStatus) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: { status },
    });
  }

  // Get all suppliers with filters
  async getSuppliers(status?: CompanyStatus) {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        ...(status && { status }),
      },
      include: {
        supplierProfile: true,
        _count: { select: { ordersAsSupplier: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all brands
  async getBrands(status?: CompanyStatus) {
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.BRAND,
        ...(status && { status }),
      },
      include: {
        _count: { select: { ordersAsBrand: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all orders with filters
  async getOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        brand: { select: { id: true, tradeName: true } },
        supplier: { select: { id: true, tradeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Calculate document status based on expiration date
  private calculateDocumentStatus(expiresAt: Date | null, hasFile: boolean): SupplierDocumentStatus {
    if (!hasFile) {
      return SupplierDocumentStatus.PENDING;
    }
    if (!expiresAt) {
      return SupplierDocumentStatus.VALID;
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiresAt < now) {
      return SupplierDocumentStatus.EXPIRED;
    } else if (expiresAt < thirtyDaysFromNow) {
      return SupplierDocumentStatus.EXPIRING_SOON;
    }

    return SupplierDocumentStatus.VALID;
  }

  // Get all documents from all suppliers
  async getAllDocuments(
    supplierId?: string,
    type?: SupplierDocumentType,
    status?: SupplierDocumentStatus,
  ) {
    const whereClause: any = {};

    if (supplierId) {
      whereClause.companyId = supplierId;
    }

    if (type) {
      whereClause.type = type;
    }

    const documents = await this.prisma.supplierDocument.findMany({
      where: whereClause,
      include: {
        company: { select: { id: true, tradeName: true, document: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    // Recalculate status and filter if needed
    const processedDocs = documents.map((doc) => {
      const calculatedStatus = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      return { ...doc, status: calculatedStatus };
    });

    // Filter by status after recalculation
    if (status) {
      return processedDocs.filter((doc) => doc.status === status);
    }

    return processedDocs;
  }

  // Get document stats across all suppliers
  async getDocumentsStats() {
    const documents = await this.prisma.supplierDocument.findMany({
      select: {
        id: true,
        fileUrl: true,
        expiresAt: true,
      },
    });

    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;
    let pending = 0;

    documents.forEach((doc) => {
      const status = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      switch (status) {
        case SupplierDocumentStatus.VALID:
          valid++;
          break;
        case SupplierDocumentStatus.EXPIRING_SOON:
          expiringSoon++;
          break;
        case SupplierDocumentStatus.EXPIRED:
          expired++;
          break;
        case SupplierDocumentStatus.PENDING:
          pending++;
          break;
      }
    });

    // Get unique supplier count
    const suppliersWithDocs = await this.prisma.supplierDocument.groupBy({
      by: ['companyId'],
    });

    return {
      total: documents.length,
      valid,
      expiringSoon,
      expired,
      pending,
      suppliersCount: suppliersWithDocs.length,
    };
  }

  // Get documents for a specific supplier
  async getSupplierDocuments(supplierId: string) {
    const documents = await this.prisma.supplierDocument.findMany({
      where: { companyId: supplierId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    // Recalculate status for accuracy
    return documents.map((doc) => {
      const calculatedStatus = this.calculateDocumentStatus(doc.expiresAt, !!doc.fileUrl);
      return { ...doc, status: calculatedStatus };
    });
  }

  /**
   * Get monthly revenue history for dashboard charts
   * Returns last N months of revenue data
   */
  async getRevenueHistory(months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const monthlyData = await this.prisma.$queryRaw<
      { month: Date; revenue: number; orders: number; previousRevenue: number }[]
    >`
      WITH current_period AS (
        SELECT
          DATE_TRUNC('month', "updatedAt") as month,
          COALESCE(SUM("totalValue"), 0)::float as revenue,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE "status" = 'FINALIZADO'
          AND "updatedAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "updatedAt")
      ),
      previous_period AS (
        SELECT
          DATE_TRUNC('month', "updatedAt" + INTERVAL '${months} months') as month,
          COALESCE(SUM("totalValue"), 0)::float as previous_revenue
        FROM "Order"
        WHERE "status" = 'FINALIZADO'
          AND "updatedAt" >= ${startDate} - INTERVAL '${months} months'
          AND "updatedAt" < ${startDate}
        GROUP BY DATE_TRUNC('month', "updatedAt" + INTERVAL '${months} months')
      )
      SELECT
        c.month,
        c.revenue,
        c.orders,
        COALESCE(p.previous_revenue, 0)::float as "previousRevenue"
      FROM current_period c
      LEFT JOIN previous_period p ON c.month = p.month
      ORDER BY c.month ASC
    `;

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    return monthlyData.map((d) => ({
      month: monthNames[d.month.getMonth()],
      fullMonth: d.month.toISOString(),
      revenue: Number(d.revenue) || 0,
      previousRevenue: Number(d.previousRevenue) || 0,
      orders: Number(d.orders) || 0,
      growth: d.previousRevenue > 0
        ? Math.round(((d.revenue - d.previousRevenue) / d.previousRevenue) * 100)
        : 0,
    }));
  }

  /**
   * Get monthly order statistics
   * Returns orders by status per month
   */
  async getOrdersMonthlyStats(months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [monthlyOrders, byStatus, byBrand] = await Promise.all([
      // Orders per month
      this.prisma.$queryRaw<{ month: Date; total: number; value: number }[]>`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*)::int as total,
          COALESCE(SUM("totalValue"), 0)::float as value
        FROM "Order"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      // Orders by status
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalValue: true },
      }),
      // Orders by brand (top 5)
      this.prisma.order.groupBy({
        by: ['brandId'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        _sum: { totalValue: true },
        orderBy: { _sum: { totalValue: 'desc' } },
        take: 5,
      }),
    ]);

    // Get brand names
    const brandIds = byBrand.map((b) => b.brandId);
    const brands = await this.prisma.company.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, tradeName: true },
    });
    const brandMap = new Map(brands.map((b) => [b.id, b.tradeName]));

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    const statusNames: Record<string, string> = {
      FINALIZADO: 'Concluído',
      EM_PRODUCAO: 'Em Produção',
      ACEITO_PELA_FACCAO: 'Aceito',
      LANCADO_PELA_MARCA: 'Novo',
      RECUSADO_PELA_FACCAO: 'Recusado',
      PRONTO: 'Pronto',
      EM_TRANSITO_PARA_MARCA: 'Em Trânsito',
      DISPONIVEL_PARA_OUTRAS: 'Disponível',
    };

    return {
      monthly: monthlyOrders.map((m) => ({
        month: monthNames[m.month.getMonth()],
        total: Number(m.total) || 0,
        value: Number(m.value) || 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: statusNames[s.status] || s.status,
        count: s._count,
        value: Number(s._sum.totalValue) || 0,
      })),
      byBrand: byBrand.map((b) => ({
        brand: brandMap.get(b.brandId) || 'Desconhecido',
        count: b._count,
        value: Number(b._sum.totalValue) || 0,
      })),
    };
  }
}
