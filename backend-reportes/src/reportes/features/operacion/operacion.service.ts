import { BadRequestException, Injectable } from "@nestjs/common";
import { SolicitudesAdapter } from "../../integraciones/solicitudes/solicitudes.adapter";
import { TiempoPromedioDto } from "../../shared/dto/tiempo-promedio";
import { PromedioData } from "../../shared/interfaces/promedioInterface";

@Injectable()
export class OperacionService {
  constructor(private readonly solicitudesAdapter: SolicitudesAdapter) {}

  async obtenerTiempoPromedioSolicitudes(
    dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    const fechaInicio = this.normalizarFechaInicio(dto.fechaInicio);
    const fechaFin = this.normalizarFechaFin(dto.fechaFin);

    if (fechaInicio > fechaFin) {
      throw new BadRequestException(
        "La fecha de inicio no puede ser posterior a la fecha fin",
      );
    }

    const solicitudes =
      await this.solicitudesAdapter.fetchSolicitudesParaPromedio();

    const solicitudesFiltradas = solicitudes.filter((solicitud) => {
      const fechaCreacion = new Date(solicitud.fechaCreacion);
      const coincideTipo =
        !dto.tipoServicio ||
        solicitud.tipoServicio?.toLowerCase() ===
          dto.tipoServicio.toLowerCase();
      const coincideRango =
        fechaCreacion >= fechaInicio && fechaCreacion <= fechaFin;

      return (
        coincideTipo &&
        coincideRango &&
        this.esSolicitudCompletadaValida(solicitud)
      );
    });

    const historicoUltimos6Meses = this.generarHistorico(
      solicitudes,
      dto.tipoServicio,
    );

    if (solicitudesFiltradas.length === 0) {
      return {
        promedio: 0,
        unidad: "horas",
        promedioTexto: "0.0",
        solicitudesProcesadas: 0,
        mensaje: "Sin datos de cierre para el periodo consultado",
        historicoUltimos6Meses,
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
    const horasRedondeadas = Math.round(promedioHoras);
    const dias = Math.floor(horasRedondeadas / 24);
    const horas = horasRedondeadas % 24;

    return {
      promedio: Number(promedioHoras.toFixed(2)),
      unidad: "horas",
      promedioTexto: `${dias} ${dias === 1 ? "día" : "días"}, ${horas} ${
        horas === 1 ? "hora" : "horas"
      }`,
      solicitudesProcesadas: solicitudesFiltradas.length,
      historicoUltimos6Meses,
    };
  }

  private generarHistorico(solicitudes: any[], tipoServicio?: string) {
    const resultado = [];
    const ahora = new Date();

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(
        Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1),
      );
      const mes = fecha.toLocaleString("es-ES", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      const promedioMes = this.calcularPromedioMes(
        fecha,
        solicitudes,
        tipoServicio,
      );
      resultado.push({
        mes,
        promedioHoras: Number(promedioMes.toFixed(2)),
      });
    }

    return resultado;
  }

  private calcularPromedioMes(
    fecha: Date,
    solicitudes: any[],
    tipoServicio?: string,
  ): number {
    const inicioMes = new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1),
    );
    const finMes = new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1) - 1,
    );

    const solicitudesMes = solicitudes.filter((solicitud) => {
      if (!this.esSolicitudCompletadaValida(solicitud)) return false;

      const fechaCompletada = new Date(solicitud.fechaCompletada);
      const coincideTipo =
        !tipoServicio ||
        solicitud.tipoServicio?.toLowerCase() === tipoServicio.toLowerCase();

      return (
        coincideTipo &&
        fechaCompletada >= inicioMes &&
        fechaCompletada <= finMes
      );
    });

    if (solicitudesMes.length === 0) return 0;

    const horas = solicitudesMes.map((solicitud) => {
      const inicio = new Date(solicitud.fechaCreacion).getTime();
      const fin = new Date(solicitud.fechaCompletada).getTime();
      return (fin - inicio) / (1000 * 60 * 60);
    });
    return horas.reduce((acc, value) => acc + value, 0) / horas.length;
  }

  private esSolicitudCompletadaValida(solicitud: any): boolean {
    if (solicitud.estado?.trim().toLowerCase() !== "completada") return false;
    if (!solicitud.fechaCreacion || !solicitud.fechaCompletada) return false;

    const inicio = new Date(solicitud.fechaCreacion).getTime();
    const fin = new Date(solicitud.fechaCompletada).getTime();
    return Number.isFinite(inicio) && Number.isFinite(fin) && fin >= inicio;
  }

  private normalizarFechaInicio(value?: string): Date {
    return value
      ? new Date(value)
      : new Date("2000-01-01T00:00:00.000Z");
  }

  private normalizarFechaFin(value?: string): Date {
    if (!value) return new Date();
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T23:59:59.999Z`)
      : new Date(value);
  }
}
