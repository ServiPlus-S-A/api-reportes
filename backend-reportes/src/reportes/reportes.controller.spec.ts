import { Test, TestingModule } from "@nestjs/testing";
import { JwtReportesService } from "./auth/jwt-reportes.service";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

describe("ReportesController", () => {
  let controller: ReportesController;
  let service: {
    obtenerDetalleSolicitudCompletada: jest.Mock;
  };
  let jwtService: { validateToken: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        {
          provide: ReportesService,
          useValue: {
            obtenerDetalleSolicitudCompletada: jest.fn().mockResolvedValue({
              id: "REQ-12345",
            }),
          },
        },
        {
          provide: JwtReportesService,
          useValue: {
            validateToken: jest.fn().mockReturnValue({
              sub: "coord-1",
              role: "coordinador",
              unidadIds: ["reportes-centro"],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    service = module.get(ReportesService);
    jwtService = module.get(JwtReportesService);
  });

  it("delegates detalle request to service using jwt payload and request ip", async () => {
    await controller.obtenerDetalleSolicitud(
      "REQ-12345",
      { page: 1, pageSize: 10 },
      {
        ip: "127.0.0.1",
        headers: { authorization: "Bearer test-token" },
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
    );

    expect(jwtService.validateToken).toHaveBeenCalledWith("Bearer test-token");
    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      "127.0.0.1",
      1,
      10,
    );
  });

  it("uses socket remote address when req.ip is unavailable", async () => {
    await controller.obtenerDetalleSolicitud(
      "REQ-12345",
      {},
      {
        headers: { authorization: "Bearer test-token" },
        socket: { remoteAddress: "10.0.0.5" },
      } as any,
    );

    expect(service.obtenerDetalleSolicitudCompletada).toHaveBeenCalledWith(
      "REQ-12345",
      expect.any(Object),
      "10.0.0.5",
      1,
      10,
    );
  });
});
