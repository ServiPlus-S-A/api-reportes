import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
} from "@nestjs/common";
import { FinanzasAdapter } from "../../integraciones/finanzas/finanzas.adapter";
import { FirebaseReporteRepository } from "../../shared/repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";
import { ExportarReporteFinancieroDto } from "../../shared/dto/exportar-reporte-financiero.dto";
import { ArchivoFinanciero } from "../../shared/interfaces/factura-financiera.interface";
import {
  generarExcelFinanciero,
  generarPdfFinanciero,
} from "../../shared/utils/export-financiero.util";

@Injectable()
export class FinanzasAnalyticsService {
  private static readonly UMBRAL_VOLUMEN_ALTO = 5000;
  private static readonly MENSAJE_VOLUMEN_ALTO =
    "La exportación de un volumen alto de datos puede tardar unos segundos, ¿desea continuar?";
  private static readonly MENSAJE_MEMORIA =
    "Error crítico: El archivo es demasiado grande para ser procesado, intente filtrar por un rango de fechas menor";
  private readonly logger = new Logger(FinanzasAnalyticsService.name);
  private redisClient: any = null;

  constructor(
    private readonly finanzasAdapter: FinanzasAdapter,
    private readonly firebaseRepository: FirebaseReporteRepository,
  ) {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = Number.parseInt(process.env.REDIS_PORT || "6379", 10);

    try {
      const redisModule = require("ioredis");
      const RedisClient = redisModule.default ?? redisModule;
      this.redisClient = new RedisClient({
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

  async exportarReporteFinanciero(
    dto: ExportarReporteFinancieroDto,
  ): Promise<ArchivoFinanciero> {
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = /^\d{4}-\d{2}-\d{2}$/.test(dto.fechaFin)
      ? new Date(`${dto.fechaFin}T23:59:59.999Z`)
      : new Date(dto.fechaFin);

    if (fechaInicio > fechaFin) {
      throw new BadRequestException(
        "La fecha de inicio no puede ser posterior a la fecha fin",
      );
    }

    let facturas;
    try {
      facturas = await this.finanzasAdapter.fetchFacturasParaExportar(
        fechaInicio.toISOString(),
        fechaFin.toISOString(),
      );
    } catch (error) {
      if (this.esErrorDeMemoria(error)) {
        throw new PayloadTooLargeException(
          FinanzasAnalyticsService.MENSAJE_MEMORIA,
        );
      }
      throw error;
    }

    if (facturas.length === 0) {
      throw new BadRequestException("No hay datos disponibles para exportar");
    }

    if (
      facturas.length > FinanzasAnalyticsService.UMBRAL_VOLUMEN_ALTO &&
      !dto.confirmarVolumen
    ) {
      throw new ConflictException({
        message: FinanzasAnalyticsService.MENSAJE_VOLUMEN_ALTO,
        requiereConfirmacion: true,
        totalRegistros: facturas.length,
      });
    }

    const encabezado = {
      fechaGeneracion: new Date(),
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      logoPath: process.env.SERVIPLUS_LOGO_PATH,
    };

    try {
      const esExcel = dto.formato === "xlsx";
      const buffer = esExcel
        ? await generarExcelFinanciero(facturas, encabezado)
        : await generarPdfFinanciero(facturas, encabezado);
      const marcaTiempo = new Date().toISOString().slice(0, 10);

      return {
        buffer,
        contentType: esExcel
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf",
        nombreArchivo: `reporte-financiero-${marcaTiempo}.${dto.formato}`,
        totalRegistros: facturas.length,
      };
    } catch (error) {
      if (this.esErrorDeMemoria(error)) {
        throw new PayloadTooLargeException(
          FinanzasAnalyticsService.MENSAJE_MEMORIA,
        );
      }
      throw new InternalServerErrorException(
        "No se pudo generar el archivo financiero",
      );
    }
  }

  private esErrorDeMemoria(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      error instanceof RangeError ||
      /out of memory|heap|allocation failed|buffer too large/i.test(message)
    );
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
