import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private usingRedis = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
        });
        await this.redis.connect();
        this.usingRedis = true;
        this.logger.log('Redis cache connected');
      } catch (error) {
        this.logger.warn(
          `Redis unavailable, using in-memory cache: ${(error as Error).message}`,
        );
        this.redis = null;
      }
    } else {
      this.logger.warn('REDIS_URL not configured, using in-memory cache');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.usingRedis && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      }

      const entry = this.memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        return JSON.parse(entry.value);
      }
      this.memoryCache.delete(key);
      return null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (this.usingRedis && this.redis) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        this.memoryCache.set(key, {
          value: serialized,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
    } catch {
      // Silently fail — cache is optional
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.usingRedis && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch {
      // Silently fail
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    try {
      if (this.usingRedis && this.redis) {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(prefix)) {
            this.memoryCache.delete(key);
          }
        }
      }
    } catch {
      // Silently fail
    }
  }

  isUsingRedis(): boolean {
    return this.usingRedis;
  }
}
