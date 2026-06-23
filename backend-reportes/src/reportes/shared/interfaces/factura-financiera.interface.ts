export interface FacturaFinanciera {
  idFactura: string;
  nombreCliente: string;
  tipoServicio: string;
  valorServicio: number;
  impuestosAplicados: number;
  totalNeto: number;
  fecha: string;
}

export interface ArchivoFinanciero {
  buffer: Buffer;
  contentType: string;
  nombreArchivo: string;
  totalRegistros: number;
}
