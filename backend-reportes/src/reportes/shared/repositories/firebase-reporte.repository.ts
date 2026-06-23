import { Injectable, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";

interface AccessAuditPayload {
  action: string;
  solicitudId: string;
  userId: string;
  timestamp: string;
  ip: string;
  allowed: boolean;
}

interface ReportAuditPayload {
  id?: string;
  periodo: string;
  tipo: string;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  generadoPor: string;
  fechaCreacion: string;
  detalles: any[];
}

@Injectable()
export class FirebaseReporteRepository {
  private readonly logger = new Logger(FirebaseReporteRepository.name);
  private db: admin.firestore.Firestore | null = null;
  private isInitialized = false;

  constructor() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replaceAll(
      "\\n",
      "\n",
    );

    if (projectId && clientEmail && privateKey) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            projectId,
          });
        }

        this.db = admin.firestore();
        this.isInitialized = true;
        this.logger.log(
          `Firebase Firestore initialized successfully for project: ${projectId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Firebase initialization failed: ${error.message}. Running repository in mock mode.`,
        );
      }
    } else {
      this.logger.log(
        "No Firebase credentials found. Running repository in mock mode (Audit Logs in console/memory).",
      );
    }
  }

  async saveAccessLog(payload: AccessAuditPayload): Promise<void> {
    if (this.isInitialized && this.db) {
      try {
        await this.db.collection("audit_logs").add(payload);
        this.logger.log(
          "Access audit log successfully persisted to Firebase Firestore.",
        );
      } catch (error) {
        this.logger.error(
          `Error saving access audit log to Firebase: ${error.message}`,
        );
      }
      return;
    }

    this.logger.log(`[AUDIT ACCESS MOCK] ${JSON.stringify(payload)}`);
  }

  async saveAuditLog(payload: ReportAuditPayload): Promise<void> {
    if (this.isInitialized && this.db) {
      try {
        await this.db.collection("reporte_audit_logs").add(payload);
        this.logger.log(
          "Report audit log successfully persisted to Firebase Firestore.",
        );
      } catch (error) {
        this.logger.error(
          `Error saving report audit log to Firebase: ${error.message}`,
        );
      }
      return;
    }

    this.logger.log(`[AUDIT REPORT MOCK] ${JSON.stringify(payload)}`);
  }
}
