import { Test, TestingModule } from "@nestjs/testing";
import { TrazabilidadController } from "../trazabilidad.controller";
import { TrazabilidadService } from "../trazabilidad.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";

describe("TrazabilidadController", () => {
  let controller: TrazabilidadController;
  let service: jest.Mocked<TrazabilidadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrazabilidadController],
      providers: [
        {
          provide: TrazabilidadService,
          useValue: {
            obtenerDetalleSolicitudCompletada: jest.fn(),
            exportarAtenciones: jest.fn(),
            obtenerAtencionesAnidadas: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrazabilidadController>(TrazabilidadController);
    service = module.get(TrazabilidadService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("Endpoints core de Trazabilidad", () => {
    it("Llama al servicio para obtener detalles de la solicitud", async () => {
      service.obtenerDetalleSolicitudCompletada.mockResolvedValue({
        id: "1",
      } as any);

      const response = await controller.obtenerDetalleSolicitud(
        "1",
        {} as any,
        {} as any,
        { ip: "127.0.0.1" } as any,
      );

      expect(response).toBeDefined();
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalled();
    });

    it("Llama al servicio para exportar las atenciones a un pdf buffer", async () => {
      const bufferDePrueba = Buffer.from("test pdf content");
      service.exportarAtenciones.mockResolvedValue(bufferDePrueba);

      const resObj = { set: jest.fn(), send: jest.fn() };

      await controller.exportarAtenciones(
        "1",
        { formato: "pdf" },
        {} as any,
        { ip: "127.0.0.1" } as any,
        resObj as any,
      );

      expect(resObj.set).toHaveBeenCalled();
      expect(resObj.send).toHaveBeenCalledWith(bufferDePrueba);
      expect(service.exportarAtenciones).toHaveBeenCalled();
    });

    it("Llama al servicio para obtener listado de atenciones de una solicitud", async () => {
      service.obtenerAtencionesAnidadas.mockResolvedValue({
        atenciones: [],
      } as any);

      const res = await controller.obtenerAtenciones(
        "1",
        {} as any,
        {} as any,
        { ip: "127.0.0.1" } as any,
      );
      expect(res).toBeDefined();
      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalled();
    });
  });
});
