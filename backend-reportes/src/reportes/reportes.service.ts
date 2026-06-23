import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AtencionesAdapter } from "./integraciones/atenciones/atenciones.adapter";
import { ClientesAdapter } from "./integraciones/parametrizacion/clientes.adapter";
import { ConsultoresAdapter } from "./integraciones/parametrizacion/consultores.adapter";
import { FinanzasAdapter } from "./integraciones/finanzas/finanzas.adapter";
import { ServiciosAdapter } from "./integraciones/parametrizacion/servicios.adapter";
import { SolicitudesAdapter } from "./integraciones/solicitudes/solicitudes.adapter";
import { AtencionRaw } from "./shared/interfaces/atenciones.interface";
import { JwtPayloadData } from "./shared/interfaces/detalle-solicitud.interface";
import { PromedioData } from "./shared/interfaces/promedioInterface";
import { ReporteData } from "./shared/interfaces/reporte.interface";
import {
  AtencionDto,
  AtencionesResponseDto,
} from "./shared/dto/atencion-response.dto";
import {
  ConsultorResumenDto,
  DetalleSolicitudResponseDto,
} from "./shared/dto/detalle-solicitud-response.dto";
import { GenerarReporteDto } from "./shared/dto/generar-reporte.dto";
import { TiempoPromedioDto } from "./shared/dto/tiempo-promedio";
import { FirebaseReporteRepository } from "./shared/repositories/firebase-reporte.repository";
import { generarExcel, generarPDF } from "./shared/utils/export.util";
import { withTimeout } from "./shared/utils/timeout.util";

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private redisClient: any = null;

  constructor(
    private readonly finanzasAdapter: FinanzasAdapter,
    private readonly firebaseRepository: FirebaseReporteRepository,
    private readonly solicitudesAdapter: SolicitudesAdapter,
    private readonly clientesAdapter: ClientesAdapter,
    private readonly serviciosAdapter: ServiciosAdapter,
    private readonly consultoresAdapter: ConsultoresAdapter,
    private readonly atencionesAdapter: AtencionesAdapter,
  ) {
    const redisHost = process.env.REDIS_HOST || "localhost";
    const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

    try {
      const RedisClient = require("ioredis");
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

  async obtenerTiempoPromedioSolicitudes(
    dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    const fechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : new Date("2000-01-01T00:00:00.000Z");
    const fechaFin = dto.fechaFin
      ? new Date(dto.fechaFin)
      : new Date("2100-01-01T00:00:00.000Z");

    const solicitudes =
      await this.solicitudesAdapter.fetchSolicitudesParaPromedio();

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
      const fin = new Date(solicitud.fechaCompletada).getTime();
      return (fin - inicio) / (1000 * 60 * 60);
    });

    const promedioHoras =
      duracionesHoras.reduce((acc, value) => acc + value, 0) /
      duracionesHoras.length;
    const promedioDias = promedioHoras / 24;
    const dias = Math.floor(promedioDias);
    const horas = Math.round(promedioHoras % 24);
    const promedioTexto = `${dias} ${dias === 1 ? "día" : "días"}, ${horas} ${
      horas === 1 ? "hora" : "horas"
    }`;

    return {
      promedio: Number(promedioHoras.toFixed(2)),
      unidad: "horas",
      promedioTexto,
      solicitudesProcesadas: solicitudesFiltradas.length,
      historicoUltimos6Meses: await this.generarHistorico(6),
    };
  }

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
        const message =
          cacheError instanceof Error ? cacheError.message : String(cacheError);
        this.logger.warn(
          `Failed to read cache: ${message}. Proceeding to source.`,
        );
      }
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

    if (this.redisClient && this.redisClient.status === "ready") {
      try {
        await this.redisClient.set(
          cacheKey,
          JSON.stringify(nuevoReporte),
          "EX",
          3600,
        );
      } catch (cacheWriteError) {
        const message =
          cacheWriteError instanceof Error
            ? cacheWriteError.message
            : String(cacheWriteError);
        this.logger.warn(`Failed to save report to cache: ${message}`);
      }
    }

    await this.firebaseRepository.saveAuditLog(nuevoReporte);
    return nuevoReporte;
  }

  async obtenerDetalleSolicitudCompletada(
    solicitudId: string,
    user: JwtPayloadData,
    ip: string,
    page = 1,
    pageSize = 10,
  ): Promise<DetalleSolicitudResponseDto> {
    const solicitud =
      await this.solicitudesAdapter.obtenerSolicitudPorId(solicitudId);

    if (!solicitud) {
      await this.registrarAccesoDetalle(solicitudId, user.sub, ip, false);
      throw new NotFoundException("No se encontro la solicitud solicitada.");
    }

    if (solicitud.estado !== "completada") {
      await this.registrarAccesoDetalle(solicitudId, user.sub, ip, false);
      throw new BadRequestException(
        "Solo se permite consultar solicitudes completadas.",
      );
    }

    if (!user.unidadIds.includes(solicitud.unidadId)) {
      await this.registrarAccesoDetalle(solicitudId, user.sub, ip, false);
      throw new ForbiddenException(
        "Permisos insuficientes para visualizar este informe de costos",
      );
    }

    const warnings: string[] = [];
    const clientePromise = this.clientesAdapter
      .obtenerClientePorId(solicitud.clienteId)
      .catch(() => {
        warnings.push(
          "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
        );
        return null;
      });

    const servicioPromise = this.serviciosAdapter
      .obtenerServicioPorId(solicitud.servicioId)
      .catch(() => {
        if (!warnings.length) {
          warnings.push(
            "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
          );
        }
        return null;
      });

    const [cliente, servicio, consultores] = await Promise.all([
      clientePromise,
      servicioPromise,
      this.consultoresAdapter.obtenerConsultoresPorSolicitud(solicitudId),
    ]);

    const total = consultores.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    await this.registrarAccesoDetalle(solicitudId, user.sub, ip, true);

    return {
      id: solicitud.id,
      servicio: {
        nombre: this.normalizarTexto(
          servicio?.nombre ?? solicitud.servicioNombre ?? null,
        ),
        tipo: this.normalizarTexto(
          servicio?.tipo ?? solicitud.servicioTipo ?? null,
        ),
      },
      cliente: this.normalizarTexto(
        cliente?.nombre ?? solicitud.clienteNombre ?? null,
      ),
      gananciaGenerada: this.formatearMoneda(solicitud.gananciaGenerada),
      fechaInicio: this.formatearFecha(solicitud.fechaInicio),
      fechaFin: this.formatearFecha(solicitud.fechaFin),
      consultorApertura: this.normalizarConsultor(solicitud.consultorApertura),
      consultorCierre: this.normalizarConsultor(solicitud.consultorCierre),
      consultoresIntervinientes: consultores
        .slice(start, start + pageSize)
        .map((consultor) => this.normalizarConsultor(consultor)),
      metadata: {
        warnings,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  }

  async obtenerAtencionesAnidadas(
    solicitudId: string,
    user: JwtPayloadData,
    ip: string,
    page = 1,
    pageSize = 25,
  ): Promise<AtencionesResponseDto> {
    await this.validarSolicitudParaAtenciones(
      solicitudId,
      user,
      ip,
      "VIEW_ATENCIONES",
    );

    const warnings: string[] = [];
    let falloCargaAtenciones = false;
    let atenciones: AtencionRaw[] = [];

    try {
      atenciones =
        await this.atencionesAdapter.obtenerAtencionesPorSolicitud(solicitudId);
    } catch {
      falloCargaAtenciones = true;
      warnings.push(
        "Error de conexión temporal: No se pudieron cargar las atenciones asociadas",
      );
    }

    if (!falloCargaAtenciones && atenciones.length === 0) {
      warnings.push("No existen atenciones asociadas a esta solicitud");
    }

    const total = atenciones.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    await this.registrarAccesoAtencion(
      solicitudId,
      user.sub,
      ip,
      "VIEW_ATENCIONES",
      true,
    );

    return {
      solicitudId,
      atenciones: atenciones
        .slice(start, start + pageSize)
        .map((atencion) => this.normalizarAtencion(atencion)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      warnings,
    };
  }

  async exportarAtenciones(
    solicitudId: string,
    formato: "pdf" | "excel",
    user: JwtPayloadData,
    ip: string,
  ): Promise<Buffer> {
    const action =
      formato === "pdf" ? "EXPORT_ATENCIONES_PDF" : "EXPORT_ATENCIONES_EXCEL";

    await this.validarSolicitudParaAtenciones(solicitudId, user, ip, action);

    let atenciones: AtencionRaw[] = [];

    try {
      atenciones =
        await this.atencionesAdapter.obtenerAtencionesPorSolicitud(solicitudId);
    } catch {
      throw new InternalServerErrorException(
        "Error al recuperar las atenciones para exportar",
      );
    }

    if (atenciones.length > 500 && formato === "pdf") {
      throw new BadRequestException(
        "No se puede exportar mas de 500 registros en PDF. Por favor, utilice el formato Excel para exportar este volumen de datos.",
      );
    }

    const atencionesNormalizadas = atenciones.map((atencion) =>
      this.normalizarAtencion(atencion),
    );

    try {
      const buffer =
        formato === "pdf"
          ? await withTimeout(generarPDF(atencionesNormalizadas), 5000)
          : await withTimeout(generarExcel(atencionesNormalizadas), 5000);

      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        action,
        true,
      );

      return buffer;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Error al generar el archivo de exportacion",
      );
    }
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

    const solicitudes =
      await this.solicitudesAdapter.fetchSolicitudesParaPromedio();

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
      const fin = new Date(solicitud.fechaCompletada).getTime();
      return (fin - inicio) / (1000 * 60 * 60);
    });

    return horas.reduce((acc, value) => acc + value, 0) / horas.length;
  }

  private async validarSolicitudParaAtenciones(
    solicitudId: string,
    user: JwtPayloadData,
    ip: string,
    action:
      | "VIEW_ATENCIONES"
      | "EXPORT_ATENCIONES_PDF"
      | "EXPORT_ATENCIONES_EXCEL",
  ): Promise<void> {
    const solicitud =
      await this.solicitudesAdapter.obtenerSolicitudPorId(solicitudId);

    if (!solicitud) {
      await this.registrarAccesoAtencion(solicitudId, user.sub, ip, action, false);
      throw new NotFoundException("No se encontro la solicitud solicitada.");
    }

    if (solicitud.estado !== "completada") {
      await this.registrarAccesoAtencion(solicitudId, user.sub, ip, action, false);
      throw new BadRequestException(
        "Solo se permite consultar solicitudes completadas.",
      );
    }

    if (!user.unidadIds.includes(solicitud.unidadId)) {
      await this.registrarAccesoAtencion(solicitudId, user.sub, ip, action, false);
      throw new ForbiddenException(
        "Permisos insuficientes para visualizar este informe de costos",
      );
    }
  }

  private normalizarTexto(value: string | null | undefined): string {
    return value?.trim() ? value : "N/A";
  }

  private formatearMoneda(value: number | null | undefined): string {
    const amount = value ?? 0;
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private formatearFecha(
    value: string | null | undefined,
    includeSeconds = false,
  ): string {
    if (!value) {
      return "N/A";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    const pad = (number: number) => String(number).padStart(2, "0");
    const datePart = [
      pad(date.getDate()),
      pad(date.getMonth() + 1),
      date.getFullYear(),
    ].join("/");
    const timePart = [
      pad(date.getHours()),
      pad(date.getMinutes()),
      ...(includeSeconds ? [pad(date.getSeconds())] : []),
    ].join(":");

    return `${datePart} ${timePart}`;
  }

  private generarTimestampAuditoria(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  private normalizarConsultor(
    consultor: ConsultorResumenDto | null,
  ): ConsultorResumenDto {
    return {
      id: consultor?.id ?? "N/A",
      nombre: this.normalizarTexto(consultor?.nombre ?? null),
    };
  }

  private normalizarAtencion(atencion: AtencionRaw): AtencionDto {
    const descripcion = atencion.descripcion?.trim()
      ? atencion.descripcion
      : "N/A";
    const descripcionTruncada =
      descripcion.length > 150
        ? descripcion.substring(0, 150) + "..."
        : descripcion;

    const fecha = this.formatearFecha(atencion.fechaHora, true);

    return {
      id: atencion.id,
      descripcion: descripcionTruncada,
      lugar: this.normalizarTexto(atencion.lugar),
      fecha,
      nombreConsultor: this.normalizarTexto(atencion.nombreConsultor),
    };
  }

  private async registrarAccesoDetalle(
    solicitudId: string,
    userId: string,
    ip: string,
    allowed: boolean,
  ): Promise<void> {
    await this.firebaseRepository.saveAccessLog({
      action: "VIEW_SOLICITUD_DETALLE",
      solicitudId,
      userId,
      timestamp: this.generarTimestampAuditoria(),
      ip,
      allowed,
    });
  }

  private async registrarAccesoAtencion(
    solicitudId: string,
    userId: string,
    ip: string,
    action:
      | "VIEW_ATENCIONES"
      | "EXPORT_ATENCIONES_PDF"
      | "EXPORT_ATENCIONES_EXCEL",
    allowed: boolean,
  ): Promise<void> {
    await this.firebaseRepository.saveAccessLog({
      action,
      solicitudId,
      userId,
      timestamp: this.generarTimestampAuditoria(),
      ip,
      allowed,
    });
  }

  async obtenerClientes(depto?: string) {
    if (depto) {
      return await this.clientesAdapter.obtenerClientesDepto(depto);
    }
    return await this.clientesAdapter.obtenerClientes();
  }

  async obtenerClientePorID(id: string) {
    return await this.clientesAdapter.obtenerClientePorId(id);
  }

  async obtenerDistribucionClientesPorDepartamento(
    tipo?: string,
    estado?: string,
  ) {
    return await this.clientesAdapter.obtenerDistribucionClientesPorDepartamento(
      tipo,
      estado,
    );
  }

  async obtenerDistribucionClientesPorDepartamentoResumen(
    tipo?: string,
    estado?: string,
  ) {
    return await this.clientesAdapter.obtenerDistribucionClientesPorDepartamentoResumen(
      tipo,
      estado,
    );
  }
}
