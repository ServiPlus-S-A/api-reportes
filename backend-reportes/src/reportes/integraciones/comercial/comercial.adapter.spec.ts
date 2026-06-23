import { Test, TestingModule } from "@nestjs/testing";
import { ComercialAdapter } from "./comercial.adapter";

describe("ComercialAdapter", () => {
  let adapter: ComercialAdapter;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ComercialAdapter],
    }).compile();

    adapter = module.get<ComercialAdapter>(ComercialAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EXTERNAL_COMERCIAL_URL;
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from fetch when URL is provided", async () => {
    process.env.EXTERNAL_COMERCIAL_URL = "http://external-comercial.com/api";
    const mockData = [{ id: "FAC-1", tipoServicio: "Soporte", monto: 100, moneda: "COP", estadoFactura: "Pagada", fechaFactura: "2026-01-01" }];
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    });

    const result = await adapter.fetchFacturasPagadas();

    expect(result).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledWith("http://external-comercial.com/api", {
      signal: expect.any(AbortSignal),
    });
  });

  it("should throw integration error if fetch response is not ok", async () => {
    process.env.EXTERNAL_COMERCIAL_URL = "http://external-comercial.com/api";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(adapter.fetchFacturasPagadas()).rejects.toThrow(
      "Error de integración comercial: HTTP status error: 500",
    );
  });

  it("should throw integration error if fetch fails with network error", async () => {
    process.env.EXTERNAL_COMERCIAL_URL = "http://external-comercial.com/api";
    fetchMock.mockRejectedValue(new Error("Timeout or DNS failure"));

    await expect(adapter.fetchFacturasPagadas()).rejects.toThrow(
      "Error de integración comercial: Timeout or DNS failure",
    );
  });

  it("should return fallback mock data if URL is empty", async () => {
    process.env.EXTERNAL_COMERCIAL_URL = "";

    const result = await adapter.fetchFacturasPagadas();

    expect(result).toHaveLength(7);
    expect(result[0].id).toBe("FAC-001");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
