import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { EspecialidadTecnica } from "../interfaces/desempeno-tecnicos.interface";

const ESPECIALIDADES_VALIDAS: EspecialidadTecnica[] = [
  "Soporte",
  "Mantenimiento",
  "Consultoria",
];

function normalizarEspecialidad(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const normalizada = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalizada === "soporte") return "Soporte";
  if (normalizada === "mantenimiento") return "Mantenimiento";
  if (normalizada === "consultoria") return "Consultoria";

  return value;
}

export class DesempenoTecnicosFiltroDto {
  @ApiProperty({
    example: "2026-05-01",
    description: "Fecha inicial obligatoria del rango de consulta.",
  })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({
    example: "2026-05-31",
    description: "Fecha final obligatoria del rango de consulta.",
  })
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({
    example: "Soporte",
    enum: ESPECIALIDADES_VALIDAS,
    description: "Filtro opcional por especialidad tecnica.",
  })
  @IsOptional()
  @Transform(({ value }) => normalizarEspecialidad(value))
  @IsIn(ESPECIALIDADES_VALIDAS)
  especialidad?: EspecialidadTecnica;
}

export class DesempenoTecnicoResultadoDto {
  @ApiProperty({
    example: "Andrea Salazar",
    description: "Nombre del tecnico en el consolidado.",
  })
  @IsString()
  nombreTecnico: string;

  @ApiProperty({
    example: "Soporte",
    enum: ESPECIALIDADES_VALIDAS,
    description: "Especialidad registrada del tecnico.",
  })
  @IsIn(ESPECIALIDADES_VALIDAS)
  especialidad: EspecialidadTecnica;

  @ApiProperty({
    example: 5,
    description: "Cantidad de servicios completados en el periodo consultado.",
  })
  @IsInt()
  @Min(0)
  cantidadServiciosCompletados: number;

  @ApiPropertyOptional({
    example: 4.7,
    nullable: true,
    description:
      "Calificacion promedio del tecnico para el periodo, si existe evaluacion.",
  })
  @IsOptional()
  @IsNumber()
  calificacionPromedio: number | null;
}

export class DesempenoTecnicosResponseDto {
  @ApiProperty({ example: "2026-05-01" })
  @IsString()
  fechaInicio: string;

  @ApiProperty({ example: "2026-05-31" })
  @IsString()
  fechaFin: string;

  @ApiPropertyOptional({
    example: "Soporte",
    enum: ESPECIALIDADES_VALIDAS,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  especialidad: EspecialidadTecnica | null;

  @ApiProperty({
    example: 4,
    description: "Total de tecnicos incluidos en el consolidado.",
  })
  @IsInt()
  @Min(0)
  totalTecnicos: number;

  @ApiProperty({
    example: 9,
    description:
      "Suma total de servicios completados en el consolidado filtrado.",
  })
  @IsInt()
  @Min(0)
  totalServiciosCompletados: number;

  @ApiProperty({
    type: [DesempenoTecnicoResultadoDto],
    description: "Filas del consolidado por tecnico.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesempenoTecnicoResultadoDto)
  resultados: DesempenoTecnicoResultadoDto[];
}
