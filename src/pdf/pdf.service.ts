import { Injectable } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable()
export class PdfService {
  private fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  

  private getPrinter() {
    const PdfPrinter = eval('require("pdfmake/js/Printer")').default;
    return new PdfPrinter(this.fonts);
  }

  async generarOrdenCompraPdf(orden: any): Promise<Buffer> {
    const printer = await this.getPrinter();
    
    const proveedor = orden.proveedor || {}; 
    const detallesBody = orden.detalles?.map((det: any) => [
      det.id.toString(), 
      det.cantidad.toString(),
      `$${det.precioUnitario}`,
      `$${(det.cantidad * det.precioUnitario).toFixed(2)}`,
    ]) || [];

    
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'ORDEN DE COMPRA', style: 'header', alignment: 'center' },
        { text: `Lugar y Fecha de Emisión: Quito, Ecuador - ${new Date(orden.fechaEmision).toLocaleDateString()}`, margin: [0, 10, 0, 10] },
        { text: `Código de Orden: ${orden.codigo || 'S/N'}`, bold: true },
        { text: `Estado: ${orden.estado}`, margin: [0, 0, 0, 15] },
        
        { text: 'Datos del Proveedor', style: 'subheader' },
        {
          layout: 'lightHorizontalLines',
          table: {
            widths: ['auto', '*'],
            body: [
              ['Razón Social:', proveedor.razon_social || 'N/A'],
              ['RUC:', proveedor.ruc || 'N/A'],
              ['Email:', proveedor.email || 'N/A'],
              ['Dirección:', proveedor.direccion || 'N/A'],
            ],
          },
          margin: [0, 0, 0, 15]
        },

        { text: 'Detalle de Materiales', style: 'subheader' },
        {
          layout: 'lightHorizontalLines',
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [{ text: 'Ítem', bold: true }, { text: 'Cantidad', bold: true }, { text: 'Precio U.', bold: true }, { text: 'Total', bold: true }],
              ...detallesBody
            ]
          },
          margin: [0, 0, 0, 20]
        },

        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                body: [
                  ['Subtotal:', `$${orden.subtotal || 0}`],
                  ['Impuestos:', `$${orden.impuestos || 0}`],
                  [{ text: 'TOTAL:', bold: true }, { text: `$${orden.total || 0}`, bold: true }]
                ]
              },
              layout: 'noBorders'
            }
          ]
        }
      ],
      styles: {
        header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      }
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (error: any) => reject(error));
        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generarTicketMovimientoPdf(movimiento: any): Promise<Buffer> {
    const printer = await this.getPrinter();

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'TICKET DE DESPACHO / TRANSFERENCIA', style: 'header', alignment: 'center' },
        { text: `Fecha: ${new Date(movimiento.fecha).toLocaleString()}`, margin: [0, 10, 0, 10] },
        { text: `Tipo: ${movimiento.tipo}`, bold: true },
        { text: `Bodega Origen: ${movimiento.bodegaOrigen?.nombre || 'N/A'}` },
        { text: `Bodega Destino / Obra: ${movimiento.bodegaDestino?.nombre || 'N/A'}`, margin: [0, 0, 0, 20] },

        { text: 'Firmas de Responsabilidad', style: 'subheader', margin: [0, 50, 0, 30], alignment: 'center' },
        {
          columns: [
            { text: '_________________________\nEntregué Conforme', alignment: 'center' },
            { text: '_________________________\nRecibí Conforme', alignment: 'center' }
          ]
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true },
        subheader: { fontSize: 14, bold: true },
      }
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (error: any) => reject(error));
        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}