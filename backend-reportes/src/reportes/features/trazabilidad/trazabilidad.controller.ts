import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
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
import { RolesGuard } from "../../shared/auth/roles.guard";
import { Roles } from "../../shared/auth/roles.decorator";
import { DistribucionClientesQueryDto } from "../../shared/dto/distribucion-clientes-query.dto";
import { DetalleSolicitudQueryDto } from "../../shared/dto/detalle-solicitud-query.dto";
import { DetalleSolicitudResponseDto } from "../../shared/dto/detalle-solicitud-response.dto";
import { ExportQueryDto } from "../../shared/dto/export-query.dto";
import { AtencionQueryDto } from "../../shared/dto/atencion-query.dto";
import { AtencionesResponseDto } from "../../shared/dto/atencion-response.dto";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";
import { TrazabilidadService } from "./trazabilidad.service";

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

  @Get("clientes")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Obtener listado de clientes o filtrar por departamento",
  })
  @ApiBearerAuth("jwt")
  @ApiQuery({
    name: "depto",
    required: false,
    description: "Departamento para filtrar los clientes",
    example: "Antioquia",
  })
  @ApiOkResponse({
    description: "Listado de clientes recuperado correctamente.",
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de clientes",
  })
  async obtenerClientes(@Query("depto") depto?: string) {
    return this.trazabilidadService.obtenerClientes(depto);
  }

  @Get("clientes/distribucion")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador_administrativo", "direccion_comercial")
  @ApiOperation({
    summary:
      "Obtener distribución consolidada de clientes por ciudad y departamento con porcentaje",
  })
  @ApiBearerAuth("jwt")
  @ApiQuery({
    name: "tipo",
    required: false,
    enum: ["empresarial", "persona_natural"],
    description: "Filtro por tipo de cliente",
    example: "empresarial",
  })
  @ApiQuery({
    name: "estado",
    required: false,
    enum: ["activo", "inactivo"],
    description: "Filtro por estado del cliente",
    example: "activo",
  })
  @ApiOkResponse({
    description: "Distribución consolidada de clientes recuperada correctamente.",
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este reporte consolidado",
  })
  async obtenerDistribucionClientes(
    @Query() query: DistribucionClientesQueryDto,
  ) {
    return this.trazabilidadService.obtenerReporteConsolidadoClientes(
      query.tipo,
      query.estado,
    );
  }

  @Get("clientes/distribucion-por-departamento")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador_administrativo", "direccion_comercial")
  @ApiOperation({
    summary:
      "Obtener distribución de clientes por departamento con porcentaje y listado de ciudades",
  })
  @ApiBearerAuth("jwt")
  @ApiQuery({
    name: "tipo",
    required: false,
    enum: ["empresa", "persona", "pyme"],
    description: "Filtro por tipo de cliente",
    example: "empresa",
  })
  @ApiQuery({
    name: "estado",
    required: false,
    enum: ["activo", "inactivo"],
    description: "Filtro por estado del cliente",
    example: "activo",
  })
  @ApiOkResponse({
    description:
      "Distribución consolidada de clientes por departamento recuperada correctamente.",
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este reporte consolidado",
  })
  async obtenerDistribucionClientesPorDepartamentoResumen(
    @Query() query: DistribucionClientesQueryDto,
  ) {
    return this.obtenerReporteConsolidadoClientes(query);
  }

  @Get("clientes/:id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Obtener un cliente por su identificador",
  })
  @ApiBearerAuth("jwt")
  @ApiParam({
    name: "id",
    required: true,
    example: "cli-001",
    description: "Id único del cliente.",
  })
  @ApiOkResponse({
    description: "Cliente recuperado correctamente.",
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT requerido o invalido.",
  })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de clientes",
  })
  @ApiNotFoundResponse({
    description: "No se encontro el cliente solicitado.",
  })
  async obtenerClientePorID(@Param("id") id: string) {
    return this.trazabilidadService.obtenerClientePorID(id);
  }

  private obtenerReporteConsolidadoClientes(
    query: DistribucionClientesQueryDto,
  ) {
    return this.trazabilidadService.obtenerReporteConsolidadoClientes(
      query.tipo,
      query.estado,
    );
  }
}
