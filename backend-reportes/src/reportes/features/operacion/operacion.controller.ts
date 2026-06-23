import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { OperacionService } from "./operacion.service";
import { RedisCacheInterceptor } from "../../shared/cache/redis-cache.interceptor";
import { UseRedisCache } from "../../shared/cache/redis-cache.decorator";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../shared/auth/roles.guard";
import { Roles } from "../../shared/auth/roles.decorator";
import { TiempoPromedioDto } from "../../shared/dto/tiempo-promedio";
import { PromedioData } from "../../shared/interfaces/promedioInterface";

@ApiTags("Reportes - Operación")
@Controller("reportes/operativo")
export class OperacionController {
  constructor(private readonly operacionService: OperacionService) {}

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
      "Permisos insuficientes para visualizar este indicador de eficiencia",
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("coordinador", "direccion_administrativa")
  @UseInterceptors(RedisCacheInterceptor)
  @UseRedisCache("operacion:promedio", 1800)
  async obtenerTiempoPromedioSolicitudes(
    @Body() dto: TiempoPromedioDto,
  ): Promise<PromedioData> {
    return this.operacionService.obtenerTiempoPromedioSolicitudes(dto);
  }
}
