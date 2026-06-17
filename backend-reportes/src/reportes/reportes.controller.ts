import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ReportesService } from "./reportes.service";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";
import { TiempoPromedioDto } from "./dto/tiempo-promedio";
import { PromedioData } from "./interfaces/promedioInterface";
import { ReporteData } from "./interfaces/reporte.interface";

@Controller("reportes")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post("generar")
  @HttpCode(HttpStatus.OK)
  async generarReporte(
    @Body() dto: GenerarReporteDto,
    @Headers("x-user-id") userId: string,
  ): Promise<ReporteData> {
    const usuario = userId || "anonymous_system_user";

    try {
      return await this.reportesService.generarReporte(dto, usuario);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "No se pudo generar el reporte solicitado.",
        error: message,
      });
    }
  }

  @Post("tiempo-promedio-solicitudes")
  @HttpCode(HttpStatus.OK)
  async obtenerTiempoPromedioSolicitudes(
    @Body() dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    return await this.reportesService.obtenerTiempoPromedioSolicitudes(dto);
  }
}
