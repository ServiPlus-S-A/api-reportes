import { BadRequestException, Injectable } from "@nestjs/common";
import { SolicitudesAdapter } from "../../integraciones/solicitudes/solicitudes.adapter";
import { ConsultoresAdapter } from "../../integraciones/parametrizacion/consultores.adapter";
import {
  DesempenoTecnicosFiltroDto,
  DesempenoTecnicosResponseDto,
} from "../../shared/dto/desempeno-tecnicos.dto";
import { ExportQueryDto } from "../../shared/dto/export-query.dto";
import {
  generarDesempenoTecnicosExcel,
  generarDesempenoTecnicosPDF,
} from "../../shared/utils/desempeno-tecnicos-export.util";
import { withTimeout } from "../../shared/utils/timeout.util";

@Injectable()
export class DesempenoTecnicosService {
  constructor(
    private readonly solicitudesAdapter: SolicitudesAdapter,
    private readonly consultoresAdapter: ConsultoresAdapter,
  ) {}

  async obtenerConsolidado(
    dto: DesempenoTecnicosFiltroDto,
  ): Promise<DesempenoTecnicosResponseDto> {
    const { fechaInicio, fechaFin } = this.obtenerRango(dto);
    const tecnicos =
      await this.consultoresAdapter.obtenerTecnicosParaDesempeno();
    const solicitudes =
      await this.solicitudesAdapter.fetchSolicitudesParaDesempeno();

    const tecnicosFiltrados = dto.especialidad
      ? tecnicos.filter((tecnico) => tecnico.especialidad === dto.especialidad)
      : tecnicos;

    const solicitudesFiltradas = solicitudes.filter((solicitud) => {
      if (solicitud.estado !== "Completada" || !solicitud.fechaFinalizacion) {
        return false;
      }

      const fechaCierre = new Date(solicitud.fechaFinalizacion);
      if (Number.isNaN(fechaCierre.getTime())) {
        return false;
      }

      const coincideEspecialidad = dto.especialidad
        ? solicitud.especialidad === dto.especialidad
        : true;

      return (
        coincideEspecialidad &&
        fechaCierre >= fechaInicio &&
        fechaCierre <= fechaFin
      );
    });

    const resultados = tecnicosFiltrados
      .map((tecnico) => {
        const solicitudesTecnico = solicitudesFiltradas.filter(
          (solicitud) => solicitud.tecnicoId === tecnico.id,
        );
        const calificaciones = solicitudesTecnico
          .map((solicitud) => solicitud.calificacion)
          .filter(
            (calificacion): calificacion is number =>
              typeof calificacion === "number",
          );

        const calificacionPromedio = calificaciones.length
          ? Number(
              (
                calificaciones.reduce((acc, value) => acc + value, 0) /
                calificaciones.length
              ).toFixed(2),
            )
          : null;

        return {
          nombreTecnico: tecnico.nombre,
          especialidad: tecnico.especialidad,
          cantidadServiciosCompletados: solicitudesTecnico.length,
          calificacionPromedio,
        };
      })
      .sort((a, b) => {
        if (b.cantidadServiciosCompletados !== a.cantidadServiciosCompletados) {
          return (
            b.cantidadServiciosCompletados - a.cantidadServiciosCompletados
          );
        }

        return a.nombreTecnico.localeCompare(b.nombreTecnico, "es");
      });

    return {
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      especialidad: dto.especialidad ?? null,
      totalTecnicos: resultados.length,
      totalServiciosCompletados: resultados.reduce(
        (acc, item) => acc + item.cantidadServiciosCompletados,
        0,
      ),
      resultados,
    };
  }

  async exportarConsolidado(
    dto: DesempenoTecnicosFiltroDto,
    query: ExportQueryDto,
  ): Promise<Buffer> {
    const reporte = await this.obtenerConsolidado(dto);

    if (query.formato === "pdf") {
      return withTimeout(generarDesempenoTecnicosPDF(reporte), 5000);
    }

    return withTimeout(generarDesempenoTecnicosExcel(reporte), 5000);
  }

  private obtenerRango(dto: DesempenoTecnicosFiltroDto): {
    fechaInicio: Date;
    fechaFin: Date;
  } {
    const fechaInicio = this.parseBoundary(dto.fechaInicio, "start");
    const fechaFin = this.parseBoundary(dto.fechaFin, "end");

    if (fechaInicio > fechaFin) {
      throw new BadRequestException(
        "Error de consulta: Verifique el rango de fechas ingresado.",
      );
    }

    return { fechaInicio, fechaFin };
  }

  private parseBoundary(value: string, boundary: "start" | "end"): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
      return new Date(`${value}${suffix}`);
    }

    return new Date(value);
  }
}
