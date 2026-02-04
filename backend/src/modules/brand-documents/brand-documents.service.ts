import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UploadBrandDocumentDto,
  UpdateBrandDocumentDto,
  AcceptBrandDocumentDto,
  BrandDocumentFilterDto,
} from './dto';
import {
  BrandDocumentStatus,
  BrandDocumentType,
  CompanyType,
  RelationshipStatus,
} from '@prisma/client';
import type { StorageProvider } from '../upload/storage.provider';
import { UploadedFile, STORAGE_PROVIDER, StorageResult } from '../upload/storage.provider';
import {
  CODE_OF_CONDUCT_UPLOADED,
  CODE_OF_CONDUCT_UPDATED,
  CODE_OF_CONDUCT_ACCEPTED,
  CODE_OF_CONDUCT_REMINDER,
} from '../notifications/events/notification.events';

@Injectable()
export class BrandDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Upload a new brand document
   */
  async upload(
    dto: UploadBrandDocumentDto,
    file: UploadedFile,
    userId: string,
  ) {
    // Validate file type (PDF only for documents)
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF são permitidos');
    }

    // Get the brand company for this user
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
      include: {
        company: true,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a uma marca');
    }

    const brandId = companyUser.companyId;

    // Check if there's already an active document of this type
    const existingActive = await this.prisma.brandDocument.findFirst({
      where: {
        brandId,
        type: dto.type,
        status: BrandDocumentStatus.ACTIVE,
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        'Já existe um documento ativo deste tipo. Atualize o documento existente ou arquive-o primeiro.',
      );
    }

    // Upload file
    const uploadResult = await this.storageProvider.upload(file, 'brand-documents');

    // Create document record
    const document = await this.prisma.brandDocument.create({
      data: {
        brandId,
        type: dto.type,
        status: BrandDocumentStatus.ACTIVE,
        title: dto.title,
        description: dto.description,
        fileName: file.originalname,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        mimeType: file.mimetype,
        isRequired: dto.isRequired ?? false,
        requiresReacceptance: dto.requiresReacceptance ?? true,
        uploadedById: userId,
      },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Get active relationships to notify suppliers
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: {
        brandId,
        status: RelationshipStatus.ACTIVE,
      },
      select: {
        supplierId: true,
      },
    });

    const supplierIds = relationships.map((r) => r.supplierId);

    // Emit event for notifications
    if (supplierIds.length > 0) {
      this.eventEmitter.emit(CODE_OF_CONDUCT_UPLOADED, {
        documentId: document.id,
        brandId: document.brandId,
        brandName: document.brand.tradeName || document.brand.legalName,
        documentTitle: document.title,
        isRequired: document.isRequired,
        supplierIds,
      });
    }

    return document;
  }

  /**
   * Update a document (creates new version)
   */
  async update(
    id: string,
    dto: UpdateBrandDocumentDto,
    file: UploadedFile | null,
    userId: string,
  ) {
    const document = await this.prisma.brandDocument.findUnique({
      where: { id },
      include: {
        brand: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verify user belongs to brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: document.brandId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem permissão para editar este documento');
    }

    if (document.status !== BrandDocumentStatus.ACTIVE) {
      throw new BadRequestException('Apenas documentos ativos podem ser atualizados');
    }

    let uploadResult: StorageResult | null = null;
    if (file) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Apenas arquivos PDF são permitidos');
      }
      uploadResult = await this.storageProvider.upload(file, 'brand-documents');
    }

    // Calculate new version
    const newVersionNumber = document.versionNumber + 1;
    const newVersion = `${newVersionNumber}.0`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Save current version to history
      await tx.brandDocumentVersion.create({
        data: {
          documentId: document.id,
          version: document.version,
          versionNumber: document.versionNumber,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
          uploadedById: document.uploadedById,
          notes: dto.versionNotes,
        },
      });

      // Update document - prepare data
      const updateData: Parameters<typeof tx.brandDocument.update>[0]['data'] = {
        title: dto.title ?? document.title,
        description: dto.description ?? document.description,
        isRequired: dto.isRequired ?? document.isRequired,
        requiresReacceptance: dto.requiresReacceptance ?? document.requiresReacceptance,
        version: newVersion,
        versionNumber: newVersionNumber,
      };

      if (uploadResult && file) {
        updateData.fileName = file.originalname;
        updateData.fileUrl = uploadResult.url;
        updateData.fileSize = file.size;
      }

      const updatedDocument = await tx.brandDocument.update({
        where: { id },
        data: updateData,
        include: {
          brand: {
            select: { id: true, tradeName: true, legalName: true },
          },
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      });

      // If requires reacceptance, get affected relationships
      let affectedRelationshipIds: string[] = [];
      if (document.requiresReacceptance) {
        const acceptances = await tx.brandDocumentAcceptance.findMany({
          where: { documentId: document.id },
          select: { relationshipId: true },
        });
        affectedRelationshipIds = acceptances.map((a) => a.relationshipId);

        // Delete old acceptances to require reacceptance
        await tx.brandDocumentAcceptance.deleteMany({
          where: { documentId: document.id },
        });
      }

      return { updatedDocument, affectedRelationshipIds };
    });

    // Emit event for notifications
    if (result.affectedRelationshipIds.length > 0) {
      this.eventEmitter.emit(CODE_OF_CONDUCT_UPDATED, {
        documentId: result.updatedDocument.id,
        brandId: result.updatedDocument.brandId,
        brandName:
          result.updatedDocument.brand.tradeName ||
          result.updatedDocument.brand.legalName,
        documentTitle: result.updatedDocument.title,
        newVersion: result.updatedDocument.version,
        requiresReacceptance: result.updatedDocument.requiresReacceptance,
        affectedRelationshipIds: result.affectedRelationshipIds,
      });
    }

    return result.updatedDocument;
  }

  /**
   * Get documents for brand
   */
  async findByBrand(userId: string, filters: BrandDocumentFilterDto) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.BRAND },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Usuário não pertence a uma marca');
    }

    const { type, status, page = 1, limit = 10 } = filters;

    const where = {
      brandId: companyUser.companyId,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.brandDocument.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { acceptances: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.brandDocument.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get document by ID
   */
  async findById(id: string, userId: string) {
    const document = await this.prisma.brandDocument.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        _count: {
          select: { acceptances: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verify user has access (brand or supplier with relationship)
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        OR: [
          { companyId: document.brandId },
          {
            company: {
              supplierRelationships: {
                some: {
                  brandId: document.brandId,
                  status: RelationshipStatus.ACTIVE,
                },
              },
            },
          },
        ],
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem acesso a este documento');
    }

    return document;
  }

  /**
   * Get acceptance report for a document
   */
  async getAcceptanceReport(id: string, userId: string) {
    const document = await this.prisma.brandDocument.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verify user belongs to brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: document.brandId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem permissão para ver este relatório');
    }

    // Get all active relationships for this brand
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: {
        brandId: document.brandId,
        status: RelationshipStatus.ACTIVE,
      },
      include: {
        supplier: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    // Get acceptances for this document
    const acceptances = await this.prisma.brandDocumentAcceptance.findMany({
      where: { documentId: id },
      include: {
        acceptedBy: {
          select: { id: true, name: true },
        },
        relationship: {
          include: {
            supplier: {
              select: { id: true, tradeName: true, legalName: true },
            },
          },
        },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    const acceptedRelationshipIds = new Set(acceptances.map((a) => a.relationshipId));

    const pendingSuppliers = relationships
      .filter((r) => !acceptedRelationshipIds.has(r.id))
      .map((r) => ({
        id: r.supplier.id,
        name: r.supplier.tradeName || r.supplier.legalName,
        relationshipId: r.id,
      }));

    return {
      document,
      totalSuppliers: relationships.length,
      acceptedCount: acceptances.length,
      pendingCount: pendingSuppliers.length,
      acceptances: acceptances.map((a) => ({
        id: a.id,
        acceptedAt: a.acceptedAt,
        acceptedVersion: a.acceptedVersion,
        acceptedByName: a.acceptedByName,
        acceptedByRole: a.acceptedByRole,
        supplier: {
          id: a.relationship.supplier.id,
          name:
            a.relationship.supplier.tradeName ||
            a.relationship.supplier.legalName,
        },
      })),
      pendingSuppliers,
    };
  }

  /**
   * Archive a document
   */
  async archive(id: string, userId: string) {
    const document = await this.prisma.brandDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verify user belongs to brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: document.brandId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem permissão para arquivar este documento');
    }

    if (document.status === BrandDocumentStatus.ARCHIVED) {
      throw new BadRequestException('Documento já está arquivado');
    }

    return this.prisma.brandDocument.update({
      where: { id },
      data: {
        status: BrandDocumentStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
  }

  /**
   * Accept a document (Supplier)
   */
  async accept(
    dto: AcceptBrandDocumentDto,
    userId: string,
    clientIp: string,
    userAgent: string | null,
  ) {
    if (!dto.checkboxConfirmed) {
      throw new BadRequestException('Você deve confirmar que leu e aceita o documento');
    }

    const document = await this.prisma.brandDocument.findUnique({
      where: { id: dto.documentId },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    if (document.status !== BrandDocumentStatus.ACTIVE) {
      throw new BadRequestException('Este documento não está ativo');
    }

    // Verify relationship exists and user belongs to supplier
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: dto.relationshipId },
      include: {
        supplier: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    if (relationship.brandId !== document.brandId) {
      throw new BadRequestException('Relacionamento não pertence a esta marca');
    }

    // Verify user belongs to supplier
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: relationship.supplierId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem permissão para aceitar este documento');
    }

    // Check if already accepted current version
    const existingAcceptance = await this.prisma.brandDocumentAcceptance.findUnique({
      where: {
        documentId_relationshipId: {
          documentId: dto.documentId,
          relationshipId: dto.relationshipId,
        },
      },
    });

    if (existingAcceptance) {
      throw new BadRequestException('Você já aceitou este documento');
    }

    // Create acceptance
    const acceptance = await this.prisma.brandDocumentAcceptance.create({
      data: {
        documentId: dto.documentId,
        relationshipId: dto.relationshipId,
        acceptedVersion: document.version,
        acceptedVersionNumber: document.versionNumber,
        acceptedById: userId,
        acceptedByName: dto.acceptedByName,
        acceptedByRole: dto.acceptedByRole,
        clientIp,
        userAgent,
        checkboxConfirmed: dto.checkboxConfirmed,
      },
      include: {
        document: true,
        relationship: {
          include: {
            supplier: {
              select: { id: true, tradeName: true, legalName: true },
            },
          },
        },
      },
    });

    // Emit event for notification
    this.eventEmitter.emit(CODE_OF_CONDUCT_ACCEPTED, {
      documentId: acceptance.documentId,
      acceptanceId: acceptance.id,
      brandId: document.brandId,
      supplierId: relationship.supplierId,
      supplierName:
        acceptance.relationship.supplier.tradeName ||
        acceptance.relationship.supplier.legalName,
      acceptedByName: dto.acceptedByName,
      version: document.version,
    });

    return acceptance;
  }

  /**
   * Get pending documents for a supplier relationship
   */
  async getPendingDocuments(relationshipId: string, userId: string) {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verify user belongs to supplier
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: relationship.supplierId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem acesso a este relacionamento');
    }

    // Get all active documents for this brand
    const documents = await this.prisma.brandDocument.findMany({
      where: {
        brandId: relationship.brandId,
        status: BrandDocumentStatus.ACTIVE,
      },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
        acceptances: {
          where: { relationshipId },
        },
      },
    });

    // Filter to only pending (not yet accepted)
    return documents.filter((doc) => doc.acceptances.length === 0);
  }

  /**
   * Get documents for a brand (from supplier perspective)
   */
  async getDocumentsForBrand(brandId: string, userId: string) {
    // Verify user belongs to a supplier with relationship to this brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: {
          type: CompanyType.SUPPLIER,
          supplierRelationships: {
            some: {
              brandId,
              status: RelationshipStatus.ACTIVE,
            },
          },
        },
      },
      include: {
        company: {
          include: {
            supplierRelationships: {
              where: {
                brandId,
                status: RelationshipStatus.ACTIVE,
              },
            },
          },
        },
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem relacionamento ativo com esta marca');
    }

    const relationshipId = companyUser.company.supplierRelationships[0]?.id;

    const documents = await this.prisma.brandDocument.findMany({
      where: {
        brandId,
        status: BrandDocumentStatus.ACTIVE,
      },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
        acceptances: {
          where: { relationshipId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => ({
      ...doc,
      isAccepted: doc.acceptances.length > 0,
      acceptance: doc.acceptances[0] || null,
      relationshipId,
    }));
  }

  /**
   * Get pending documents count for supplier (for badge)
   */
  async getPendingCountForSupplier(userId: string): Promise<number> {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        company: { type: CompanyType.SUPPLIER },
      },
      include: {
        company: {
          include: {
            supplierRelationships: {
              where: { status: RelationshipStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!companyUser) {
      return 0;
    }

    const relationshipIds = companyUser.company.supplierRelationships.map((r) => r.id);
    const brandIds = companyUser.company.supplierRelationships.map((r) => r.brandId);

    if (relationshipIds.length === 0) {
      return 0;
    }

    // Count active documents from all brands that haven't been accepted
    const activeDocuments = await this.prisma.brandDocument.findMany({
      where: {
        brandId: { in: brandIds },
        status: BrandDocumentStatus.ACTIVE,
        isRequired: true, // Only count required documents
      },
      select: {
        id: true,
        brandId: true,
        acceptances: {
          where: { relationshipId: { in: relationshipIds } },
          select: { id: true, relationshipId: true },
        },
      },
    });

    // Count documents without acceptances for each relationship
    let pendingCount = 0;
    for (const doc of activeDocuments) {
      const acceptedRelationshipIds = new Set(doc.acceptances.map((a) => a.relationshipId));
      const relevantRelationships = companyUser.company.supplierRelationships.filter(
        (r) => r.brandId === doc.brandId,
      );
      for (const rel of relevantRelationships) {
        if (!acceptedRelationshipIds.has(rel.id)) {
          pendingCount++;
        }
      }
    }

    return pendingCount;
  }

  /**
   * Send reminder to pending suppliers
   */
  async sendReminders(id: string, userId: string) {
    const document = await this.prisma.brandDocument.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Verify user belongs to brand
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId,
        companyId: document.brandId,
      },
    });

    if (!companyUser) {
      throw new ForbiddenException('Você não tem permissão para enviar lembretes');
    }

    // Get pending suppliers
    const relationships = await this.prisma.supplierBrandRelationship.findMany({
      where: {
        brandId: document.brandId,
        status: RelationshipStatus.ACTIVE,
      },
      include: {
        supplier: {
          select: { id: true, tradeName: true, legalName: true },
        },
      },
    });

    const acceptances = await this.prisma.brandDocumentAcceptance.findMany({
      where: { documentId: id },
      select: { relationshipId: true },
    });

    const acceptedRelationshipIds = new Set(acceptances.map((a) => a.relationshipId));

    const pendingRelationships = relationships.filter(
      (r) => !acceptedRelationshipIds.has(r.id),
    );

    // Emit reminder events
    for (const rel of pendingRelationships) {
      this.eventEmitter.emit(CODE_OF_CONDUCT_REMINDER, {
        documentId: document.id,
        brandId: document.brandId,
        brandName: document.brand.tradeName || document.brand.legalName,
        documentTitle: document.title,
        relationshipId: rel.id,
        supplierId: rel.supplierId,
        supplierName: rel.supplier.tradeName || rel.supplier.legalName,
      });
    }

    return {
      remindersSent: pendingRelationships.length,
      suppliers: pendingRelationships.map((r) => ({
        id: r.supplier.id,
        name: r.supplier.tradeName || r.supplier.legalName,
      })),
    };
  }
}
