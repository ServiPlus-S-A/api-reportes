import { Test, TestingModule } from "@nestjs/testing";
import { HttpClientService } from "./http-client.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("HttpClientService", () => {
  let service: HttpClientService;

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockedAxios as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpClientService],
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return data on GET success", async () => {
    mockedAxios.get.mockResolvedValue({ data: "ok" });
    const result = await service.get("/test");
    expect(result).toBe("ok");
    expect(mockedAxios.get).toHaveBeenCalledWith("/test", undefined);
  });
});
