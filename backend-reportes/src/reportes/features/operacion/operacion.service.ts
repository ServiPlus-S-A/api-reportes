import { Injectable } from "@nestjs/common";
import { SolicitudesAdapter } from "../../integraciones/solicitudes/solicitudes.adapter";
import { TiempoPromedioDto } from "../../shared/dto/tiempo-promedio";
import { PromedioData } from "../../shared/interfaces/promedioInterface";

@Injectable()
export class OperacionService {
  constructor(private readonly solicitudesAdapter: SolicitudesAdapter) {}

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
        solicitud.tipoServicio.toLowerCase() === dto.tipoServicio.toLowerCase();
      const coincideRango =
        fechaCreacion >= fechaInicio && fechaCreacion <= fechaFin;
      const esCompletada =
        solicitud.estado === "Completada" && solicitud.fechaCompletada !== null;

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
}
