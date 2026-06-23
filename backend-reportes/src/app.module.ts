import "dotenv/config";
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ReportesModule } from "./reportes/reportes.module";

@Module({
  imports: [ReportesModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
