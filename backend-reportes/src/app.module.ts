import "dotenv/config";
import { Module } from "@nestjs/common";
import { ReportesController } from "./reportes/reportes.controller";
import { ReportesService } from "./reportes/reportes.service";
import { FirebaseReporteRepository } from "./reportes/repositories/firebase-reporte.repository";
import { HealthController } from "./health.controller";
import { SolicitudesAdapter } from "./reportes/adapters/solicitudes.adapter";
import { ClientesAdapter } from "./reportes/adapters/clientes.adapter";
import { ServiciosAdapter } from "./reportes/adapters/servicios.adapter";
import { ConsultoresAdapter } from "./reportes/adapters/consultores.adapter";
import { JwtReportesService } from "./reportes/auth/jwt-reportes.service";

// Inline simple health controller for Docker checks
@Module({
  controllers: [HealthController, ReportesController],
  providers: [
    ReportesService,
    FirebaseReporteRepository,
    SolicitudesAdapter,
    ClientesAdapter,
    ServiciosAdapter,
    ConsultoresAdapter,
    JwtReportesService,
  ],
})
export class AppModule {}
