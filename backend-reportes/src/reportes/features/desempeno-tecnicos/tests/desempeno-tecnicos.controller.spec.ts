import { Test, TestingModule } from "@nestjs/testing";
import { DesempenoTecnicosController } from "../desempeno-tecnicos.controller";
import { DesempenoTecnicosService } from "../desempeno-tecnicos.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { RolesGuard } from "../../../shared/auth/roles.guard";

describe("DesempenoTecnicosController", () => {
  let controller: DesempenoTecnicosController;
  let service: jest.Mocked<DesempenoTecnicosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DesempenoTecnicosController],
      providers: [
        {
          provide: DesempenoTecnicosService,
          useValue: {
            obtenerConsolidado: jest.fn(),
            exportarConsolidado: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DesempenoTecnicosController>(
      DesempenoTecnicosController,
    );
    service = module.get(DesempenoTecnicosService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("debe delegar la consulta del consolidado al servicio", async () => {
    const dto = {
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
      especialidad: "Soporte" as const,
    };
    const response: any = { resultados: [] };
    service.obtenerConsolidado.mockResolvedValue(response);

    const result = await controller.obtenerConsolidado(dto);

    expect(result).toBe(response);
    expect(service.obtenerConsolidado).toHaveBeenCalledWith(dto);
  });

  it("debe exportar el consolidado y escribir el buffer en la respuesta", async () => {
    const dto = {
      fechaInicio: "2026-05-01",
      fechaFin: "2026-05-31",
    };
    const query = { formato: "pdf" as const };
    const buffer = Buffer.from("pdf");
    const res = {
      set: jest.fn(),
      send: jest.fn(),
    } as any;

    service.exportarConsolidado.mockResolvedValue(buffer);

    await controller.exportarConsolidado(dto, query, res);

    expect(service.exportarConsolidado).toHaveBeenCalledWith(dto, query);
    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
