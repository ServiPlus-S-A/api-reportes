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

    it("resuelve la ip desde remoteAddress o 0.0.0.0 en obtenerDetalleSolicitud", async () => {
      service.obtenerDetalleSolicitudCompletada.mockResolvedValue({} as any);

      await controller.obtenerDetalleSolicitud(
        "1",
        { page: 2 } as any,
        {} as any,
        { socket: { remoteAddress: "10.0.0.1" } } as any,
      );
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
        "1",
        {},
        "10.0.0.1",
        2,
        10,
      );

      await controller.obtenerDetalleSolicitud(
        "1",
        { pageSize: 5 } as any,
        {} as any,
        { socket: {} } as any,
      );
      expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
        "1",
        {},
        "0.0.0.0",
        1,
        5,
      );
    });

    it("Llama al servicio para exportar atenciones a excel", async () => {
      const bufferDePrueba = Buffer.from("excel data");
      service.exportarAtenciones.mockResolvedValue(bufferDePrueba);

      const resObj = { set: jest.fn(), send: jest.fn() };

      await controller.exportarAtenciones(
        "1",
        { formato: "excel" },
        {} as any,
        { socket: {} } as any, // cubre fallback 0.0.0.0
        resObj as any,
      );

      expect(resObj.set).toHaveBeenCalled();
      expect(resObj.send).toHaveBeenCalledWith(bufferDePrueba);
      expect(service.exportarAtenciones).toHaveBeenCalledWith(
        "1",
        "excel",
        {},
        "0.0.0.0",
      );
    });

    it("resuelve ip fallback en obtenerAtenciones", async () => {
      service.obtenerAtencionesAnidadas.mockResolvedValue({} as any);

      await controller.obtenerAtenciones(
        "1",
        { page: 2, pageSize: 20 } as any,
        {} as any,
        { socket: {} } as any,
      );
      expect(service.obtenerAtencionesAnidadas).toHaveBeenCalledWith(
        "1",
        {},
        "0.0.0.0",
        2,
        20,
      );
    });
  });
});
