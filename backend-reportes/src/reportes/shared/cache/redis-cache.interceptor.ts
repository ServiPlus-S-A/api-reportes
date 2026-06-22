import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { RedisCacheService } from "./redis-cache.service";
import { Reflector } from "@nestjs/core";
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from "./redis-cache.decorator";

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const keyPattern = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const ttlSeconds = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    if (!keyPattern) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    let actualKey = keyPattern;

    if (request.method === "POST" && request.body) {
      actualKey +=
        ":" +
        Buffer.from(JSON.stringify(request.body))
          .toString("base64")
          .substring(0, 32);
    }

    try {
      const cached = await this.cacheService.get(actualKey);
      if (cached) {
        this.logger.log(`Cache HIT for key: ${actualKey}`);
        return of(JSON.parse(cached));
      }
    } catch (e) {
      this.logger.warn(`Error reading from cache: ${e.message}`);
    }

    this.logger.log(
      `Cache MISS for key: ${actualKey}. Guardando resultados procesados...`,
    );

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheService.set(
            actualKey,
            JSON.stringify(response),
            ttlSeconds || 3600,
          );
        } catch (e) {
          this.logger.warn(`Error writing to cache: ${e.message}`);
        }
      }),
    );
  }
}
