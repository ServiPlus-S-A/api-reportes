import PDFDocument from "pdfkit";
import { Workbook } from "exceljs";
import { AtencionDto } from "../dto/atencion-response.dto";

export async function generarPDF(atenciones: AtencionDto[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        userPassword: "",
        ownerPassword: "owner",
        permissions: {
          printing: "highResolution",
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (err) => {
        reject(err);
      });

      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Reporte de Atenciones Asociadas", { align: "center" })
        .fontSize(10)
        .moveDown(1);

      doc.fontSize(10).font("Helvetica");

      atenciones.forEach((atencion, index) => {
        if (index > 0 && index % 20 === 0) {
          doc.addPage();
        }

        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`Atención #${index + 1}`, { underline: true });

        doc.fontSize(10).font("Helvetica");

        doc
          .text(`ID: ${atencion.id}`, { indent: 10 })
          .text(
            `Descripción: ${atencion.descripcion.substring(0, 150)}`,
            { indent: 10 },
          )
          .text(`Lugar: ${atencion.lugar}`, { indent: 10 })
          .text(`Fecha/Hora: ${atencion.fecha}`, { indent: 10 })
          .text(`Consultor: ${atencion.nombreConsultor}`, { indent: 10 });

        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generarExcel(
  atenciones: AtencionDto[],
): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Atenciones");

  worksheet.columns = [
    { header: "ID", key: "id", width: 12 },
    { header: "Descripción", key: "descripcion", width: 40 },
    { header: "Lugar", key: "lugar", width: 25 },
    { header: "Fecha/Hora", key: "fecha", width: 18 },
    { header: "Consultor", key: "nombreConsultor", width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };

  atenciones.forEach((atencion) => {
    worksheet.addRow({
      id: atencion.id,
      descripcion: atencion.descripcion.substring(0, 150),
      lugar: atencion.lugar,
      fecha: atencion.fecha,
      nombreConsultor: atencion.nombreConsultor,
    });
  });

  worksheet.columns.forEach((column) => {
    column.alignment = { vertical: "middle", wrapText: true };
  });

  return workbook.xlsx.writeBuffer() as unknown as Buffer;
}
