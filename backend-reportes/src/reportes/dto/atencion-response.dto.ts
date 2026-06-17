import { ApiProperty } from "@nestjs/swagger";

export class AtencionDto {
  @ApiProperty({ example: "ate-0001" })
  id: string;

  @ApiProperty({
    example: "Implementación de módulo de gestión de inventario...",
  })
  descripcion: string;

  @ApiProperty({ example: "Oficina Centro, Bogotá" })
  lugar: string;

  @ApiProperty({ example: "16/06/2026 14:30:45" })
  fecha: string;

  @ApiProperty({ example: "Andrea Salazar" })
  nombreConsultor: string;
}

export class PaginacionAtencionesMetadataDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  pageSize: number;

  @ApiProperty({ example: 145 })
  total: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}

export class AtencionesResponseDto {
  @ApiProperty({ example: "REQ-12345" })
  solicitudId: string;

  @ApiProperty({ isArray: true, type: AtencionDto })
  atenciones: AtencionDto[];

  @ApiProperty({ type: PaginacionAtencionesMetadataDto })
  pagination: PaginacionAtencionesMetadataDto;

  @ApiProperty({ isArray: true, example: [] })
  warnings: string[];
}
