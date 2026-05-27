import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { FinanzasAdapter } from "./adapters/finanzas.adapter";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";
import { ReporteData } from "./interfaces/reporte.interface";

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private redisClient: Redis | null = null;

  constructor(
    private readonly finanzasAdapter: FinanzasAdapter,
    private readonly firebaseRepository: FirebaseReporteRepository,
  ) {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

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
            return null; // Stop retrying
          }
          return 500;
        },
      });

      this.redisClient.on("error", (err) => {
        this.logger.warn(
          `Redis Cache Connection Error: ${err.message}. Bypassing Redis cache.`,
        );
      });
    } catch (e) {
      this.logger.error(`Redis Initialization Error: ${e.message}`);
    }
  }

  // [Pattern: Cache-Aside]
  async generarReporte(
    dto: GenerarReporteDto,
    usuario: string,
  ): Promise<ReporteData> {
    const cacheKey = `reporte:${dto.tipo}:${dto.periodo}`;

    // 1. Try reading from Cache (Redis)
    if (this.redisClient && this.redisClient.status === "ready") {
      try {
        const cachedData = await this.redisClient.get(cacheKey);
        if (cachedData) {
          this.logger.log(`Cache Hit for key: ${cacheKey}`);
          const parseResult = JSON.parse(cachedData) as ReporteData;
          // Audit cached retrieval as well
          await this.firebaseRepository.saveAuditLog({
            ...parseResult,
            generadoPor: usuario,
          });
          return parseResult;
        }
      } catch (cacheError) {
        this.logger.warn(
          `Failed to read cache: ${cacheError.message}. Proceeding to source.`,
        );
      }
    }

    this.logger.log(
      `Cache Miss for key: ${cacheKey}. Generating fresh report...`,
    );

    // 2. Fetch fresh data from adapter
    const rawData = await this.finanzasAdapter.fetchIngresosPorPeriodo(
      dto.periodo,
    );

    // 3. Process data (ISO 25010: Functional suitability and correctness)
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

    const balance = totalIngresos - totalEgresos;

    const nuevoReporte: ReporteData = {
      id: Math.random().toString(36).substring(2, 11),
      periodo: dto.periodo,
      tipo: dto.tipo,
      totalIngresos,
      totalEgresos,
      balance,
      generadoPor: usuario,
      fechaCreacion: new Date().toISOString(),
      detalles: rawData,
    };

    // 4. Save to Cache
    if (this.redisClient && this.redisClient.status === "ready") {
      try {
        // Set TTL to 1 hour (3600 seconds)
        await this.redisClient.set(
          cacheKey,
          JSON.stringify(nuevoReporte),
          "EX",
          3600,
        );
        this.logger.log(`Fresh report saved to cache under key: ${cacheKey}`);
      } catch (cacheWriteError) {
        this.logger.warn(
          `Failed to save report to cache: ${cacheWriteError.message}`,
        );
      }
    }

    // 5. Append to Audit Logs (Security / Auditing)
    await this.firebaseRepository.saveAuditLog(nuevoReporte);

    return nuevoReporte;
  }
}
