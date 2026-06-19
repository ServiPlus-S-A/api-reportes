import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "./auth/current-user.decorator";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { AtencionQueryDto } from "./dto/atencion-query.dto";
import { AtencionesResponseDto } from "./dto/atencion-response.dto";
import { DetalleSolicitudQueryDto } from "./dto/detalle-solicitud-query.dto";
import { DetalleSolicitudResponseDto } from "./dto/detalle-solicitud-response.dto";
import { ExportQueryDto } from "./dto/export-query.dto";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";
import { TiempoPromedioDto } from "./dto/tiempo-promedio";
import { JwtPayloadData } from "./interfaces/detalle-solicitud.interface";
import { PromedioData } from "./interfaces/promedioInterface";
import { ReporteData } from "./interfaces/reporte.interface";
import { ReportesService } from "./reportes.service";

@ApiTags("Reportes")
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
  @ApiOperation({
    summary: "Consultar tiempo promedio de cierre de solicitudes completadas",
  })
  @ApiBearerAuth("jwt")
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador", "direccion_administrativa")
  async obtenerTiempoPromedioSolicitudes(
    @Body() dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    return this.reportesService.obtenerTiempoPromedioSolicitudes(dto);
  }

  @Get("solicitudes/:id/detalle-cierre")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Consultar detalle de cierre de una solicitud completada",
  })
  @ApiBearerAuth("jwt")
  @ApiParam({
    name: "id",
    description: "Identificador de la solicitud en formato REQ-XXXXX.",
    example: "REQ-12345",
  })
  @ApiQuery({
    name: "page",
    required: false,
    example: 1,
    description: "Pagina de consultores intervinientes.",
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    example: 10,
    description: "Cantidad de consultores por pagina.",
  })
  @ApiOkResponse({
    description: "Detalle de cierre recuperado correctamente.",
    type: DetalleSolicitudResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @ApiNotFoundResponse({
    description: "No se encontro la solicitud solicitada.",
  })
  @ApiBadRequestResponse({
    description: "Solo se permite consultar solicitudes completadas.",
  })
  async obtenerDetalleSolicitud(
    @Param("id") id: string,
    @Query() query: DetalleSolicitudQueryDto,
    @CurrentUser() user: JwtPayloadData,
    @Req() req: Request,
  ): Promise<DetalleSolicitudResponseDto> {
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";

    return this.reportesService.obtenerDetalleSolicitudCompletada(
      id,
      user,
      ip,
      query.page ?? 1,
      query.pageSize ?? 10,
    );
  }

  @Get("solicitudes/:id/atenciones/exportar")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Exportar atenciones en PDF o Excel" })
  @ApiBearerAuth("jwt")
  @ApiParam({
    name: "id",
    description: "Identificador de la solicitud en formato REQ-XXXXX.",
    example: "REQ-12345",
  })
  @ApiQuery({
    name: "formato",
    enum: ["pdf", "excel"],
    description: "Formato de exportacion",
    example: "pdf",
  })
  @ApiOkResponse({
    description: "Archivo generado correctamente.",
    content: {
      "application/pdf": { schema: { type: "string", format: "binary" } },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: { type: "string", format: "binary" },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @ApiNotFoundResponse({
    description: "No se encontro la solicitud solicitada.",
  })
  @ApiBadRequestResponse({
    description: ">500 registros con formato PDF o solicitud no completada.",
  })
  @ApiInternalServerErrorResponse({
    description: "Timeout o error al generar el archivo de exportacion.",
  })
  async exportarAtenciones(
    @Param("id") id: string,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: JwtPayloadData,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";

    const buffer = await this.reportesService.exportarAtenciones(
      id,
      query.formato,
      user,
      ip,
    );

    const extension = query.formato === "pdf" ? "pdf" : "xlsx";
    const filename = `atenciones_${id}_${
      new Date().toISOString().split("T")[0]
    }.${extension}`;

    res.set({
      "Content-Type":
        query.formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get("solicitudes/:id/atenciones")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Obtener listado anidado de atenciones asociadas" })
  @ApiBearerAuth("jwt")
  @ApiParam({
    name: "id",
    description: "Identificador de la solicitud en formato REQ-XXXXX.",
    example: "REQ-12345",
  })
  @ApiQuery({
    name: "page",
    required: false,
    example: 1,
    description: "Pagina de atenciones.",
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    example: 25,
    description: "Cantidad de atenciones por pagina.",
  })
  @ApiOkResponse({
    description: "Listado de atenciones recuperado correctamente.",
    type: AtencionesResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @ApiNotFoundResponse({
    description: "No se encontro la solicitud solicitada.",
  })
  @ApiBadRequestResponse({
    description: "Solo se permite consultar solicitudes completadas.",
  })
  async obtenerAtenciones(
    @Param("id") id: string,
    @Query() query: AtencionQueryDto,
    @CurrentUser() user: JwtPayloadData,
    @Req() req: Request,
  ): Promise<AtencionesResponseDto> {
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";

    return this.reportesService.obtenerAtencionesAnidadas(
      id,
      user,
      ip,
      query.page ?? 1,
      query.pageSize ?? 25,
    );
  }
}
