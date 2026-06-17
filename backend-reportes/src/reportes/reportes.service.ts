import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { SolicitudesAdapter } from "./adapters/solicitudes.adapter";
import { ClientesAdapter } from "./adapters/clientes.adapter";
import { ServiciosAdapter } from "./adapters/servicios.adapter";
import { ConsultoresAdapter } from "./adapters/consultores.adapter";
import { AtencionesAdapter } from "./adapters/atenciones.adapter";
import { JwtPayloadData } from "./interfaces/detalle-solicitud.interface";
import { AtencionRaw } from "./interfaces/atenciones.interface";
import {
  ConsultorResumenDto,
  DetalleSolicitudResponseDto,
} from "./dto/detalle-solicitud-response.dto";
import {
  AtencionesResponseDto,
  AtencionDto,
} from "./dto/atencion-response.dto";
import { withTimeout } from "./utils/timeout.util";
import { generarPDF, generarExcel } from "./utils/export.util";

@Injectable()
export class ReportesService {
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
    const consultoresPaginados = consultores.slice(start, start + pageSize);

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
      gananciaGenerada: solicitud.gananciaGenerada ?? 0,
      fechaInicio: this.normalizarTexto(solicitud.fechaInicio),
      fechaFin: this.normalizarTexto(solicitud.fechaFin),
      consultorApertura: this.normalizarConsultor(solicitud.consultorApertura),
      consultorCierre: this.normalizarConsultor(solicitud.consultorCierre),
      consultoresIntervinientes: consultoresPaginados.map((consultor) =>
        this.normalizarConsultor(consultor),
      ),
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
    const solicitud =
      await this.solicitudesAdapter.obtenerSolicitudPorId(solicitudId);

    if (!solicitud) {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        "VIEW_ATENCIONES",
        false,
      );
      throw new NotFoundException("No se encontro la solicitud solicitada.");
    }

    if (solicitud.estado !== "completada") {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        "VIEW_ATENCIONES",
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
        "VIEW_ATENCIONES",
        false,
      );
      throw new ForbiddenException(
        "Permisos insuficientes para visualizar este informe de costos",
      );
    }

    const warnings: string[] = [];
    let atenciones: AtencionRaw[] = [];

    try {
      atenciones =
        await this.atencionesAdapter.obtenerAtencionesPorSolicitud(solicitudId);
    } catch (error) {
      warnings.push(
        "Advertencia: No se pudieron cargar las atenciones asociadas",
      );
    }

    if (atenciones.length === 0) {
      warnings.push(
        "No se encontraron registros de atención para esta solicitud",
      );
    }

    const total = atenciones.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const atencionesPaginadas = atenciones.slice(start, start + pageSize);

    await this.registrarAccesoAtencion(
      solicitudId,
      user.sub,
      ip,
      "VIEW_ATENCIONES",
      true,
    );

    return {
      solicitudId,
      atenciones: atencionesPaginadas.map((atencion) =>
        this.normalizarAtencion(atencion),
      ),
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
    const solicitud =
      await this.solicitudesAdapter.obtenerSolicitudPorId(solicitudId);

    if (!solicitud) {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        formato === "pdf" ? "EXPORT_ATENCIONES_PDF" : "EXPORT_ATENCIONES_EXCEL",
        false,
      );
      throw new NotFoundException("No se encontro la solicitud solicitada.");
    }

    if (solicitud.estado !== "completada") {
      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        formato === "pdf" ? "EXPORT_ATENCIONES_PDF" : "EXPORT_ATENCIONES_EXCEL",
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
        formato === "pdf" ? "EXPORT_ATENCIONES_PDF" : "EXPORT_ATENCIONES_EXCEL",
        false,
      );
      throw new ForbiddenException(
        "Permisos insuficientes para visualizar este informe de costos",
      );
    }

    let atenciones: AtencionRaw[] = [];

    try {
      atenciones =
        await this.atencionesAdapter.obtenerAtencionesPorSolicitud(solicitudId);
    } catch (error) {
      throw new InternalServerErrorException(
        "Error al recuperar las atenciones para exportar",
      );
    }

    if (atenciones.length > 500 && formato === "pdf") {
      throw new BadRequestException(
        "No se puede exportar más de 500 registros en PDF. Por favor, utilice el formato Excel para exportar este volumen de datos.",
      );
    }

    const atencioneNormalizadas = atenciones.map((atencion) =>
      this.normalizarAtencion(atencion),
    );

    try {
      let buffer: Buffer;

      if (formato === "pdf") {
        buffer = await withTimeout(generarPDF(atencioneNormalizadas), 5000);
      } else {
        buffer = await withTimeout(generarExcel(atencioneNormalizadas), 5000);
      }

      await this.registrarAccesoAtencion(
        solicitudId,
        user.sub,
        ip,
        formato === "pdf" ? "EXPORT_ATENCIONES_PDF" : "EXPORT_ATENCIONES_EXCEL",
        true,
      );

      return buffer;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Error al generar el archivo de exportación",
      );
    }
  }

  private normalizarTexto(value: string | null): string {
    return value?.trim() ? value : "N/A";
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

    const fecha = atencion.fechaHora
      ? new Date(atencion.fechaHora).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }) +
        " " +
        new Date(atencion.fechaHora).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "N/A";

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
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
      ip,
      allowed,
    });
  }
}
