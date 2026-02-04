import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { BrandDocumentsService } from './brand-documents.service';
import {
  UploadBrandDocumentDto,
  UpdateBrandDocumentDto,
  AcceptBrandDocumentDto,
  BrandDocumentFilterDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UploadedFile as StorageFile } from '../upload/storage.provider';

@Controller('brand-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandDocumentsController {
  constructor(private readonly brandDocumentsService: BrandDocumentsService) {}

  /**
   * Upload a new brand document (Brand only)
   */
  @Post()
  @Roles(UserRole.BRAND)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Body() dto: UploadBrandDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    const storageFile: StorageFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    return this.brandDocumentsService.upload(dto, storageFile, userId);
  }

  /**
   * Update a document (creates new version) - Brand only
   */
  @Patch(':id')
  @Roles(UserRole.BRAND)
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('id') userId: string,
  ) {
    const storageFile: StorageFile | null = file
      ? {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        }
      : null;

    return this.brandDocumentsService.update(id, dto, storageFile, userId);
  }

  /**
   * Get documents for brand
   */
  @Get()
  @Roles(UserRole.BRAND)
  findByBrand(
    @Query() filters: BrandDocumentFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.findByBrand(userId, filters);
  }

  /**
   * Get pending documents count for supplier (for badge)
   */
  @Get('pending-count')
  @Roles(UserRole.SUPPLIER)
  getPendingCount(@CurrentUser('id') userId: string) {
    return this.brandDocumentsService.getPendingCountForSupplier(userId);
  }

  /**
   * Get pending documents for a relationship
   */
  @Get('pending/:relationshipId')
  @Roles(UserRole.SUPPLIER)
  getPendingDocuments(
    @Param('relationshipId', ParseUUIDPipe) relationshipId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.getPendingDocuments(relationshipId, userId);
  }

  /**
   * Get documents for a brand (supplier perspective)
   */
  @Get('by-brand/:brandId')
  @Roles(UserRole.SUPPLIER)
  getDocumentsForBrand(
    @Param('brandId', ParseUUIDPipe) brandId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.getDocumentsForBrand(brandId, userId);
  }

  /**
   * Get document by ID
   */
  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.findById(id, userId);
  }

  /**
   * Get acceptance report for a document
   */
  @Get(':id/acceptances')
  @Roles(UserRole.BRAND)
  getAcceptanceReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.getAcceptanceReport(id, userId);
  }

  /**
   * Archive a document
   */
  @Delete(':id')
  @Roles(UserRole.BRAND)
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.archive(id, userId);
  }

  /**
   * Accept a document (Supplier)
   */
  @Post('accept')
  @Roles(UserRole.SUPPLIER)
  accept(
    @Body() dto: AcceptBrandDocumentDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || null;

    return this.brandDocumentsService.accept(dto, userId, clientIp, userAgent);
  }

  /**
   * Send reminders to pending suppliers
   */
  @Post(':id/send-reminders')
  @Roles(UserRole.BRAND)
  sendReminders(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.brandDocumentsService.sendReminders(id, userId);
  }
}
