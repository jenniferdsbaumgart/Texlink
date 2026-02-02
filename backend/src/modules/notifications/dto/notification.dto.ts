import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  ORDER_PROPOSAL_RECEIVED = 'ORDER_PROPOSAL_RECEIVED',
  ORDER_PROPOSAL_RESPONDED = 'ORDER_PROPOSAL_RESPONDED',
  ORDER_DEADLINE_APPROACHING = 'ORDER_DEADLINE_APPROACHING',
  ORDER_FINALIZED = 'ORDER_FINALIZED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_UNREAD_REMINDER = 'MESSAGE_UNREAD_REMINDER',
  CREDENTIAL_INVITE_SENT = 'CREDENTIAL_INVITE_SENT',
  CREDENTIAL_STATUS_CHANGED = 'CREDENTIAL_STATUS_CHANGED',
  CREDENTIAL_COMPLETED = 'CREDENTIAL_COMPLETED',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  PAYMENT_REGISTERED = 'PAYMENT_REGISTERED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_MESSAGE_ADDED = 'TICKET_MESSAGE_ADDED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  RELATIONSHIP_REQUESTED = 'RELATIONSHIP_REQUESTED',
  RELATIONSHIP_STATUS_CHANGED = 'RELATIONSHIP_STATUS_CHANGED',
  RATING_RECEIVED = 'RATING_RECEIVED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  companyId?: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  sendWhatsapp?: boolean;
}

export class CreateBulkNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsArray()
  @IsUUID('4', { each: true })
  recipientIds: string[];

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}

export class GetNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

export class MarkReadDto {
  @IsOptional()
  @IsUUID()
  notificationId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsBoolean()
  markAll?: boolean;
}

export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipientId: string;
  companyId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export class NotificationListResponseDto {
  notifications: NotificationResponseDto[];
  hasMore: boolean;
  nextCursor?: string;
  unreadCount: number;
}
