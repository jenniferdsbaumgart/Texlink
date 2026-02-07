import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { SanitizerService } from './services/sanitizer.service';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  providers: [RateLimiterService, SanitizerService, CacheService],
  exports: [RateLimiterService, SanitizerService, CacheService],
})
export class CommonModule {}
