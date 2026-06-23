import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional } from "class-validator";

export enum MonedaEnum {
  COP = "COP",
  USD = "USD",
}

export class IngresosTipoServicioQueryDto {
  @ApiPropertyOptional({
    example: "2026-01-01",
    description:
      "Fecha de inicio del rango de consulta (formato ISO 8601, solo fecha).",
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({
    example: "2026-06-30",
    description:
      "Fecha de fin del rango de consulta (formato ISO 8601, solo fecha).",
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({
    enum: MonedaEnum,
    default: MonedaEnum.COP,
    description: "Moneda en la que se expresarán los valores del reporte.",
  })
  @IsOptional()
  @IsEnum(MonedaEnum)
  moneda?: MonedaEnum = MonedaEnum.COP;
}
