/**
 * Tax invoice PDF via PDFKit — no Chrome/Puppeteer (works on any Node server).
 */
const PDFDocument = require('pdfkit');

function formatMoney(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * @param {object} data - same shape as invoiceService.buildInvoicePayload output
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      margin: 44,
      size: 'A4',
      info: {
        Title: `Tax Invoice ${data.invoiceNumber}`,
        Author: data.company?.name || 'Vanca Patina',
      },
    });

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { company, customer, items, invoiceNumber, orderId, generatedAt } = data;
    const x = 44;
    const contentW = doc.page.width - 88;

    doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', x, 44, {
      width: contentW,
      align: 'center',
    });

    let y = doc.y + 14;
    doc.fontSize(9).font('Helvetica-Bold').text(company.name, x, y, { width: contentW * 0.52 });
    doc.font('Helvetica').fontSize(8);
    y = doc.y;
    doc.text(company.address, x, y, { width: contentW * 0.52 });
    doc.text(`GSTIN: ${company.gstNumber}`, x, doc.y, { width: contentW * 0.52 });
    doc.text(`Support: ${company.supportEmail}`, x, doc.y, { width: contentW * 0.52 });

    const col2 = x + contentW * 0.5;
    let y2 = 78;
    doc.font('Helvetica-Bold').fontSize(8).text('Invoice No.', col2, y2, { width: contentW * 0.48, align: 'right' });
    y2 = doc.y;
    doc.font('Helvetica').text(String(invoiceNumber), col2, y2, { width: contentW * 0.48, align: 'right' });
    y2 = doc.y + 2;
    doc.font('Helvetica-Bold').text('Order ID', col2, y2, { width: contentW * 0.48, align: 'right' });
    y2 = doc.y;
    doc.font('Helvetica').text(String(orderId), col2, y2, { width: contentW * 0.48, align: 'right' });
    y2 = doc.y + 2;
    doc.font('Helvetica-Bold').text('Date', col2, y2, { width: contentW * 0.48, align: 'right' });
    y2 = doc.y;
    doc.font('Helvetica').text(String(generatedAt), col2, y2, { width: contentW * 0.48, align: 'right' });

    y = Math.max(doc.y, y2 + doc.currentLineHeight()) + 16;
    doc.moveTo(x, y).lineTo(x + contentW, y).stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(9).text('Bill to', x, y);
    y = doc.y + 4;
    doc.font('Helvetica').fontSize(8);
    doc.text(customer.name, x, y, { width: contentW });
    if (customer.email) doc.text(customer.email, x, doc.y, { width: contentW });
    doc.text(customer.address, x, doc.y, { width: contentW });
    doc.text(`${customer.city} — ${customer.postalCode}`, x, doc.y, { width: contentW });
    doc.text(customer.country, x, doc.y, { width: contentW });
    y = doc.y + 12;

    doc.moveTo(x, y).lineTo(x + contentW, y).stroke();
    y += 10;

    const colDesc = x + 22;
    const colQty = x + contentW * 0.52;
    const colRate = x + contentW * 0.66;
    const colAmt = x + contentW * 0.78;

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('#', x, y, { width: 18 });
    doc.text('Description', colDesc, y, { width: colQty - colDesc - 6 });
    doc.text('Qty', colQty, y, { width: colRate - colQty - 4, align: 'right' });
    doc.text('Rate', colRate, y, { width: colAmt - colRate - 4, align: 'right' });
    doc.text('Amount', colAmt, y, { width: x + contentW - colAmt, align: 'right' });
    y = doc.y + 4;
    doc.moveTo(x, y).lineTo(x + contentW, y).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(8);
    items.forEach((item, i) => {
      if (y > doc.page.height - 140) {
        doc.addPage();
        y = 44;
      }
      const nameW = colQty - colDesc - 6;
      const nameH = doc.heightOfString(String(item.name), { width: nameW });
      const rowH = Math.max(nameH, 12) + 6;
      doc.text(String(i + 1), x, y, { width: 18 });
      doc.text(String(item.name), colDesc, y, { width: nameW });
      doc.text(String(item.quantity), colQty, y, { width: colRate - colQty - 4, align: 'right' });
      doc.text(formatMoney(item.unitPrice), colRate, y, { width: colAmt - colRate - 4, align: 'right' });
      doc.text(formatMoney(item.total), colAmt, y, { width: x + contentW - colAmt, align: 'right' });
      y += rowH;
    });

    y += 6;
    doc.moveTo(x, y).lineTo(x + contentW, y).stroke();
    y += 10;

    const tw = contentW * 0.45;
    const tx = x + contentW - tw;
    doc.font('Helvetica').fontSize(9);
    doc.text(`Subtotal (items)  ${formatMoney(data.subtotal)}`, tx, y, { width: tw, align: 'right' });
    y = doc.y + 6;
    doc.text(`Tax  ${formatMoney(data.tax)}`, tx, y, { width: tw, align: 'right' });
    y = doc.y + 6;
    doc.text(`Shipping  ${formatMoney(data.shipping)}`, tx, y, { width: tw, align: 'right' });
    y = doc.y + 10;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Grand total  ${formatMoney(data.total)}`, tx, y, { width: tw, align: 'right' });
    y = doc.y + 16;

    doc.font('Helvetica').fontSize(7).fillColor('#444444');
    doc.text(
      `Payment: ${data.paymentMethod || 'N/A'} | Status: ${data.paymentStatus || 'N/A'}`,
      x,
      y,
      { width: contentW }
    );
    y = doc.y + 8;
    doc.text(
      'Computer-generated tax invoice. For support, use the email listed above.',
      x,
      y,
      { width: contentW }
    );
    doc.fillColor('#000000');

    doc.end();
  });
}

module.exports = { generateInvoicePdfBuffer };
