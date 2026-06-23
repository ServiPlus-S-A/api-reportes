import PDFDocument from "pdfkit";
import { Workbook } from "exceljs";
import {
  DesempenoTecnicoResultadoDto,
  DesempenoTecnicosResponseDto,
} from "../dto/desempeno-tecnicos.dto";

function formatearCalificacion(calificacion: number | null): string {
  return calificacion === null ? "N/A" : calificacion.toFixed(2);
}

export async function generarDesempenoTecnicosPDF(
  reporte: DesempenoTecnicosResponseDto,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (error) => reject(error));

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("Consolidado de servicios completados por técnico", {
          align: "center",
        });

      doc.moveDown(1);
      doc.font("Helvetica").fontSize(10);
      doc.text(`Fecha inicial: ${reporte.fechaInicio}`);
      doc.text(`Fecha final: ${reporte.fechaFin}`);
      doc.text(`Especialidad: ${reporte.especialidad ?? "Todas"}`);
      doc.text(`Total tecnicos: ${reporte.totalTecnicos}`);
      doc.text(
        `Total servicios completados: ${reporte.totalServiciosCompletados}`,
      );
      doc.moveDown(1);

      reporte.resultados.forEach(
        (resultado: DesempenoTecnicoResultadoDto, index: number) => {
          if (index > 0 && index % 18 === 0) {
            doc.addPage();
          }

          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(`${index + 1}. ${resultado.nombreTecnico}`);
          doc.font("Helvetica").fontSize(10);
          doc.text(`Especialidad: ${resultado.especialidad}`, { indent: 10 });
          doc.text(
            `Servicios completados: ${resultado.cantidadServiciosCompletados}`,
            { indent: 10 },
          );
          doc.text(
            `Calificacion promedio: ${formatearCalificacion(
              resultado.calificacionPromedio,
            )}`,
            { indent: 10 },
          );
          doc.moveDown(0.5);
        },
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generarDesempenoTecnicosExcel(
  reporte: DesempenoTecnicosResponseDto,
): Promise<Buffer> {
  const workbook = new Workbook();
  const resumen = workbook.addWorksheet("Consolidado");

  resumen.columns = [
    { header: "Nombre del tecnico", key: "nombreTecnico", width: 28 },
    { header: "Especialidad", key: "especialidad", width: 18 },
    {
      header: "Cantidad de servicios completados",
      key: "cantidadServiciosCompletados",
      width: 22,
    },
    { header: "Calificacion promedio", key: "calificacionPromedio", width: 20 },
  ];

  resumen.addRow([]);
  resumen.insertRow(1, ["Consolidado de servicios completados por técnico"]);
  resumen.mergeCells("A1:D1");
  resumen.getCell("A1").font = { bold: true, size: 14 };

  resumen.insertRow(2, [
    `Periodo: ${reporte.fechaInicio} a ${reporte.fechaFin}`,
  ]);
  resumen.mergeCells("A2:D2");

  resumen.insertRow(3, [
    `Especialidad: ${reporte.especialidad ?? "Todas"} | Total tecnicos: ${reporte.totalTecnicos} | Total servicios: ${reporte.totalServiciosCompletados}`,
  ]);
  resumen.mergeCells("A3:D3");

  resumen.getRow(4).font = { bold: true };
  resumen.getRow(4).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9EAF7" },
  };

  reporte.resultados.forEach((resultado) => {
    resumen.addRow({
      nombreTecnico: resultado.nombreTecnico,
      especialidad: resultado.especialidad,
      cantidadServiciosCompletados: resultado.cantidadServiciosCompletados,
      calificacionPromedio:
        resultado.calificacionPromedio === null
          ? "N/A"
          : resultado.calificacionPromedio,
    });
  });

  resumen.columns.forEach((column) => {
    column.alignment = { vertical: "middle", wrapText: true };
  });

  return workbook.xlsx.writeBuffer() as unknown as Buffer;
}
