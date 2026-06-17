import { Module } from "@nestjs/common";
import { ReportesController } from "./reportes/reportes.controller";
import { ReportesService } from "./reportes/reportes.service";
import { FinanzasAdapter } from "./reportes/adapters/finanzas.adapter";
import { SolicitudesAdapter } from "./reportes/adapters/solicitudes.adapter";
import { FirebaseReporteRepository } from "./reportes/repositories/firebase-reporte.repository";
import { HealthController } from "./health.controller";

// Inline simple health controller for Docker checks
@Module({
  controllers: [HealthController, ReportesController],
  providers: [
    ReportesService,
    FinanzasAdapter,
    SolicitudesAdapter,
    FirebaseReporteRepository,
  ],
})
export class AppModule {}
