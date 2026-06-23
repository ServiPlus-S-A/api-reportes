import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiConflictResponse,
  ApiPayloadTooLargeResponse,
} from "@nestjs/swagger";
import { FinanzasAnalyticsService } from "./finanzas-analytics.service";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { Roles } from "../../shared/auth/roles.decorator";
import { RolesGuard } from "../../shared/auth/roles.guard";
import { IngresosTipoServicioQueryDto } from "../../shared/dto/ingresos-tipo-servicio-query.dto";
import { ResumenIngresosTipoServicioDto } from "../../shared/dto/ingresos-tipo-servicio-response.dto";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";
import { ExportarReporteFinancieroDto } from "../../shared/dto/exportar-reporte-financiero.dto";

@ApiTags("Reportes - Finanzas y Analytics")
@Controller("reportes/finanzas")
export class FinanzasAnalyticsController {
  constructor(
    private readonly finanzasAnalyticsService: FinanzasAnalyticsService,
  ) {}

  @Post("generar")
  @HttpCode(HttpStatus.OK)
  async generarReporte(
    @Body() dto: GenerarReporteDto,
    @Headers("x-user-id") userId: string,
  ): Promise<ReporteData> {
    const usuario = userId || "anonymous_system_user";

    try {
      return await this.finanzasAnalyticsService.generarReporte(dto, usuario);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "No se pudo generar el reporte solicitado.",
        error: message,
      });
    }
  }

  // ─── HU-09: Análisis Financiero — Ingresos por Tipo de Servicio ────────────

  @Get("analisis-financiero/ingresos-por-tipo-servicio")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador_administrativo", "gerencia")
  @ApiOperation({
    summary:
      "Resumen de ingresos por tipo de servicio (Análisis Financiero — HU-09)",
    description:
      "Retorna un resumen de ingresos agrupados por tipo de servicio " +
      "(Soporte, Mantenimiento, Consultoría) con datos para gráfico circular y tabla detallada. " +
      "Solo incluye solicitudes con factura en estado \"Pagada\" del módulo comercial. " +
      "Acceso restringido a roles: Coordinador Administrativo y Gerencia.",
  })
  @ApiBearerAuth("jwt")
  @ApiQuery({
    name: "fechaInicio",
    required: false,
    example: "2026-01-01",
    description:
      "Fecha de inicio del rango de consulta (ISO 8601). Si se omite, se consultan todos los registros desde el inicio.",
  })
  @ApiQuery({
    name: "fechaFin",
    required: false,
    example: "2026-06-30",
    description:
      "Fecha de fin del rango de consulta (ISO 8601). Si se omite, se consultan todos los registros hasta el final.",
  })
  @ApiQuery({
    name: "moneda",
    required: false,
    description:
      "Moneda en la que se expresarán los valores del reporte. Por defecto COP.",
  })
  @ApiOkResponse({
    description:
      "Resumen de ingresos generado correctamente. Si no hay datos, se incluye el campo \"mensaje\" con aviso.",
    type: ResumenIngresosTipoServicioDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o inválido.",
  })
  @ApiForbiddenResponse({
    description:
      "El rol del usuario no tiene acceso a este reporte financiero. " +
      "Solo Coordinador Administrativo y Gerencia pueden acceder.",
  })
  @ApiInternalServerErrorResponse({
    description:
      "Error de integración con el módulo de Gestión Contable: " +
      "\"Error de integración: No se pudo obtener la información financiera en este momento\".",
  })
  async obtenerIngresosPorTipoServicio(
    @Query() query: IngresosTipoServicioQueryDto,
    @CurrentUser() user: JwtPayloadData,
    @Req() req: Request,
  ): Promise<ResumenIngresosTipoServicioDto> {
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";
    return this.finanzasAnalyticsService.obtenerIngresosPorTipoServicio(
      query,
      user,
      ip,
    );
  }

  @Post("exportar")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador_administrativo", "gerente_financiero")
  @ApiBearerAuth("jwt")
  @ApiOperation({ summary: "Exportar reporte financiero en Excel o PDF" })
  @ApiForbiddenResponse({
    description: "Rol no autorizado para exportar reportes financieros.",
  })
  @ApiConflictResponse({
    description: "La exportación supera 5.000 registros y requiere confirmación.",
  })
  @ApiPayloadTooLargeResponse({
    description: "El archivo no puede procesarse por falta de memoria.",
  })
  async exportarReporteFinanciero(
    @Body() dto: ExportarReporteFinancieroDto,
    @Res() response: Response,
  ): Promise<void> {
    const archivo =
      await this.finanzasAnalyticsService.exportarReporteFinanciero(dto);

    response.set({
      "Content-Type": archivo.contentType,
      "Content-Disposition": `attachment; filename="${archivo.nombreArchivo}"`,
      "Content-Length": archivo.buffer.length.toString(),
      "X-Total-Registros": archivo.totalRegistros.toString(),
    });
    response.send(archivo.buffer);
  }
}
