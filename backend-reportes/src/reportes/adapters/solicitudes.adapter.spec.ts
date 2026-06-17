import { Test, TestingModule } from "@nestjs/testing";
import { SolicitudesAdapter } from "./solicitudes.adapter";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("SolicitudesAdapter", () => {
  let adapter: SolicitudesAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SolicitudesAdapter],
    }).compile();

    adapter = module.get<SolicitudesAdapter>(SolicitudesAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should return data from axios when URL is provided", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    const mockData = [{ id: "sol-1", estado: "Completada" }];
    mockedAxios.get.mockResolvedValue({ data: mockData });

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toBe(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://external-solicitudes.com",
      { timeout: 3000 },
    );
  });

  it("should return fallback demo data if axios fails", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "http://external-solicitudes.com";
    mockedAxios.get.mockRejectedValue(new Error("Network Error"));

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(result[0]).toHaveProperty("id");
  });

  it("should return fallback demo data if URL is empty", async () => {
    process.env.EXTERNAL_SOLICITUDES_URL = "";

    const result = await adapter.fetchSolicitudesParaPromedio();

    expect(result).toHaveLength(6);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
