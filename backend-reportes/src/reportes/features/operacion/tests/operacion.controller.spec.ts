import { Test, TestingModule } from "@nestjs/testing";
import { OperacionController } from "../operacion.controller";
import { OperacionService } from "../operacion.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../../shared/auth/roles.guard";
import { RedisCacheInterceptor } from "../../../shared/cache/redis-cache.interceptor";
import { RedisCacheService } from "../../../shared/cache/redis-cache.service";
import { Reflector } from "@nestjs/core";

// Mock ioredis to prevent real Redis connections
jest.mock("ioredis", () => {
  const mockRedis = {
    status: "close",
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    disconnect: jest.fn(),
  };
  return { default: jest.fn(() => mockRedis), __esModule: true };
});

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
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            onModuleInit: jest.fn(),
            onModuleDestroy: jest.fn(),
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(RedisCacheInterceptor)
      .useValue({ intercept: (ctx: any, next: any) => next.handle() })
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

    it("deberia propagar el error del servicio", async () => {
      service.obtenerTiempoPromedioSolicitudes.mockRejectedValue(
        new Error("Service Error"),
      );

      await expect(
        controller.obtenerTiempoPromedioSolicitudes({} as any),
      ).rejects.toThrow("Service Error");
    });
  });
});
