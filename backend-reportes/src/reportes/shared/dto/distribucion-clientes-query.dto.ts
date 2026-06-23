import { Transform } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export enum TipoCliente {
  EMPRESARIAL = "empresarial",
  PERSONA_NATURAL = "persona_natural",
}

export enum EstadoCliente {
  ACTIVO = "activo",
  INACTIVO = "inactivo",
}

const normalizar = (value: unknown): unknown =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : value;

export class DistribucionClientesQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizar(value))
  @IsEnum(TipoCliente, {
    message: "tipo debe ser empresarial o persona_natural",
  })
  tipo?: TipoCliente;

  @IsOptional()
  @Transform(({ value }) => normalizar(value))
  @IsEnum(EstadoCliente, {
    message: "estado debe ser activo o inactivo",
  })
  estado?: EstadoCliente;
}
