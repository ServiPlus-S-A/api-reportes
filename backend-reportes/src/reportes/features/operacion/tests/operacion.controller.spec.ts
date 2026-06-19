import { Test, TestingModule } from "@nestjs/testing";
import { OperacionController } from "../operacion.controller";
import { OperacionService } from "../operacion.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../../shared/auth/roles.guard";

describe("OperacionController", () => {
  let controller: OperacionController;
  let service: jest.Mocked<OperacionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperacionController],
      providers: [
        {
          provide: OperacionService,
          useValue: { obtenerTiempoPromedioSolicitudes: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OperacionController>(OperacionController);
    service = module.get(OperacionService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("obtenerTiempoPromedioSolicitudes", () => {
    it("deberia retornar el promedio delegado por el servicio al hacer el POST", async () => {
      const mockResult: any = { promedio: 10 };
      service.obtenerTiempoPromedioSolicitudes.mockResolvedValue(mockResult);

      const dto = {};
      const result = await controller.obtenerTiempoPromedioSolicitudes(
        dto as any,
      );
      expect(result).toEqual(mockResult);
      expect(service.obtenerTiempoPromedioSolicitudes).toHaveBeenCalledWith(
        dto,
      );
    });
  });
});
