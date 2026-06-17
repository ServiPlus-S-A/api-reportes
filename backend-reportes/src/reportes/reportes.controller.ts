import { Get, Param, Query, Req, Controller, Res } from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { ReportesService } from "./reportes.service";
import { JwtReportesService } from "./auth/jwt-reportes.service";
import { DetalleSolicitudQueryDto } from "./dto/detalle-solicitud-query.dto";
import { DetalleSolicitudResponseDto } from "./dto/detalle-solicitud-response.dto";
import { AtencionQueryDto } from "./dto/atencion-query.dto";
import { AtencionesResponseDto } from "./dto/atencion-response.dto";
import { ExportQueryDto } from "./dto/export-query.dto";

@ApiTags("Reportes")
@Controller("reportes")
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly jwtReportesService: JwtReportesService,
  ) {}

  @Get("solicitudes/:id/detalle-cierre")
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
    @Req() req: Request,
  ): Promise<DetalleSolicitudResponseDto> {
    const authorization = req.headers.authorization;
    const user = this.jwtReportesService.validateToken(authorization);
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
    description: "Formato de exportación",
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
    description: "Timeout o error al generar el archivo de exportación.",
  })
  async exportarAtenciones(
    @Param("id") id: string,
    @Query() query: ExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authorization = req.headers.authorization;
    const user = this.jwtReportesService.validateToken(authorization);
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";

    const buffer = await this.reportesService.exportarAtenciones(
      id,
      query.formato,
      user,
      ip,
    );

    const filename = `atenciones_${id}_${new Date().toISOString().split("T")[0]}.${query.formato === "pdf" ? "pdf" : "xlsx"}`;
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
    description: "Página de atenciones.",
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    example: 25,
    description: "Cantidad de atenciones por página.",
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
    @Req() req: Request,
  ): Promise<AtencionesResponseDto> {
    const authorization = req.headers.authorization;
    const user = this.jwtReportesService.validateToken(authorization);
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
