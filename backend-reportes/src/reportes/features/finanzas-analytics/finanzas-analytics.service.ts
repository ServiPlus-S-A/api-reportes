import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { FinanzasAdapter } from "../../integraciones/finanzas/finanzas.adapter";
import { FirebaseReporteRepository } from "../../shared/repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";

@Injectable()
export class FinanzasAnalyticsService {
  private readonly logger = new Logger(FinanzasAnalyticsService.name);
  private redisClient: any = null;

  constructor(
    private readonly finanzasAdapter: FinanzasAdapter,
    private readonly firebaseRepository: FirebaseReporteRepository,
  ) {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = Number.parseInt(process.env.REDIS_PORT || "6379", 10);

    try {
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            this.logger.warn(
              "Redis connection failed too many times. Running without caching.",
            );
            return null;
          }
          return 500;
        },
      });

      this.redisClient.on("error", (err) => {
        this.logger.warn(
          `Redis Cache Connection Error: ${err.message}. Bypassing Redis cache.`,
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Cannot find module 'ioredis'")) {
        this.logger.error(`Redis Initialization Error: ${message}`);
      }
    }
  }

  async generarReporte(
    dto: GenerarReporteDto,
    usuario: string,
  ): Promise<ReporteData> {
    const cacheKey = `reporte:${dto.tipo}:${dto.periodo}`;

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      await this.firebaseRepository.saveAuditLog({
        ...cached,
        generadoPor: usuario,
      });
      return cached;
    }

    const rawData = await this.finanzasAdapter.fetchIngresosPorPeriodo(
      dto.periodo,
    );

    let totalIngresos = 0;
    let totalEgresos = 0;

    rawData.forEach((item) => {
      const amount = Number(item.monto) || 0;
      if (item.tipo === "ingreso") {
        totalIngresos += amount;
      } else if (item.tipo === "egreso") {
        totalEgresos += amount;
      }
    });

    const nuevoReporte: ReporteData = {
      id: Math.random().toString(36).substring(2, 11),
      periodo: dto.periodo,
      tipo: dto.tipo,
      totalIngresos,
      totalEgresos,
      balance: totalIngresos - totalEgresos,
      generadoPor: usuario,
      fechaCreacion: new Date().toISOString(),
      detalles: rawData,
    };

    await this.saveToCache(cacheKey, nuevoReporte);
    await this.firebaseRepository.saveAuditLog(nuevoReporte);
    return nuevoReporte;
  }

  private async getFromCache(key: string): Promise<ReporteData | null> {
    if (!this.redisClient || this.redisClient.status !== "ready") return null;

    try {
      const cachedData = await this.redisClient.get(key);
      if (cachedData) {
        this.logger.log(`Cache Hit for key: ${key}`);
        return JSON.parse(cachedData) as ReporteData;
      }
    } catch (cacheError) {
      const message =
        cacheError instanceof Error ? cacheError.message : String(cacheError);
      this.logger.warn(
        `Failed to read cache: ${message}. Proceeding to source.`,
      );
    }
    return null;
  }

  private async saveToCache(key: string, data: ReporteData): Promise<void> {
    if (!this.redisClient || this.redisClient.status !== "ready") return;

    try {
      await this.redisClient.set(key, JSON.stringify(data), "EX", 3600);
    } catch (cacheWriteError) {
      const message =
        cacheWriteError instanceof Error
          ? cacheWriteError.message
          : String(cacheWriteError);
      this.logger.warn(`Failed to save report to cache: ${message}`);
    }
  }
}
