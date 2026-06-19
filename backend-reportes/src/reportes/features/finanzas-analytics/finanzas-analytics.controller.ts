import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FinanzasAnalyticsService } from "./finanzas-analytics.service";
import { GenerarReporteDto } from "../../shared/dto/generar-reporte.dto";
import { ReporteData } from "../../shared/interfaces/reporte.interface";

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
}
