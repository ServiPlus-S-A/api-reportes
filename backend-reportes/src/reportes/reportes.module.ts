import { Module } from "@nestjs/common";
import { OperacionController } from "./features/operacion/operacion.controller";
import { OperacionService } from "./features/operacion/operacion.service";
import { FinanzasAnalyticsController } from "./features/finanzas-analytics/finanzas-analytics.controller";
import { FinanzasAnalyticsService } from "./features/finanzas-analytics/finanzas-analytics.service";
import { TrazabilidadController } from "./features/trazabilidad/trazabilidad.controller";
import { TrazabilidadService } from "./features/trazabilidad/trazabilidad.service";

import { AtencionesAdapter } from "./integraciones/atenciones/atenciones.adapter";
import { ClientesAdapter } from "./integraciones/parametrizacion/clientes.adapter";
import { ConsultoresAdapter } from "./integraciones/parametrizacion/consultores.adapter";
import { FinanzasAdapter } from "./integraciones/finanzas/finanzas.adapter";
import { ServiciosAdapter } from "./integraciones/parametrizacion/servicios.adapter";
import { SolicitudesAdapter } from "./integraciones/solicitudes/solicitudes.adapter";

import { JwtReportesService } from "./shared/auth/jwt-reportes.service";
import { JwtAuthGuard } from "./shared/auth/jwt-auth.guard";
import { RolesGuard } from "./shared/auth/roles.guard";
import { FirebaseReporteRepository } from "./shared/repositories/firebase-reporte.repository";

@Module({
  controllers: [
    OperacionController,
    FinanzasAnalyticsController,
    TrazabilidadController,
  ],
  providers: [
    OperacionService,
    FinanzasAnalyticsService,
    TrazabilidadService,
    FirebaseReporteRepository,
    FinanzasAdapter,
    SolicitudesAdapter,
    ClientesAdapter,
    ServiciosAdapter,
    ConsultoresAdapter,
    AtencionesAdapter,
    JwtReportesService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class ReportesModule {}
