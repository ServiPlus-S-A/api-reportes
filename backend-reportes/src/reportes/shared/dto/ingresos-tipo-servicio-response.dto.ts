import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GraficoSegmentoDto {
  @ApiProperty({
    example: "Soporte",
    description: "Nombre del tipo de servicio representado en el segmento.",
  })
  tipoServicio: string;

  @ApiProperty({
    example: 4500000,
    description:
      "Total de ingresos netos recaudados para este tipo de servicio (en la moneda seleccionada).",
  })
  total: number;

  @ApiProperty({
    example: 45.5,
    description:
      "Porcentaje que representa este segmento sobre el total general (0–100).",
  })
  porcentaje: number;
}

export class TablaIngresoFilaDto {
  @ApiProperty({
    example: "Soporte",
    description: "Tipo de servicio.",
  })
  tipoServicio: string;

  @ApiProperty({
    example: 12,
    description:
      "Cantidad de atenciones (solicitudes con factura pagada) de este tipo.",
  })
  cantidadAtenciones: number;

  @ApiProperty({
    example: 3781512.61,
    description:
      "Suma de los montos brutos de las facturas pagadas (en la moneda seleccionada, sin impuestos).",
  })
  subtotalIngresos: number;

  @ApiProperty({
    example: 718487.39,
    description: "Monto de impuestos (IVA 19%) calculado sobre el subtotal.",
  })
  impuestos: number;

  @ApiProperty({
    example: 4500000,
    description:
      "Total neto recaudado: subtotal + impuestos (en la moneda seleccionada).",
  })
  totalNetoRecaudado: number;
}

export class ResumenIngresosTipoServicioDto {
  @ApiProperty({
    example: "COP",
    description:
      "Moneda en la que están expresados todos los valores del reporte.",
  })
  moneda: string;

  @ApiProperty({
    example: "2026-01-01",
    description: "Fecha de inicio aplicada al filtro del reporte.",
  })
  fechaInicio: string;

  @ApiProperty({
    example: "2026-06-30",
    description: "Fecha de fin aplicada al filtro del reporte.",
  })
  fechaFin: string;

  @ApiProperty({
    type: GraficoSegmentoDto,
    isArray: true,
    description:
      "Datos del gráfico circular. Cada elemento representa un segmento (tipo de servicio).",
  })
  grafico: GraficoSegmentoDto[];

  @ApiProperty({
    type: TablaIngresoFilaDto,
    isArray: true,
    description: "Tabla detallada de ingresos por tipo de servicio.",
  })
  tabla: TablaIngresoFilaDto[];

  @ApiPropertyOptional({
    example: "No se registran ingresos para los filtros aplicados",
    description:
      "Mensaje informativo cuando no existen datos para el rango de fechas seleccionado.",
  })
  mensaje?: string;
}
