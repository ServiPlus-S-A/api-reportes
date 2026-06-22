import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SolicitudesAdapter } from "../../integraciones/solicitudes/solicitudes.adapter";
import { ClientesAdapter } from "../../integraciones/parametrizacion/clientes.adapter";
import { ServiciosAdapter } from "../../integraciones/parametrizacion/servicios.adapter";
import { ConsultoresAdapter } from "../../integraciones/parametrizacion/consultores.adapter";
import { AtencionesAdapter } from "../../integraciones/atenciones/atenciones.adapter";
import { FirebaseReporteRepository } from "../../shared/repositories/firebase-reporte.repository";
import {
  AtencionDto,
  AtencionesResponseDto,
} from "../../shared/dto/atencion-response.dto";
import {
  ConsultorResumenDto,
  DetalleSolicitudResponseDto,
} from "../../shared/dto/detalle-solicitud-response.dto";
import {
  SolicitudesEjecucionQueryDto,
  SolicitudesEjecucionResponseDto,
} from "../../shared/dto/solicitudes-ejecucion.dto";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";
import { AtencionRaw } from "../../shared/interfaces/atenciones.interface";
import { generarExcel, generarPDF } from "../../shared/utils/export.util";
import { withTimeout } from "../../shared/utils/timeout.util";

@Injectable()
export class TrazabilidadService {
  constructor(
    private readonly firebaseRepository: FirebaseReporteRepository,
    private readonly solicitudesAdapter: SolicitudesAdapter,
    private readonly clientesAdapter: ClientesAdapter,
    private readonly serviciosAdapter: ServiciosAdapter,
    private readonly consultoresAdapter: ConsultoresAdapter,
    private readonly atencionesAdapter: AtencionesAdapter,
  ) {}

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
        .map((c) => this.normalizarConsultor(c)),
      metadata: { warnings, pagination: { page, pageSize, total, totalPages } },
    };
  }

  async obtenerSolicitudesEnEjecucion(
    query: SolicitudesEjecucionQueryDto,
    user: JwtPayloadData,
    ip: string,
  ): Promise<SolicitudesEjecucionResponseDto> {
    await this.registrarAccesoEjecucion(user.sub, ip, true);

    const solicitudesRaw =
      await this.solicitudesAdapter.obtenerSolicitudesEnEjecucion();

    let filtradas = solicitudesRaw;

    if (query.tecnicoId) {
      filtradas = filtradas.filter((s) => s.tecnicoId === query.tecnicoId);
    }

    if (query.ordenarPor === "prioridad") {
      const ordenPrioridad: Record<string, number> = {
        Alta: 1,
        Media: 2,
        Baja: 3,
      };
      filtradas.sort((a, b) => {
        const pA = ordenPrioridad[a.prioridad] || 4;
        const pB = ordenPrioridad[b.prioridad] || 4;
        return pA - pB;
      });
    } else if (query.ordenarPor === "fechaInicio") {
      filtradas.sort((a, b) => {
        return (
          new Date(b.fechaInicioEjecucion).getTime() -
          new Date(a.fechaInicioEjecucion).getTime()
        );
      });
    }

    const now = Date.now();
    const solicitudes = filtradas.map((s) => {
      const inicio = new Date(s.fechaInicioEjecucion).getTime();
      const tiempoTranscurridoMinutos = Math.max(
        0,
        Math.floor((now - inicio) / 60000),
      );

      return {
        id: s.id,
        cliente: s.clienteNombre ?? "N/A",
        servicio: s.servicioNombre ?? "N/A",
        prioridad: s.prioridad,
        tecnicoAsignado: s.tecnicoNombre ?? "N/A",
        fechaInicioEjecucion: s.fechaInicioEjecucion,
        tiempoTranscurridoMinutos,
        porcentajeAvance: s.porcentajeAvance,
      };
    });

    const capacidadOperativa = 5;

    return {
      solicitudes,
      total: solicitudes.length,
      capacidadOperativa,
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
        .map((a) => this.normalizarAtencion(a)),
      pagination: { page, pageSize, total, totalPages },
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
        "No se puede exportar mas de 500 registros en PDF. Por favor, utilice el formato Excel.",
      );
    }

    const atencionesNormalizadas = atenciones.map((a) =>
      this.normalizarAtencion(a),
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
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        "Error al generar el archivo de exportacion",
      );
    }
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
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        action,
        false,
      );
      throw new NotFoundException("No se encontro la solicitud solicitada.");
    }
    if (solicitud.estado !== "completada") {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        action,
        false,
      );
      throw new BadRequestException(
        "Solo se permite consultar solicitudes completadas.",
      );
    }
    if (!user.unidadIds.includes(solicitud.unidadId)) {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        action,
        false,
      );
      throw new ForbiddenException(
        "Permisos insuficientes para visualizar este informe",
      );
    }
  }

  private normalizarTexto(value: string | null | undefined): string {
    return value?.trim() ? value : "N/A";
  }

  private formatearMoneda(value: number | null | undefined): string {
    const amount = value ?? 0;
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatearFecha(
    value: string | null | undefined,
    includeSeconds = false,
  ): string {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    const pad = (n: number) => String(n).padStart(2, "0");
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
    const desc = atencion.descripcion?.trim() ? atencion.descripcion : "N/A";
    const descTrunc = desc.length > 150 ? desc.substring(0, 150) + "..." : desc;
    return {
      id: atencion.id,
      descripcion: descTrunc,
      lugar: this.normalizarTexto(atencion.lugar),
      fecha: this.formatearFecha(atencion.fechaHora, true),
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
    action: string,
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

  private async registrarAccesoEjecucion(
    userId: string,
    ip: string,
    allowed: boolean,
  ): Promise<void> {
    await this.firebaseRepository.saveAccessLog({
      action: "VIEW_SOLICITUDES_EJECUCION",
      solicitudId: "N/A",
      userId,
      timestamp: this.generarTimestampAuditoria(),
      ip,
      allowed,
    });
  }
}
