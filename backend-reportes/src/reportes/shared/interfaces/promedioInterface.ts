export interface PromedioData {
  promedio: number;
  unidad: string;
  promedioTexto: string;
  solicitudesProcesadas: number;
  mensaje?: string;
  historicoUltimos6Meses: Array<{
    mes: string;
    promedioHoras: number;
  }>;
}
