import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { SanitizerService } from './services/sanitizer.service';

@Global()
@Module({
  providers: [RateLimiterService, SanitizerService],
  exports: [RateLimiterService, SanitizerService],
})
export class CommonModule {}
