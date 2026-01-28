import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Chat E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let testOrderId: string;
    let testBrandUserId: string;
    let testSupplierUserId: string;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());

        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Setup test data
        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });

    async function setupTestData() {
        // Find or create demo users from seed data
        const brandUser = await prisma.user.findFirst({
            where: { email: 'demo-brand@texlink.com' },
        });

        const supplierUser = await prisma.user.findFirst({
            where: { email: 'demo-supplier@texlink.com' },
        });

        if (brandUser) {
            testBrandUserId = brandUser.id;
            authToken = `mock-token-${testBrandUserId}`;
        }

        if (supplierUser) {
            testSupplierUserId = supplierUser.id;
        }

        // Find an existing order from demo data
        const existingOrder = await prisma.order.findFirst({
            where: {
                status: { not: 'CONCLUIDO' },
            },
        });

        if (existingOrder) {
            testOrderId = existingOrder.id;
        }
    }

    async function cleanupTestData() {
        // Only clean up messages we created during tests
        if (testOrderId) {
            await prisma.message.deleteMany({
                where: {
                    orderId: testOrderId,
                    content: { contains: 'E2E Test' },
                },
            });
        }
    }

    describe('Chat REST API', () => {
        describe('GET /orders/:orderId/chat', () => {
            it('should return messages with pagination', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                const response = await request(app.getHttpServer())
                    .get(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('messages');
                expect(Array.isArray(response.body.messages)).toBe(true);
                expect(response.body).toHaveProperty('hasMore');
                expect(typeof response.body.hasMore).toBe('boolean');
            });

            it('should support limit parameter', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                const response = await request(app.getHttpServer())
                    .get(`/orders/${testOrderId}/chat?limit=10`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.messages.length).toBeLessThanOrEqual(10);
            });

            it('should return 401 without auth token', async () => {
                if (!testOrderId) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                await request(app.getHttpServer())
                    .get(`/orders/${testOrderId}/chat`)
                    .expect(401);
            });
        });

        describe('POST /orders/:orderId/chat', () => {
            it('should create a text message', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                const response = await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'TEXT',
                        content: 'E2E Test Message',
                    })
                    .expect(201);

                expect(response.body).toHaveProperty('id');
                expect(response.body.content).toBe('E2E Test Message');
                expect(response.body.type).toBe('TEXT');
                expect(response.body.orderId).toBe(testOrderId);
            });

            it('should create a proposal message', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                const response = await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'PROPOSAL',
                        proposedPrice: 45.5,
                        proposedQuantity: 100,
                        proposedDeadline: '2026-06-01',
                    })
                    .expect(201);

                expect(response.body).toHaveProperty('id');
                expect(response.body.type).toBe('PROPOSAL');
                expect(response.body.proposalData).toBeDefined();
                expect(response.body.proposalData.status).toBe('PENDING');
            });

            it('should reject message with invalid type', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'INVALID_TYPE',
                        content: 'Test',
                    })
                    .expect(400);
            });

            it('should reject proposal with missing fields', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'PROPOSAL',
                        proposedPrice: 45.5,
                        // Missing proposedQuantity and proposedDeadline
                    })
                    .expect(400);
            });
        });

        describe('GET /orders/:orderId/chat/unread', () => {
            it('should return unread count', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                const response = await request(app.getHttpServer())
                    .get(`/orders/${testOrderId}/chat/unread`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('unreadCount');
                expect(typeof response.body.unreadCount).toBe('number');
                expect(response.body.unreadCount).toBeGreaterThanOrEqual(0);
            });
        });

        describe('PATCH /orders/:orderId/chat/messages/:messageId/accept', () => {
            it('should accept a proposal', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                // First, create a proposal
                const proposalResponse = await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'PROPOSAL',
                        proposedPrice: 42.0,
                        proposedQuantity: 150,
                        proposedDeadline: '2026-07-01',
                    })
                    .expect(201);

                const proposalId = proposalResponse.body.id;

                // Accept the proposal
                const response = await request(app.getHttpServer())
                    .patch(`/orders/${testOrderId}/chat/messages/${proposalId}/accept`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('id');
                expect(response.body.pricePerUnit).toBe(42.0);
                expect(response.body.quantity).toBe(150);
            });
        });

        describe('PATCH /orders/:orderId/chat/messages/:messageId/reject', () => {
            it('should reject a proposal', async () => {
                if (!testOrderId || !authToken) {
                    console.log('Skipping test: no test data available');
                    return;
                }

                // First, create a proposal
                const proposalResponse = await request(app.getHttpServer())
                    .post(`/orders/${testOrderId}/chat`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        type: 'PROPOSAL',
                        proposedPrice: 38.0,
                        proposedQuantity: 200,
                        proposedDeadline: '2026-08-01',
                    })
                    .expect(201);

                const proposalId = proposalResponse.body.id;

                // Reject the proposal
                const response = await request(app.getHttpServer())
                    .patch(`/orders/${testOrderId}/chat/messages/${proposalId}/reject`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('id');
                expect(response.body.proposalData.status).toBe('REJECTED');
            });
        });
    });

    describe('Chat Gateway (WebSocket)', () => {
        // Note: Full WebSocket testing requires socket.io-client
        // These are placeholder tests that validate the module loads correctly

        it('should have ChatGateway registered', () => {
            const gateway = app.get('ChatGateway');
            expect(gateway).toBeDefined();
        });
    });
});
