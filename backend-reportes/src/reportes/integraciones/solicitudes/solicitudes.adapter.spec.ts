import { Test, TestingModule } from "@nestjs/testing";
import { SolicitudesAdapter } from "./solicitudes.adapter";

describe("SolicitudesAdapter", () => {
  let adapter: SolicitudesAdapter;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SolicitudesAdapter],
    }).compile();

    adapter = module.get<SolicitudesAdapter>(SolicitudesAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_SOLICITUDES_URL;
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from axios when URL is provided", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    const mockData = [{ id: "sol-1", estado: "Completada" }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
    });

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toBe(mockData);
    expect(fetchMock).toHaveBeenCalledWith("http://external-solicitudes.com", {
      signal: expect.any(AbortSignal),
    });
  });

  it("should return fallback demo data if axios fails", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    fetchMock.mockRejectedValue(new Error("Network Error"));

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(result[0]).toHaveProperty("id");
  });

  it("should return fallback demo data if fetch rejects with non-Error value", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    fetchMock.mockRejectedValue("connection refused");

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
  });

  it("should return fallback demo data if URL is empty", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "";

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a mocked completed solicitud", async () => {
    const result = await adapter.obtenerSolicitudPorId("REQ-12345");
    expect(result?.estado).toBe("completada");
  });

  it("returns null for unknown solicitud", async () => {
    await expect(
      adapter.obtenerSolicitudPorId("REQ-00000"),
    ).resolves.toBeNull();
  });

  it("returns mocked solicitudes for desempeno", async () => {
    const result = await adapter.fetchSolicitudesParaDesempeno();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("tecnicoId");
  });

  // ─── obtenerSolicitudesEnEjecucion ───────────────────────────────────────────

  describe("obtenerSolicitudesEnEjecucion", () => {
    it("debe retornar solo solicitudes con estado En Ejecución o En Proceso", async () => {
      const result = await adapter.obtenerSolicitudesEnEjecucion();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((s) => {
        expect(["En Ejecución", "En Proceso"]).toContain(s.estado);
      });
    });

    it("debe retornar la estructura correcta de cada solicitud", async () => {
      const result = await adapter.obtenerSolicitudesEnEjecucion();
      const first = result[0];

      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("estado");
      expect(first).toHaveProperty("clienteNombre");
      expect(first).toHaveProperty("servicioNombre");
      expect(first).toHaveProperty("prioridad");
      expect(first).toHaveProperty("tecnicoId");
      expect(first).toHaveProperty("tecnicoNombre");
      expect(first).toHaveProperty("fechaInicioEjecucion");
      expect(first).toHaveProperty("porcentajeAvance");
    });

    it("debe usar fallbacks cuando faltan datos opcionales", async () => {
      // sol-des-004 es estado 'En Proceso' pero no tiene clienteNombre, servicioNombre, etc.
      const result = await adapter.obtenerSolicitudesEnEjecucion();
      const sinCliente = result.find((s) => s.id === "sol-des-004");

      // Como sol-des-004 no tiene clienteNombre → fallback "Desconocido"
      expect(sinCliente).toBeDefined();
      expect(sinCliente!.clienteNombre).toBe("Desconocido");
      expect(sinCliente!.servicioNombre).toBe("No especificado");
      expect(sinCliente!.prioridad).toBe("Media");
      expect(sinCliente!.tecnicoNombre).toBe("Sin asignar");
      expect(sinCliente!.porcentajeAvance).toBe(0);
    });

    it("debe retornar solicitud REQ-EJEC-001 con datos reales (sin fallback)", async () => {
      const result = await adapter.obtenerSolicitudesEnEjecucion();
      const ejec = result.find((s) => s.id === "REQ-EJEC-001");

      expect(ejec).toBeDefined();
      expect(ejec!.clienteNombre).toBe("Industrias Nova SAS");
      expect(ejec!.servicioNombre).toBe("Implementacion de mesa de ayuda");
      expect(ejec!.prioridad).toBe("Alta");
      expect(ejec!.tecnicoId).toBe("tec-001");
      expect(ejec!.tecnicoNombre).toBe("Andrea Salazar");
      expect(ejec!.porcentajeAvance).toBe(45);
    });

    it("debe asignar fechaInicioEjecucion actual como fallback si no existe en el mock", async () => {
      const before = Date.now();
      const result = await adapter.obtenerSolicitudesEnEjecucion();
      const after = Date.now();

      // sol-des-004 no tiene fechaInicioEjecucion → se genera de new Date()
      const sinFecha = result.find((s) => s.id === "sol-des-004");
      expect(sinFecha).toBeDefined();

      const generada = new Date(sinFecha!.fechaInicioEjecucion).getTime();
      expect(generada).toBeGreaterThanOrEqual(before);
      expect(generada).toBeLessThanOrEqual(after);
    });
  });
});
