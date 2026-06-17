import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseReporteRepository } from "./firebase-reporte.repository";
import * as admin from "firebase-admin";

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(),
}));

describe("FirebaseReporteRepository", () => {
  let repository: FirebaseReporteRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL =
      "firebase-adminsdk-fbsvc@serviplus-reportes.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY =
      "-----BEGIN PRIVATE KEY-----\\nmock-key\\n-----END PRIVATE KEY-----\\n";

    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: jest.fn().mockReturnValue({
        add: jest.fn().mockResolvedValue({ id: "log-id" }),
      }),
    });

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

  describe("saveAccessLog", () => {
    it("should write access log to Firestore if initialized", async () => {
      const payload = {
        action: "VIEW_SOLICITUD_DETALLE",
        solicitudId: "REQ-12345",
        userId: "coord-1",
        timestamp: new Date().toISOString(),
        ip: "127.0.0.1",
        allowed: true,
      };

      await repository.saveAccessLog(payload);

      const db = (admin.firestore as unknown as jest.Mock).mock.results[0].value;
      expect(db.collection).toHaveBeenCalledWith("audit_logs");
      expect(db.collection("audit_logs").add).toHaveBeenCalledWith(payload);
    });

    it("should log to console if not initialized", async () => {
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      const repoMock = new FirebaseReporteRepository();
      const loggerSpy = jest
        .spyOn((repoMock as any).logger, "log")
        .mockImplementation(() => undefined);

      await repoMock.saveAccessLog({
        action: "VIEW_SOLICITUD_DETALLE",
        solicitudId: "REQ-12345",
        userId: "coord-1",
        timestamp: new Date().toISOString(),
        ip: "127.0.0.1",
        allowed: true,
      });

      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should log error if Firestore write fails", async () => {
      const db = (admin.firestore as unknown as jest.Mock).mock.results[0].value;
      (db.collection("audit_logs").add as jest.Mock).mockRejectedValue(
        new Error("Firestore Error"),
      );

      await repository.saveAccessLog({
        action: "VIEW_SOLICITUD_DETALLE",
        solicitudId: "REQ-12345",
        userId: "coord-1",
        timestamp: new Date().toISOString(),
        ip: "127.0.0.1",
        allowed: true,
      });
    });
  });
});
