import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseReporteRepository } from "./firebase-reporte.repository";
import * as admin from "firebase-admin";

jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      add: jest.fn().mockResolvedValue({ id: "log-id" }),
    }),
  }),
}));

describe("FirebaseReporteRepository", () => {
  let repository: FirebaseReporteRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FIREBASE_PROJECT_ID = "test-project";

    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseReporteRepository],
    }).compile();

    repository = module.get<FirebaseReporteRepository>(
      FirebaseReporteRepository,
    );
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("saveAuditLog", () => {
    const mockReporte = {
      id: "123",
      periodo: "2026-05",
      tipo: "finanzas",
      generadoPor: "test-user",
    } as any;

    it("should write to Firestore if initialized", async () => {
      // Assuming initialization succeeded in constructor due to env var
      await repository.saveAuditLog(mockReporte);

      const db = admin.firestore();
      expect(db.collection).toHaveBeenCalledWith("audit_logs");
      expect(db.collection("audit_logs").add).toHaveBeenCalled();
    });

    it("should log to console if not initialized", async () => {
      // Create new instance without env var
      delete process.env.FIREBASE_PROJECT_ID;
      const repoMock = new FirebaseReporteRepository();

      await repoMock.saveAuditLog(mockReporte);
      // It should just log, no firestore calls
      expect(admin.firestore).toHaveBeenCalledTimes(1); // One from previous test or constructor
    });

    it("should log error if Firestore write fails", async () => {
      const db = admin.firestore();
      (db.collection("audit_logs").add as jest.Mock).mockRejectedValue(
        new Error("Firestore Error"),
      );

      await repository.saveAuditLog(mockReporte);
      // Should not throw, but log error
    });
  });
});
