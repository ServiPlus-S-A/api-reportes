import { ApiProperty } from "@nestjs/swagger";

export class ConsultorResumenDto {
  @ApiProperty({ example: "con-001" })
  id: string;

  @ApiProperty({ example: "Andrea Salazar" })
  nombre: string | null;
}

export class ServicioDetalleDto {
  @ApiProperty({ example: "Implementacion de mesa de ayuda" })
  nombre: string;

  @ApiProperty({ example: "Consultoria" })
  tipo: string;
}

export class PaginationMetadataDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

export class DetalleSolicitudMetadataDto {
  @ApiProperty({
    example: [
      "Advertencia: Algunos datos del cliente o servicio no pudieron ser recuperados desde el servidor central",
    ],
    isArray: true,
  })
  warnings: string[];

  @ApiProperty({ type: PaginationMetadataDto })
  pagination: PaginationMetadataDto;
}

export class DetalleSolicitudResponseDto {
  @ApiProperty({ example: "REQ-12345" })
  id: string;

  @ApiProperty({ type: ServicioDetalleDto })
  servicio: ServicioDetalleDto;

  @ApiProperty({ example: "Industrias Nova SAS" })
  cliente: string;

  @ApiProperty({ example: "$3,250,000.00" })
  gananciaGenerada: string;

  @ApiProperty({ example: "04/05/2026 08:00" })
  fechaInicio: string;

  @ApiProperty({ example: "06/05/2026 17:30" })
  fechaFin: string;

  @ApiProperty({ type: ConsultorResumenDto })
  consultorApertura: ConsultorResumenDto;

  @ApiProperty({ type: ConsultorResumenDto })
  consultorCierre: ConsultorResumenDto;

  @ApiProperty({ type: ConsultorResumenDto, isArray: true })
  consultoresIntervinientes: ConsultorResumenDto[];

  @ApiProperty({ type: DetalleSolicitudMetadataDto })
  metadata: DetalleSolicitudMetadataDto;
}
