/**
 * Notification Domain Events
 *
 * These are the event names emitted by various services
 * and consumed by the notification event handlers
 */

// Order Events
export const ORDER_CREATED = 'order.created';
export const ORDER_ACCEPTED = 'order.accepted';
export const ORDER_REJECTED = 'order.rejected';
export const ORDER_STATUS_CHANGED = 'order.status.changed';
export const ORDER_FINALIZED = 'order.finalized';
export const ORDER_DEADLINE_APPROACHING = 'order.deadline.approaching';

// Message/Chat Events
export const MESSAGE_SENT = 'message.sent';
export const MESSAGE_UNREAD_REMINDER = 'message.unread.reminder';
export const PROPOSAL_SENT = 'proposal.sent';
export const PROPOSAL_RESPONDED = 'proposal.responded';

// Credential Events
export const CREDENTIAL_INVITE_SENT = 'credential.invite.sent';
export const CREDENTIAL_STATUS_CHANGED = 'credential.status.changed';
export const CREDENTIAL_COMPLETED = 'credential.completed';

// Document Events
export const DOCUMENT_UPLOADED = 'document.uploaded';
export const DOCUMENT_EXPIRING = 'document.expiring';
export const DOCUMENT_EXPIRED = 'document.expired';

// Payment Events
export const PAYMENT_REGISTERED = 'payment.registered';
export const PAYMENT_STATUS_CHANGED = 'payment.status.changed';
export const PAYMENT_RECEIVED = 'payment.received';
export const PAYMENT_OVERDUE = 'payment.overdue';

// Support Ticket Events
export const TICKET_CREATED = 'ticket.created';
export const TICKET_MESSAGE_ADDED = 'ticket.message.added';
export const TICKET_STATUS_CHANGED = 'ticket.status.changed';

// Relationship Events
export const RELATIONSHIP_REQUESTED = 'relationship.requested';
export const RELATIONSHIP_STATUS_CHANGED = 'relationship.status.changed';

// Rating Events
export const RATING_RECEIVED = 'rating.received';

// System Events
export const SYSTEM_ANNOUNCEMENT = 'system.announcement';

// Event Payload Interfaces
export interface OrderCreatedEvent {
    orderId: string;
    displayId: string;
    brandId: string;
    brandName: string;
    supplierId?: string;
    supplierName?: string;
    productName: string;
    quantity: number;
    totalValue: number;
    deadline: Date;
    targetSupplierIds?: string[];
}

export interface OrderStatusChangedEvent {
    orderId: string;
    displayId: string;
    brandId: string;
    supplierId?: string;
    previousStatus: string;
    newStatus: string;
    changedById: string;
    changedByName: string;
}

export interface OrderAcceptedEvent {
    orderId: string;
    displayId: string;
    brandId: string;
    supplierId: string;
    supplierName: string;
    acceptedById: string;
}

export interface OrderRejectedEvent {
    orderId: string;
    displayId: string;
    brandId: string;
    supplierId?: string;
    reason?: string;
    rejectedById: string;
}

export interface OrderDeadlineApproachingEvent {
    orderId: string;
    displayId: string;
    brandId: string;
    supplierId?: string;
    deadline: Date;
    hoursRemaining: number;
}

export interface MessageSentEvent {
    messageId: string;
    orderId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
}

export interface ProposalSentEvent {
    messageId: string;
    orderId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: Date;
}

export interface ProposalRespondedEvent {
    messageId: string;
    orderId: string;
    responderId: string;
    responderName: string;
    proposerId: string;
    status: 'ACCEPTED' | 'REJECTED';
}

export interface CredentialInviteSentEvent {
    credentialId: string;
    brandId: string;
    brandName: string;
    supplierEmail: string;
    supplierName?: string;
}

export interface CredentialStatusChangedEvent {
    credentialId: string;
    brandId: string;
    supplierId?: string;
    supplierName?: string;
    previousStatus: string;
    newStatus: string;
}

export interface CredentialCompletedEvent {
    credentialId: string;
    brandId: string;
    supplierId: string;
    supplierName: string;
}

export interface DocumentExpiringEvent {
    documentId: string;
    companyId: string;
    documentType: string;
    documentName: string;
    expiresAt: Date;
    daysRemaining: number;
}

export interface DocumentExpiredEvent {
    documentId: string;
    companyId: string;
    documentType: string;
    documentName: string;
    expiredAt: Date;
}

export interface PaymentRegisteredEvent {
    paymentId: string;
    orderId: string;
    orderDisplayId: string;
    brandId: string;
    supplierId: string;
    amount: number;
    dueDate: Date;
}

export interface PaymentReceivedEvent {
    paymentId: string;
    orderId: string;
    orderDisplayId: string;
    brandId: string;
    supplierId: string;
    amount: number;
    paidDate: Date;
}

export interface PaymentOverdueEvent {
    paymentId: string;
    orderId: string;
    orderDisplayId: string;
    brandId: string;
    supplierId: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
}

export interface TicketCreatedEvent {
    ticketId: string;
    displayId: string;
    companyId: string;
    createdById: string;
    createdByName: string;
    title: string;
    category: string;
    priority: string;
}

export interface TicketMessageAddedEvent {
    ticketId: string;
    displayId: string;
    messageId: string;
    senderId: string;
    senderName: string;
    isFromSupport: boolean;
    recipientId: string;
}

export interface TicketStatusChangedEvent {
    ticketId: string;
    displayId: string;
    previousStatus: string;
    newStatus: string;
    changedById: string;
    creatorId: string;
}

export interface RelationshipRequestedEvent {
    relationshipId: string;
    brandId: string;
    brandName: string;
    supplierId: string;
    supplierName: string;
    initiatedById: string;
}

export interface RelationshipStatusChangedEvent {
    relationshipId: string;
    brandId: string;
    supplierId: string;
    previousStatus: string;
    newStatus: string;
    changedById: string;
}

export interface RatingReceivedEvent {
    ratingId: string;
    orderId: string;
    orderDisplayId: string;
    fromCompanyId: string;
    fromCompanyName: string;
    toCompanyId: string;
    score: number;
    comment?: string;
}

export interface SystemAnnouncementEvent {
    title: string;
    body: string;
    targetRole?: 'BRAND' | 'SUPPLIER' | 'ALL';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
}
