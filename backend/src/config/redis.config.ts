import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const createRedisClient = (configService: ConfigService) => {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
    });
  }

  // Fallback para desenvolvimento sem Redis
  return null;
};
