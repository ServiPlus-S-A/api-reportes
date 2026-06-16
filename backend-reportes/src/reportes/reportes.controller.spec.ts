import { Test, TestingModule } from "@nestjs/testing";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";
import { GenerarReporteDto } from "./dto/generar-reporte.dto";
import { BadRequestException } from "@nestjs/common";

describe("ReportesController", () => {
  let controller: ReportesController;
  let service: ReportesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        {
          provide: ReportesService,
          useValue: {
            generarReporte: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    service = module.get<ReportesService>(ReportesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("generarReporte", () => {
    const dto: GenerarReporteDto = {
      periodo: "2026-05",
      tipo: "finanzas",
    };

    it("should return the result from the service", async () => {
      const expectedResult = { id: "1", balance: 100 } as any;
      jest.spyOn(service, "generarReporte").mockResolvedValue(expectedResult);

      const result = await controller.generarReporte(dto, "user-123");
      expect(result).toBe(expectedResult);
      expect(service.generarReporte).toHaveBeenCalledWith(dto, "user-123");
    });

    it("should use default user if userId header is missing", async () => {
      const expectedResult = { id: "1" } as any;
      jest.spyOn(service, "generarReporte").mockResolvedValue(expectedResult);

      await controller.generarReporte(dto, undefined);
      expect(service.generarReporte).toHaveBeenCalledWith(
        dto,
        "anonymous_system_user",
      );
    });

    it("should throw BadRequestException if service fails", async () => {
      jest
        .spyOn(service, "generarReporte")
        .mockRejectedValue(new Error("Service Error"));

      await expect(controller.generarReporte(dto, "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
