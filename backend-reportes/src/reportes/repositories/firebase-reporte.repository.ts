import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ReporteData } from '../interfaces/reporte.interface';

@Injectable()
export class FirebaseReporteRepository {
  private readonly logger = new Logger(FirebaseReporteRepository.name);
  private db: any = null;
  private isInitialized = false;

  constructor() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId && projectId !== 'your_firebase_project_id') {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projectId,
        });
        this.db = admin.firestore();
        this.isInitialized = true;
        this.logger.log(`Firebase Firestore initialized successfully for project: ${projectId}`);
      } catch (error) {
        this.logger.warn(`Firebase initialization failed: ${error.message}. Running repository in mock mode.`);
      }
    } else {
      this.logger.log('No Firebase credentials found. Running repository in mock mode (Audit Logs in console/memory).');
    }
  }

  // [Pattern: Read-Only Repository / Audit Logger] (Security / Append-Only Logging)
  async saveAuditLog(reporte: ReporteData): Promise<void> {
    const logData = {
      action: 'GENERAR_REPORTE',
      reportId: reporte.id || 'N/A',
      periodo: reporte.periodo,
      tipo: reporte.tipo,
      generadoPor: reporte.generadoPor,
      timestamp: new Date().toISOString(),
    };

    if (this.isInitialized && this.db) {
      try {
        await this.db.collection('audit_logs').add(logData);
        this.logger.log('Audit log successfully persisted to Firebase Firestore.');
      } catch (error) {
        this.logger.error(`Error saving audit log to Firebase: ${error.message}`);
      }
    } else {
      this.logger.log(`[AUDIT MOCK PERSIST] ${JSON.stringify(logData)}`);
    }
  }
}
