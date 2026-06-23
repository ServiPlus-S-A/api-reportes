import { Test, TestingModule } from "@nestjs/testing";
import { OperacionService } from "../operacion.service";
import { SolicitudesAdapter } from "../../../integraciones/solicitudes/solicitudes.adapter";

describe("OperacionService", () => {
  let service: OperacionService;
  let adapter: jest.Mocked<SolicitudesAdapter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperacionService,
        {
          provide: SolicitudesAdapter,
          useValue: {
            fetchSolicitudesParaPromedio: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<OperacionService>(OperacionService);
    adapter = module.get(SolicitudesAdapter);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("obtenerTiempoPromedioSolicitudes", () => {
    it("deberia retornar promedio 0 si no hay solicitudes", async () => {
      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(res.promedio).toBe(0);
      expect(res.mensaje).toBe(
        "Sin datos de cierre para el periodo consultado",
      );
      expect(res.promedioTexto).toBe("0.0");
      expect(res.historicoUltimos6Meses).toHaveLength(6);
    });

    it("deberia calcular promedio de horas exitosamente para solicitudes cerradas dentro del rango", async () => {
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Completada",
          fechaCreacion: "2024-01-01T00:00:00Z",
          fechaCompletada: "2024-01-01T02:00:00Z",
          tipoServicio: "A",
        },
        {
          estado: "Completada",
          fechaCreacion: "2024-01-02T00:00:00Z",
          fechaCompletada: "2024-01-02T04:00:00Z",
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({
        tipoServicio: "A",
      });
      expect(res.promedio).toBe(3); // (2 h + 4 h) / 2
      expect(res.solicitudesProcesadas).toBe(2);
    });
    it("deberia ignorar solicitudes que no esten completadas al calcular historico y promedio", async () => {
      const now = new Date();
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Completada",
          fechaCreacion: now.toISOString(),
          fechaCompletada: new Date(
            now.getTime() + 2 * 3600 * 1000,
          ).toISOString(),
          tipoServicio: "A",
        },
        {
          estado: "En Proceso",
          fechaCreacion: now.toISOString(),
          fechaCompletada: null,
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(res.promedio).toBe(2);
      expect(res.solicitudesProcesadas).toBe(1);

      const historicoReciente =
        res.historicoUltimos6Meses[res.historicoUltimos6Meses.length - 1];
      expect(historicoReciente.promedioHoras).toBe(2);
    });

    it("deberia manejar meses en el historico donde no haya data y retorne 0", async () => {
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([]);

      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(
        res.historicoUltimos6Meses.every((m) => m.promedioHoras === 0),
      ).toBe(true);
    });

    it("incluye todo el día indicado como fecha fin", async () => {
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Completada",
          fechaCreacion: "2026-01-31T18:00:00Z",
          fechaCompletada: "2026-01-31T20:00:00Z",
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({
        fechaInicio: "2026-01-31",
        fechaFin: "2026-01-31",
      });
      expect(res.solicitudesProcesadas).toBe(1);
    });

    it("rechaza un rango de fechas invertido", async () => {
      await expect(
        service.obtenerTiempoPromedioSolicitudes({
          fechaInicio: "2026-02-01",
          fechaFin: "2026-01-01",
        }),
      ).rejects.toThrow(
        "La fecha de inicio no puede ser posterior a la fecha fin",
      );
    });

    it("excluye canceladas, anuladas y duraciones inválidas", async () => {
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Cancelada",
          fechaCreacion: "2026-01-01T00:00:00Z",
          fechaCompletada: "2026-01-01T01:00:00Z",
          tipoServicio: "A",
        },
        {
          estado: "Anulada",
          fechaCreacion: "2026-01-01T00:00:00Z",
          fechaCompletada: null,
          tipoServicio: "A",
        },
        {
          estado: "Completada",
          fechaCreacion: "2026-01-02T02:00:00Z",
          fechaCompletada: "2026-01-02T01:00:00Z",
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(res.solicitudesProcesadas).toBe(0);
      expect(res.promedioTexto).toBe("0.0");
    });

    it("agrupa el histórico por el mes de cierre aunque la creación sea del mes anterior", async () => {
      const now = new Date();
      const cierre = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 1),
      );
      const creacion = new Date(cierre.getTime() - 2 * 60 * 60 * 1000);
      adapter.fetchSolicitudesParaPromedio.mockResolvedValue([
        {
          estado: "Completada",
          fechaCreacion: creacion.toISOString(),
          fechaCompletada: cierre.toISOString(),
          tipoServicio: "A",
        },
      ]);

      const res = await service.obtenerTiempoPromedioSolicitudes({});
      expect(res.historicoUltimos6Meses.at(-1)?.promedioHoras).toBe(2);
      expect(adapter.fetchSolicitudesParaPromedio).toHaveBeenCalledTimes(1);
    });
  });
});
