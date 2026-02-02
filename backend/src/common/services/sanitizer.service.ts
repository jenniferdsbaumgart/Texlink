import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizerService {
  /**
   * Remove todo HTML e scripts do texto
   */
  sanitizeText(text: string): string {
    if (!text) return '';

    // Remove todas as tags HTML
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Sem tags permitidas
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Mantém conteúdo, remove apenas tags
    });

    // Trim e normaliza espaços
    return clean.trim().replace(/\s+/g, ' ');
  }

  /**
   * Valida e sanitiza URL
   */
  sanitizeUrl(url: string): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      // Apenas http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      return parsed.href;
    } catch {
      return null;
    }
  }

  /**
   * Valida e normaliza número
   */
  sanitizeNumber(value: unknown): number | null {
    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    return num;
  }

  /**
   * Valida e sanitiza data
   */
  sanitizeDate(value: string | number | Date | undefined | null): Date | null {
    if (value === undefined || value === null) {
      return null;
    }
    try {
      const date = new Date(value);

      if (isNaN(date.getTime())) {
        return null;
      }

      // Não aceita datas muito antigas ou futuras
      const now = Date.now();
      const diff = Math.abs(date.getTime() - now);
      const maxDiff = 10 * 365 * 24 * 60 * 60 * 1000; // 10 anos

      if (diff > maxDiff) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }
}
