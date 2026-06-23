import { Test, TestingModule } from "@nestjs/testing";
import { FinanzasAdapter } from "./finanzas.adapter";

describe("FinanzasAdapter", () => {
  let adapter: FinanzasAdapter;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanzasAdapter],
    }).compile();

    adapter = module.get<FinanzasAdapter>(FinanzasAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_FINANZAS_URL;
    delete process.env.EXTERNAL_FINANZAS_EXPORT_URL;
  });

  it("returns financial invoices filtered by date for export", async () => {
    const result = await adapter.fetchFacturasParaExportar(
      "2026-01-01T00:00:00.000Z",
      "2026-01-31T23:59:59.999Z",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        idFactura: expect.any(String),
        nombreCliente: expect.any(String),
        tipoServicio: expect.any(String),
        valorServicio: expect.any(Number),
        impuestosAplicados: expect.any(Number),
        totalNeto: expect.any(Number),
      }),
    );
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from axios when URL is provided", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
    const mockData = [{ id: "1", monto: 100, tipo: "ingreso" }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
    });

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toBe(mockData);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://external-api.com?periodo=2026-05",
      { signal: expect.any(AbortSignal) },
    );
  });

  it("should return fallback data if axios fails", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com";
    fetchMock.mockRejectedValue(new Error("Network Error"));

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty("descripcion");
  });

  it("should return fallback data if URL is empty", async () => {
    process.env.EXTERNAL_FINANZAS_URL = "";

    const result = await adapter.fetchIngresosPorPeriodo("2026-05");

    expect(result).toHaveLength(5);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("fetchFacturasParaExportar con API externa", () => {
    it("obtiene facturas desde EXTERNAL_FINANZAS_EXPORT_URL con el rango consultado", async () => {
      process.env.EXTERNAL_FINANZAS_EXPORT_URL =
        "http://external-api.com/exportar";
      const facturas = [
        {
          idFactura: "FAC-1",
          nombreCliente: "Cliente",
          tipoServicio: "Consultoria",
          valorServicio: 100,
          impuestosAplicados: 19,
          totalNeto: 119,
          fecha: "2026-01-01T00:00:00.000Z",
        },
      ];
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(facturas),
      });

      const result = await adapter.fetchFacturasParaExportar(
        "2026-01-01T00:00:00.000Z",
        "2026-01-31T23:59:59.999Z",
      );

      expect(result).toBe(facturas);
      const calledUrl = new URL(fetchMock.mock.calls[0][0]);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "http://external-api.com/exportar",
      );
      expect(calledUrl.searchParams.get("fechaInicio")).toBe(
        "2026-01-01T00:00:00.000Z",
      );
      expect(calledUrl.searchParams.get("fechaFin")).toBe(
        "2026-01-31T23:59:59.999Z",
      );
    });

    it("construye la URL de facturas desde EXTERNAL_FINANZAS_URL cuando no hay URL específica", async () => {
      process.env.EXTERNAL_FINANZAS_URL = "http://external-api.com/base/";
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      await adapter.fetchFacturasParaExportar(
        "2026-01-01T00:00:00.000Z",
        "2026-01-31T23:59:59.999Z",
      );

      const calledUrl = new URL(fetchMock.mock.calls[0][0]);
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        "http://external-api.com/base/facturas",
      );
    });

    it("rechaza respuestas HTTP no exitosas", async () => {
      process.env.EXTERNAL_FINANZAS_EXPORT_URL =
        "http://external-api.com/exportar";
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: jest.fn(),
      });

      await expect(
        adapter.fetchFacturasParaExportar(
          "2026-01-01T00:00:00.000Z",
          "2026-01-31T23:59:59.999Z",
        ),
      ).rejects.toThrow("FINANZAS_API_503");
    });

    it("rechaza respuestas externas que no sean arreglos", async () => {
      process.env.EXTERNAL_FINANZAS_EXPORT_URL =
        "http://external-api.com/exportar";
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [] }),
      });

      await expect(
        adapter.fetchFacturasParaExportar(
          "2026-01-01T00:00:00.000Z",
          "2026-01-31T23:59:59.999Z",
        ),
      ).rejects.toThrow("INVALID_FINANZAS_RESPONSE");
    });
  });
});
