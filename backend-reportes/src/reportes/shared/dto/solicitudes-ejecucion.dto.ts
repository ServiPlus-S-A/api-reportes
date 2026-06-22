import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { SolicitudEjecucionData } from "../interfaces/solicitud-ejecucion.interface";

export class SolicitudesEjecucionQueryDto {
  @ApiPropertyOptional({
    description: "Ordenar listado por un campo especifico",
    enum: ["prioridad", "fechaInicio"],
  })
  @IsOptional()
  @IsEnum(["prioridad", "fechaInicio"])
  ordenarPor?: "prioridad" | "fechaInicio";

  @ApiPropertyOptional({
    description: "Filtrar por el id del tecnico asignado",
  })
  @IsOptional()
  @IsString()
  tecnicoId?: string;
}

export class SolicitudEjecucionDto implements SolicitudEjecucionData {
  @ApiProperty({ description: "ID de la solicitud" })
  id!: string;

  @ApiProperty({ description: "Nombre del cliente" })
  cliente!: string;

  @ApiProperty({ description: "Servicio solicitado" })
  servicio!: string;

  @ApiProperty({
    description: "Prioridad de la solicitud",
    enum: ["Alta", "Media", "Baja"],
  })
  prioridad!: string;

  @ApiProperty({ description: "Nombre del tecnico o equipo asignado" })
  tecnicoAsignado!: string;

  @ApiProperty({ description: "Fecha y hora en que cambio a En ejecucion" })
  fechaInicioEjecucion!: string;

  @ApiProperty({ description: "Tiempo transcurrido en minutos" })
  tiempoTranscurridoMinutos!: number;

  @ApiProperty({ description: "Porcentaje estimado de avance" })
  porcentajeAvance!: number;
}

export class SolicitudesEjecucionResponseDto {
  @ApiProperty({
    description: "Listado de solicitudes en ejecucion",
    type: [SolicitudEjecucionDto],
  })
  solicitudes!: SolicitudEjecucionDto[];

  @ApiProperty({ description: "Total de solicitudes en ejecucion encontradas" })
  total!: number;

  @ApiProperty({
    description:
      "Capacidad operativa definida del equipo (para alertas de sobrecarga)",
  })
  capacidadOperativa!: number;
}
