import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import Redis from "ioredis";
import { FinanzasAdapter } from "../../integraciones/finanzas/finanzas.adapter";
import { FirebaseReporteRepository } from "../../shared/repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";
import { ComercialAdapter } from "../../integraciones/comercial/comercial.adapter";
import {
  IngresosTipoServicioQueryDto,
  MonedaEnum,
} from "../../shared/dto/ingresos-tipo-servicio-query.dto";
import { ResumenIngresosTipoServicioDto } from "../../shared/dto/ingresos-tipo-servicio-response.dto";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";
import { ResumenPorTipo } from "../../shared/interfaces/ingresos-servicio.interface";

@Injectable()
export class FinanzasAnalyticsService {
  private readonly logger = new Logger(FinanzasAnalyticsService.name);
  private redisClient: any = null;

  constructor(
    private readonly finanzasAdapter: FinanzasAdapter,
    private readonly firebaseRepository: FirebaseReporteRepository,
    private readonly comercialAdapter: ComercialAdapter,
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

  // ─── HU-09: Análisis Financiero — Ingresos por Tipo de Servicio ────────────

  async obtenerIngresosPorTipoServicio(
    dto: IngresosTipoServicioQueryDto,
    user: JwtPayloadData,
    ip: string,
  ): Promise<ResumenIngresosTipoServicioDto> {
    const IVA_RATE = Number(process.env.IVA_RATE ?? 0.19);
    const USD_RATE = Number(process.env.USD_EXCHANGE_RATE ?? 0.00025);

    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : new Date("2000-01-01T00:00:00.000Z");
    const fechaFin = dto.fechaFin
      ? new Date(`${dto.fechaFin}T23:59:59.999Z`)
      : new Date("2100-12-31T23:59:59.999Z");
    const moneda = dto.moneda ?? MonedaEnum.COP;

    let facturas: Awaited<ReturnType<ComercialAdapter["fetchFacturasPagadas"]>>;

    try {
      facturas = await this.comercialAdapter.fetchFacturasPagadas();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al obtener facturas del módulo comercial: ${message}`);
      throw new InternalServerErrorException(
        "Error de integración: No se pudo obtener la información financiera en este momento",
      );
    }

    // Filtrar: solo facturas Pagadas dentro del rango de fechas
    const facturasFiltradas = facturas.filter((factura) => {
      if (factura.estadoFactura !== "Pagada") return false;
      const fecha = new Date(factura.fechaFactura);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    const fechaInicioStr = dto.fechaInicio ?? "2000-01-01";
    const fechaFinStr = dto.fechaFin ?? "2100-12-31";

    if (facturasFiltradas.length === 0) {
      await this.registrarAccesoAnalisisFinanciero(user.sub, false, ip);
      return {
        moneda,
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
        grafico: [],
        tabla: [],
        mensaje: "No se registran ingresos para los filtros aplicados",
      };
    }

    // Agrupar por tipoServicio
    const agrupado = new Map<string, ResumenPorTipo>();

    for (const factura of facturasFiltradas) {
      const tipo = factura.tipoServicio;
      let montoBase = factura.monto;

      // Normalizar a COP si la factura viene en USD
      if (factura.moneda === "USD" && moneda === MonedaEnum.COP) {
        montoBase = montoBase / USD_RATE;
      }

      // Convertir a USD si el reporte lo requiere
      if (moneda === MonedaEnum.USD) {
        montoBase = factura.moneda === "USD" ? montoBase : montoBase * USD_RATE;
      }

      const impuestos = montoBase * IVA_RATE;
      const totalNeto = montoBase + impuestos;

      if (!agrupado.has(tipo)) {
        agrupado.set(tipo, {
          tipoServicio: tipo,
          cantidadAtenciones: 0,
          subtotalIngresos: 0,
          impuestos: 0,
          totalNetoRecaudado: 0,
        });
      }

      const resumen = agrupado.get(tipo)!;
      resumen.cantidadAtenciones += 1;
      resumen.subtotalIngresos += montoBase;
      resumen.impuestos += impuestos;
      resumen.totalNetoRecaudado += totalNeto;
    }

    const tabla: ResumenPorTipo[] = Array.from(agrupado.values()).map((r) => ({
      ...r,
      subtotalIngresos: Number(r.subtotalIngresos.toFixed(2)),
      impuestos: Number(r.impuestos.toFixed(2)),
      totalNetoRecaudado: Number(r.totalNetoRecaudado.toFixed(2)),
    }));

    const totalGeneral = tabla.reduce(
      (acc, r) => acc + r.totalNetoRecaudado,
      0,
    );

    const grafico = tabla.map((r) => ({
      tipoServicio: r.tipoServicio,
      total: r.totalNetoRecaudado,
      porcentaje:
        totalGeneral > 0
          ? Number(((r.totalNetoRecaudado / totalGeneral) * 100).toFixed(2))
          : 0,
    }));

    await this.registrarAccesoAnalisisFinanciero(user.sub, true, ip);

    return {
      moneda,
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr,
      grafico,
      tabla,
    };
  }

  private async registrarAccesoAnalisisFinanciero(
    userId: string,
    allowed: boolean,
    ip: string,
  ): Promise<void> {
    await this.firebaseRepository.saveAccessLog({
      action: "VIEW_ANALISIS_FINANCIERO_INGRESOS",
      solicitudId: "N/A",
      userId,
      timestamp: this.generarTimestampAuditoria(),
      ip,
      allowed,
    });
  }

  private generarTimestampAuditoria(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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
