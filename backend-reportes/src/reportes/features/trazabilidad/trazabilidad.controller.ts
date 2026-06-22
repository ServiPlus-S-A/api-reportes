import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { DetalleSolicitudQueryDto } from "../../shared/dto/detalle-solicitud-query.dto";
import { DetalleSolicitudResponseDto } from "../../shared/dto/detalle-solicitud-response.dto";
import { ExportQueryDto } from "../../shared/dto/export-query.dto";
import { AtencionQueryDto } from "../../shared/dto/atencion-query.dto";
import { AtencionesResponseDto } from "../../shared/dto/atencion-response.dto";
import {
  SolicitudesEjecucionQueryDto,
  SolicitudesEjecucionResponseDto,
} from "../../shared/dto/solicitudes-ejecucion.dto";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";
import { TrazabilidadService } from "./trazabilidad.service";
import { RedisCacheInterceptor } from "../../shared/cache/redis-cache.interceptor";
import { UseRedisCache } from "../../shared/cache/redis-cache.decorator";
import { RolesGuard } from "../../shared/auth/roles.guard";
import { Roles } from "../../shared/auth/roles.decorator";

@ApiTags("Reportes - Trazabilidad")
@Controller("reportes")
export class TrazabilidadController {
  constructor(private readonly trazabilidadService: TrazabilidadService) {}

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
  })
  @ApiQuery({
    name: "pageSize",
    required: false,
    example: 10,
  })
  @ApiOkResponse({
    description: "Detalle de cierre recuperado correctamente.",
    type: DetalleSolicitudResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o invalido." })
  @ApiForbiddenResponse({
    description: "Permisos insuficientes para visualizar este informe",
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

    return this.trazabilidadService.obtenerDetalleSolicitudCompletada(
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
  })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o invalido." })
  @ApiForbiddenResponse({
    description: "Permisos insuficientes para visualizar este informe",
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

    const buffer = await this.trazabilidadService.exportarAtenciones(
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
    description: "Identificador de la solicitud",
    example: "REQ-12345",
  })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, example: 25 })
  @ApiOkResponse({
    description: "Listado de atenciones recuperado correctamente.",
    type: AtencionesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o invalido." })
  @ApiForbiddenResponse({ description: "Permisos insuficientes." })
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

    return this.trazabilidadService.obtenerAtencionesAnidadas(
      id,
      user,
      ip,
      query.page ?? 1,
      query.pageSize ?? 25,
    );
  }

  @Get("solicitudes/en-ejecucion")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador")
  @ApiOperation({
    summary: "Consultar solicitudes en ejecución (En Proceso, En Ejecución)",
  })
  @ApiBearerAuth("jwt")
  @UseInterceptors(RedisCacheInterceptor)
  @UseRedisCache("trazabilidad:ejecucion", 60)
  @ApiOkResponse({
    description:
      "Listado de solicitudes en ejecución recuperado correctamente.",
    type: SolicitudesEjecucionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o inválido." })
  @ApiForbiddenResponse({
    description: "Permisos insuficientes para visualizar este informe.",
  })
  async obtenerSolicitudesEnEjecucion(
    @Query() query: SolicitudesEjecucionQueryDto,
    @CurrentUser() user: JwtPayloadData,
    @Req() req: Request,
  ): Promise<SolicitudesEjecucionResponseDto> {
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";
    return this.trazabilidadService.obtenerSolicitudesEnEjecucion(
      query,
      user,
      ip,
    );
  }
}
