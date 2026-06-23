import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAnalyticsController } from "../finanzas-analytics.controller";
import { FinanzasAnalyticsService } from "../finanzas-analytics.service";
import { BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../../shared/auth/roles.guard";

describe("FinanzasAnalyticsController", () => {
  let controller: FinanzasAnalyticsController;
  let service: jest.Mocked<FinanzasAnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanzasAnalyticsController],
      providers: [
        {
          provide: FinanzasAnalyticsService,
          useValue: {
            generarReporte: jest.fn(),
            obtenerIngresosPorTipoServicio: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FinanzasAnalyticsController>(
      FinanzasAnalyticsController,
    );
    service = module.get(FinanzasAnalyticsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("generarReporte", () => {
    it("deberia retornar los datos generados por el servicio", async () => {
      const mockResult: any = { balance: 100 };
      service.generarReporte.mockResolvedValue(mockResult);

      const res = await controller.generarReporte(
        { periodo: "2024", tipo: "anual" } as any,
        "user1",
      );
      expect(res).toEqual(mockResult);
      expect(service.generarReporte).toHaveBeenCalledWith(
        { periodo: "2024", tipo: "anual" },
        "user1",
      );
    });

    it("deberia arrojar BadRequestException si el servicio falla", async () => {
      service.generarReporte.mockRejectedValue(new Error("fail"));
      await expect(
        controller.generarReporte({} as any, "user1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("deberia formatear el error a string si no es una instancia de Error", async () => {
      service.generarReporte.mockRejectedValue("string error");
      await expect(
        controller.generarReporte({} as any, "user1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("deberia usar usuario por defecto si no se le pasa header userId", async () => {
      const mockResult: any = { balance: 50 };
      service.generarReporte.mockResolvedValue(mockResult);

      await controller.generarReporte(
        { periodo: "2024", tipo: "anual" } as any,
        undefined as any,
      );
      expect(service.generarReporte).toHaveBeenCalledWith(
        { periodo: "2024", tipo: "anual" },
        "anonymous_system_user",
      );
    });
  });

  describe("obtenerIngresosPorTipoServicio", () => {
    it("deberia delegar en el servicio obtenerIngresosPorTipoServicio", async () => {
      const mockResult: any = { moneda: "COP", tabla: [] };
      service.obtenerIngresosPorTipoServicio.mockResolvedValue(mockResult);

      const query = { fechaInicio: "2026-01-01", fechaFin: "2026-06-30", moneda: "COP" as any };
      const user = { sub: "user-123", role: "coordinador_administrativo", unidadIds: [] };
      const req = { ip: "127.0.0.1" };

      const res = await controller.obtenerIngresosPorTipoServicio(query, user, req as any);

      expect(res).toEqual(mockResult);
      expect(service.obtenerIngresosPorTipoServicio).toHaveBeenCalledWith(
        query,
        user,
        "127.0.0.1",
      );
    });

    it("deberia propagar errores del servicio", async () => {
      service.obtenerIngresosPorTipoServicio.mockRejectedValue(new Error("Database error"));

      const query = {};
      const user = { sub: "user-123", role: "coordinador_administrativo", unidadIds: [] };
      const req = { ip: "127.0.0.1" };

      await expect(
        controller.obtenerIngresosPorTipoServicio(query, user, req as any),
      ).rejects.toThrow("Database error");
    });
  });
});

