import {
  Get,
  Param,
  Query,
  Req,
  Controller,
} from "@nestjs/common";
import { Request } from "express";
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
} from "@nestjs/swagger";
import { ReportesService } from "./reportes.service";
import { JwtReportesService } from "./auth/jwt-reportes.service";
import { DetalleSolicitudQueryDto } from "./dto/detalle-solicitud-query.dto";
import { DetalleSolicitudResponseDto } from "./dto/detalle-solicitud-response.dto";

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
}
