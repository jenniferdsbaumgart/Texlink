import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

export interface ServiceHealth {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private redisClient: Redis | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.initializeRedisClient();
  }

  /**
   * Initialize Redis client for health checks
   */
  private initializeRedisClient(): void {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.debug('REDIS_URL not configured, Redis health check will be skipped');
      return;
    }

    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
        enableReadyCheck: false,
      });

      this.redisClient.on('error', (err) => {
        this.logger.debug(`Redis client error: ${err.message}`);
      });

      this.logger.log('Redis health check client initialized');
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis client: ${error.message}`);
      this.redisClient = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }

  async check(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const services = { database, redis };

    // Determine overall status
    const allUp = Object.values(services).every((s) => s.status === 'up');
    const allDown = Object.values(services).every((s) => s.status === 'down');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allUp) {
      status = 'healthy';
    } else if (allDown) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // If Redis is not configured, report as up (using in-memory fallback)
      if (!process.env.REDIS_URL) {
        return {
          status: 'up',
          latency: 0,
        };
      }

      // If client not initialized, try to reinitialize
      if (!this.redisClient) {
        this.initializeRedisClient();
        if (!this.redisClient) {
          return {
            status: 'down',
            latency: Date.now() - start,
            error: 'Failed to initialize Redis client',
          };
        }
      }

      // Perform actual Redis PING
      const response = await Promise.race([
        this.redisClient.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 5000),
        ),
      ]);

      if (response === 'PONG') {
        return {
          status: 'up',
          latency: Date.now() - start,
        };
      }

      return {
        status: 'down',
        latency: Date.now() - start,
        error: `Unexpected Redis response: ${response}`,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'down',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
