import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";
import { FinanzasAdapter } from "./adapters/finanzas.adapter";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";
import { TiempoPromedioDto } from "./dto/tiempo-promedio";
import { PromedioData } from "./interfaces/promedioInterface";
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
    } catch (e) {
      this.logger.error(`Redis Initialization Error: ${e.message}`);
    }
  }

  async obtenerTiempoPromedioSolicitudes(
    dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : new Date("2000-01-01T00:00:00.000Z");
    const fechaFin = dto.fechaFin
      ? new Date(dto.fechaFin)
      : new Date("2100-01-01T00:00:00.000Z");

    const solicitudes = await this.finanzasAdapter.fetchSolicitudesParaPromedio();

    const solicitudesFiltradas = solicitudes.filter((solicitud) => {
      const fechaCreacion = new Date(solicitud.fechaCreacion);
      const coincideTipo =
        !dto.tipoServicio ||
        solicitud.tipoServicio.toLowerCase() ===
          dto.tipoServicio.toLowerCase();
      const coincideRango =
        fechaCreacion >= fechaInicio && fechaCreacion <= fechaFin;
      const esCompletada =
        solicitud.estado === "Completada" &&
        solicitud.fechaCompletada !== null;

      return coincideTipo && coincideRango && esCompletada;
    });

    if (solicitudesFiltradas.length === 0) {
      return {
        promedio: 0,
        unidad: "horas",
        promedioTexto: "0.0",
        solicitudesProcesadas: 0,
        mensaje: "Sin datos de cierre para el periodo consultado",
        historicoUltimos6Meses: [],
      };
    }

    const duracionesHoras = solicitudesFiltradas.map((solicitud) => {
      const inicio = new Date(solicitud.fechaCreacion).getTime();
      const fin = new Date(solicitud.fechaCompletada!).getTime();
      return (fin - inicio) / (1000 * 60 * 60);
    });

    const promedioHoras =
      duracionesHoras.reduce((acc, value) => acc + value, 0) /
      duracionesHoras.length;
    const promedioDias = promedioHoras / 24;

    const promedioTexto = `${Math.floor(promedioDias)} día(s), ${Math.round(
      promedioHoras % 24,
    )} hora(s)`;

const historicoUltimos6Meses = await this.generarHistorico(6);

      return {
      promedio: Number(promedioHoras.toFixed(2)),
      unidad: "horas",
      promedioTexto,
      solicitudesProcesadas: solicitudesFiltradas.length,
      historicoUltimos6Meses,
    };
  }

  private async generarHistorico(cantidadMeses: number) {
    const resultado = [];
    const ahora = new Date();

    for (let i = cantidadMeses - 1; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mes = fecha.toLocaleString("es-ES", {
        month: "short",
        year: "numeric",
      });
      const promedioMes = await this.calcularPromedioMes(fecha);
      resultado.push({
        mes,
        promedioHoras: Number(promedioMes.toFixed(2)),
      });
    }

    return resultado;
  }

  private async calcularPromedioMes(fecha: Date) {
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

    const solicitudes = await this.finanzasAdapter.fetchSolicitudesParaPromedio();

    const solicitudesMes = solicitudes.filter((solicitud) => {
      if (solicitud.estado !== "Completada" || !solicitud.fechaCompletada) {
        return false;
      }

      const fechaCreacion = new Date(solicitud.fechaCreacion);
      const fechaCompletada = new Date(solicitud.fechaCompletada);

      return (
        fechaCreacion >= inicioMes &&
        fechaCreacion <= finMes &&
        fechaCompletada >= inicioMes &&
        fechaCompletada <= finMes
      );
    });

    if (solicitudesMes.length === 0) {
      return 0;
    }

    const horas = solicitudesMes.map((solicitud) => {
      const inicio = new Date(solicitud.fechaCreacion).getTime();
      const fin = new Date(solicitud.fechaCompletada!).getTime();
      return (fin - inicio) / (1000 * 60 * 60);
    });

    return horas.reduce((acc, value) => acc + value, 0) / horas.length;
  }

  // [Pattern: Cache-Aside]
  async generarReporte(
    dto: GenerarReporteDto,
    usuario: string,
  ): Promise<ReporteData> {
    const cacheKey = `reporte:${dto.tipo}:${dto.periodo}`;

    if (this.redisClient && this.redisClient.status === "ready") {
      try {
        const cachedData = await this.redisClient.get(cacheKey);
        if (cachedData) {
          this.logger.log(`Cache Hit for key: ${cacheKey}`);
          const parseResult = JSON.parse(cachedData) as ReporteData;
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

    if (this.redisClient && this.redisClient.status === "ready") {
      try {
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

    await this.firebaseRepository.saveAuditLog(nuevoReporte);

    return nuevoReporte;
  }
}
