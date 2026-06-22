export interface ReporteData {
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
