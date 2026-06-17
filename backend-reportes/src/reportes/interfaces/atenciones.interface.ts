export interface AtencionRaw {
  id: string;
  solicitudId: string;
  descripcion: string | null;
  lugar: string | null;
  fechaHora: string | null;
  consultorId: string | null;
  nombreConsultor: string | null;
}

export interface ExportOptions {
  formato: "pdf" | "excel";
  timeout: number;
}
