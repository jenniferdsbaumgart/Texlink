import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createRedisClient } from '../../config/redis.config';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private messageLimiter: RateLimiterMemory | RateLimiterRedis;
  private connectionLimiter: RateLimiterMemory | RateLimiterRedis;

  constructor(private configService: ConfigService) {
    const redisClient = createRedisClient(configService);

    if (redisClient) {
      this.logger.log('Using Redis for rate limiting');

      // Limiter para mensagens (10 por minuto por usuário)
      this.messageLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rate_limit_msg',
        points: 10, // 10 mensagens
        duration: 60, // por minuto
        blockDuration: 60, // Bloqueio de 1 minuto se exceder
      });

      // Limiter para conexões (5 por minuto por IP)
      this.connectionLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rate_limit_conn',
        points: 5,
        duration: 60,
        blockDuration: 300, // Bloqueio de 5 minutos
      });
    } else {
      this.logger.warn('Redis not available, using in-memory rate limiting');

      // Fallback para memória (desenvolvimento)
      this.messageLimiter = new RateLimiterMemory({
        points: 10,
        duration: 60,
        blockDuration: 60,
      });

      this.connectionLimiter = new RateLimiterMemory({
        points: 5,
        duration: 60,
        blockDuration: 300,
      });
    }
  }

  async checkMessageLimit(userId: string): Promise<void> {
    try {
      await this.messageLimiter.consume(userId);
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }
  }

  async checkConnectionLimit(ip: string): Promise<void> {
    try {
      await this.connectionLimiter.consume(ip);
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      throw new Error(
        `Too many connection attempts. Try again in ${retryAfter} seconds.`
      );
    }
  }

  async getRemainingPoints(userId: string): Promise<number> {
    try {
      const res = await this.messageLimiter.get(userId);
      return res ? res.remainingPoints : 10;
    } catch {
      return 10;
    }
  }
}
