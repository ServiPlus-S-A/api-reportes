import { IsString, IsNotEmpty, Matches } from "class-validator";

export class GenerarReporteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, {
    message: "El periodo debe tener el formato YYYY-MM",
  })
  periodo: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;
}
