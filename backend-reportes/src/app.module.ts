import "dotenv/config";
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ReportesController } from "./reportes/reportes.controller";
import { ReportesService } from "./reportes/reportes.service";
import { AtencionesAdapter } from "./reportes/adapters/atenciones.adapter";
import { ClientesAdapter } from "./reportes/adapters/clientes.adapter";
import { ConsultoresAdapter } from "./reportes/adapters/consultores.adapter";
import { FinanzasAdapter } from "./reportes/adapters/finanzas.adapter";
import { ServiciosAdapter } from "./reportes/adapters/servicios.adapter";
import { SolicitudesAdapter } from "./reportes/adapters/solicitudes.adapter";
import { JwtReportesService } from "./reportes/auth/jwt-reportes.service";
import { JwtAuthGuard } from "./reportes/auth/jwt-auth.guard";
import { RolesGuard } from "./reportes/auth/roles.guard";
import { FirebaseReporteRepository } from "./reportes/repositories/firebase-reporte.repository";

@Module({
  controllers: [HealthController, ReportesController],
  providers: [
    ReportesService,
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
export class AppModule {}
