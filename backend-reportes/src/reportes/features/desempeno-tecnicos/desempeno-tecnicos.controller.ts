import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../shared/auth/roles.guard";
import { Roles } from "../../shared/auth/roles.decorator";
import {
  DesempenoTecnicosFiltroDto,
  DesempenoTecnicosResponseDto,
} from "../../shared/dto/desempeno-tecnicos.dto";
import { ExportQueryDto } from "../../shared/dto/export-query.dto";
import { DesempenoTecnicosService } from "./desempeno-tecnicos.service";

@ApiTags("Reportes - Desempeno Tecnicos")
@Controller("reportes/desempeno-tecnicos")
export class DesempenoTecnicosController {
  constructor(
    private readonly desempenoTecnicosService: DesempenoTecnicosService,
  ) {}

  @Post("consolidado")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador", "coordinador_administrativo")
  @ApiOperation({
    summary:
      "Consultar consolidado de servicios completados por técnico en un periodo",
  })
  @ApiBearerAuth("jwt")
  @ApiOkResponse({
    description: "Consolidado recuperado correctamente.",
    type: DesempenoTecnicosResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o invalido." })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @ApiBadRequestResponse({
    description: "Rango de fechas invalido para la consulta.",
  })
  async obtenerConsolidado(
    @Body() dto: DesempenoTecnicosFiltroDto,
  ): Promise<DesempenoTecnicosResponseDto> {
    return this.desempenoTecnicosService.obtenerConsolidado(dto);
  }

  @Post("consolidado/exportar")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador", "coordinador_administrativo")
  @ApiOperation({
    summary: "Exportar consolidado de servicios completados por técnico",
  })
  @ApiBearerAuth("jwt")
  @ApiQuery({
    name: "formato",
    enum: ["pdf", "excel"],
    description: "Formato de exportacion del reporte.",
    example: "excel",
  })
  @ApiOkResponse({ description: "Archivo generado correctamente." })
  @ApiUnauthorizedResponse({ description: "Token JWT requerido o invalido." })
  @ApiForbiddenResponse({
    description:
      "Permisos insuficientes para visualizar este informe de costos",
  })
  @ApiBadRequestResponse({
    description: "Rango de fechas invalido para la consulta.",
  })
  @ApiInternalServerErrorResponse({
    description: "No se pudo generar el archivo de exportacion.",
  })
  async exportarConsolidado(
    @Body() dto: DesempenoTecnicosFiltroDto,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.desempenoTecnicosService.exportarConsolidado(
      dto,
      query,
    );

    const extension = query.formato === "pdf" ? "pdf" : "xlsx";
    const filename = `desempeno_tecnicos_${dto.fechaInicio}_${dto.fechaFin}.${extension}`;

    res.set({
      "Content-Type":
        query.formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
