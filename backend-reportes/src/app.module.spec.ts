import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "./app.module";

// Mock firebase-admin so FirebaseReporteRepository can be instantiated without credentials
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn().mockReturnValue({}),
  credential: { cert: jest.fn() },
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ exists: false }),
      }),
    }),
  }),
}));

// Mock ioredis to prevent real Redis connections in FinanzasAnalyticsService
jest.mock("ioredis", () => {
  const mockRedis = {
    status: "close",
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    disconnect: jest.fn(),
  };
  return { default: jest.fn(() => mockRedis), __esModule: true };
});

describe("AppModule", () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it("should compile the module", () => {
    expect(module).toBeDefined();
  });
});
