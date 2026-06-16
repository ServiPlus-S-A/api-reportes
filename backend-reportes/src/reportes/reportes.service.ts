import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FirebaseReporteRepository } from "./repositories/firebase-reporte.repository";
import { SolicitudesAdapter } from "./adapters/solicitudes.adapter";
import { ClientesAdapter } from "./adapters/clientes.adapter";
import { ServiciosAdapter } from "./adapters/servicios.adapter";
import { ConsultoresAdapter } from "./adapters/consultores.adapter";
import {
  JwtPayloadData,
} from "./interfaces/detalle-solicitud.interface";
import {
  ConsultorResumenDto,
  DetalleSolicitudResponseDto,
} from "./dto/detalle-solicitud-response.dto";

@Injectable()
export class ReportesService {
  constructor(
    private readonly firebaseRepository: FirebaseReporteRepository,
    private readonly solicitudesAdapter: SolicitudesAdapter,
    private readonly clientesAdapter: ClientesAdapter,
    private readonly serviciosAdapter: ServiciosAdapter,
    private readonly consultoresAdapter: ConsultoresAdapter,
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
}
