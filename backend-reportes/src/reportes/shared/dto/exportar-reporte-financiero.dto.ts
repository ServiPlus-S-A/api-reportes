import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsOptional } from "class-validator";

export enum FormatoExportacionFinanciera {
  XLSX = "xlsx",
  PDF = "pdf",
}

export class ExportarReporteFinancieroDto {
  @Transform(({ value }) =>
    typeof value === "string" && value.toLowerCase() === "excel"
      ? FormatoExportacionFinanciera.XLSX
      : value?.toLowerCase(),
  )
  @IsEnum(FormatoExportacionFinanciera, {
    message: "formato debe ser xlsx o pdf",
  })
  formato: FormatoExportacionFinanciera;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsBoolean()
  confirmarVolumen?: boolean;
}
