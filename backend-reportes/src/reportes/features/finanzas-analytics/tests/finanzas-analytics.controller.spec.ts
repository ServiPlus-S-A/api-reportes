import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAnalyticsController } from "../finanzas-analytics.controller";
import { FinanzasAnalyticsService } from "../finanzas-analytics.service";
import { BadRequestException } from "@nestjs/common";

describe("FinanzasAnalyticsController", () => {
  let controller: FinanzasAnalyticsController;
  let service: jest.Mocked<FinanzasAnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanzasAnalyticsController],
      providers: [
        {
          provide: FinanzasAnalyticsService,
          useValue: { generarReporte: jest.fn() },
        },
      ],
    }).compile();

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
  });
});
