import { IsDateString, IsOptional, IsString } from "class-validator";

export class TiempoPromedioDto {
  @IsOptional()
  @IsString()
  tipoServicio?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
