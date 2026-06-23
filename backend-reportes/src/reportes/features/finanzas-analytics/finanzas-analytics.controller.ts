import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  BadRequestException,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FinanzasAnalyticsService } from "./finanzas-analytics.service";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";
import { ExportarReporteFinancieroDto } from "../../shared/dto/exportar-reporte-financiero.dto";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../shared/auth/roles.guard";
import { Roles } from "../../shared/auth/roles.decorator";

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
