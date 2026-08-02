const PDFDocument = require('pdfkit');

const PAGE_MARGIN_X = 25;
const PAGE_TOP = 60;
const PAGE_BOTTOM = 770;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const ROW_PAD_X = 5;
const ROW_PAD_Y = 4;

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return String(value || '');
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function amountInWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = [
    { value: 10000000, label: 'Crore' },
    { value: 100000, label: 'Lakh' },
    { value: 1000, label: 'Thousand' },
    { value: 100, label: 'Hundred' },
  ];

  function belowHundred(n) {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ''}`;
  }

  function convert(n) {
    if (n === 0) return '';
    if (n < 100) return belowHundred(n);

    for (const scale of scales) {
      if (n >= scale.value) {
        const head = Math.floor(n / scale.value);
        const tail = n % scale.value;
        return `${convert(head)} ${scale.label}${tail ? ` ${convert(tail)}` : ''}`;
      }
    }

    return '';
  }

  const rounded = Math.round(Number(value || 0));
  if (!rounded) return 'Zero INR Only';
  return `${convert(rounded)} INR Only`;
}

function setTextStyle(doc, options = {}) {
  doc.font(options.bold ? 'Helvetica-Bold' : options.italic ? 'Helvetica-Oblique' : 'Helvetica');
  doc.fontSize(options.fontSize || 8);
}

function textHeight(doc, text, width, options = {}) {
  setTextStyle(doc, options);
  return doc.heightOfString(String(text || ''), {
    width: Math.max(1, width - ROW_PAD_X * 2),
    align: options.align || 'left',
  });
}

function companyBlockHeight(doc, company, width) {
  const rest = [
    company.address,
    `GSTIN/UIN: ${company.gstNumber}`,
    `State Name : ${company.stateName}, Code : ${company.stateCode}`,
    `E-Mail : ${company.supportEmail}`,
  ].filter(Boolean).join('\n');

  return (
    textHeight(doc, company.name, width, { fontSize: 8, bold: true }) +
    (rest ? textHeight(doc, rest, width, { fontSize: 8 }) : 0) +
    ROW_PAD_Y * 2
  );
}

function rowHeight(doc, cells, minHeight = 24) {
  const height = cells.reduce((max, cell) => {
    const contentHeight = textHeight(doc, cell.text, cell.width, cell);
    return Math.max(max, contentHeight + ROW_PAD_Y * 2);
  }, minHeight);
  return Math.ceil(height);
}

function drawCell(doc, x, y, width, height, text = '', options = {}) {
  doc.rect(x, y, width, height).stroke();
  setTextStyle(doc, options);
  doc.fillColor('#000000').text(String(text || ''), x + ROW_PAD_X, y + ROW_PAD_Y, {
    width: Math.max(1, width - ROW_PAD_X * 2),
    align: options.align || 'left',
  });
}

function drawRow(doc, y, cells, minHeight = 24) {
  const height = rowHeight(doc, cells, minHeight);
  let x = PAGE_MARGIN_X;
  cells.forEach((cell) => {
    drawCell(doc, x, y, cell.width, height, cell.text, cell);
    x += cell.width;
  });
  return y + height;
}

function drawPageFrame(doc) {
  doc.lineWidth(1);
  doc.rect(PAGE_MARGIN_X, PAGE_TOP, CONTENT_WIDTH, PAGE_BOTTOM - PAGE_TOP).stroke();
  doc.font('Helvetica-Bold').fontSize(20).text('INVOICE', PAGE_MARGIN_X, 16, {
    width: CONTENT_WIDTH,
    align: 'center',
  });
  doc.moveTo(220, 42).lineTo(392, 42).stroke();
}

function ensureSpace(doc, y, neededHeight) {
  if (y + neededHeight <= PAGE_BOTTOM) return y;
  doc.addPage();
  drawPageFrame(doc);
  return PAGE_TOP;
}

function companyBlock(company) {
  return [
    company.name,
    company.address,
    `GSTIN/UIN: ${company.gstNumber}`,
    `State Name : ${company.stateName}, Code : ${company.stateCode}`,
    `E-Mail : ${company.supportEmail}`,
  ].filter(Boolean).join('\n');
}

function drawCompanyBlock(doc, x, y, width, company) {
  const rest = [
    company.address,
    `GSTIN/UIN: ${company.gstNumber}`,
    `State Name : ${company.stateName}, Code : ${company.stateCode}`,
    `E-Mail : ${company.supportEmail}`,
  ].filter(Boolean).join('\n');

  setTextStyle(doc, { fontSize: 8, bold: true });
  doc.text(company.name, x + ROW_PAD_X, y + ROW_PAD_Y, { width: width - ROW_PAD_X * 2 });

  if (rest) {
    setTextStyle(doc, { fontSize: 8 });
    doc.text(rest, x + ROW_PAD_X, doc.y, { width: width - ROW_PAD_X * 2 });
  }
}

function customerBlock(customer) {
  const stateLine = customer.stateName ? `State Name : ${customer.stateName}${customer.stateCode ? `, Code : ${customer.stateCode}` : ''}` : '';
  return [
    customer.name,
    customer.address,
    `${customer.city}${customer.postalCode && customer.postalCode !== 'N/A' ? ` ${customer.postalCode}` : ''}`,
    customer.country,
    customer.gstNumber ? `GSTIN/UIN : ${customer.gstNumber}` : '',
    stateLine,
    customer.email ? `E-Mail : ${customer.email}` : '',
    customer.phone ? `Phone : ${customer.phone}` : '',
  ].filter(Boolean).join('\n');
}

function drawTopSection(doc, y, data) {
  const leftWidth = 300;
  const rightWidth = CONTENT_WIDTH - leftWidth;
  const labelWidth = 158;
  const valueWidth = rightWidth - labelWidth;

  const sellerText = companyBlock(data.company);
  const shipText = customerBlock(data.customer);
  const billText = customerBlock(data.customer);
  const leftRows = [
    { title: '', text: sellerText, boldFirst: true },
    { title: 'Consignee (Ship to)', text: shipText },
    { title: 'Buyer (Bill to)', text: billText },
  ];

  const infoRows = [
    ['Voucher No.', data.invoiceNumber],
    ['Dated', formatDate(data.generatedAt)],
    ["Buyer's Ref./Order No.", data.orderId],
    ['Dispatched through', data.dispatchedThrough || ''],
    ['Other References', data.otherReferences || ''],
    ['Destination', [data.customer.city, data.customer.country].filter(Boolean).join(', ')],
    ['Terms of Delivery', data.termsOfDelivery || ''],
  ];

  const leftHeights = leftRows.map((row) => {
    const titleH = row.title ? textHeight(doc, row.title, leftWidth, { fontSize: 8 }) + 7 : 0;
    const bodyH = row.boldFirst
      ? companyBlockHeight(doc, data.company, leftWidth)
      : textHeight(doc, row.text, leftWidth, { fontSize: 8 });
    return Math.max(38, Math.ceil(titleH + bodyH + ROW_PAD_Y * 2));
  });

  const rightHeights = infoRows.map(([label, value]) =>
    rowHeight(doc, [
      { width: labelWidth, text: label, fontSize: 8 },
      { width: valueWidth, text: value, fontSize: 8 },
    ], 53)
  );

  const topHeight = Math.max(
    leftHeights.reduce((sum, height) => sum + height, 0),
    rightHeights.reduce((sum, height) => sum + height, 0)
  );

  let leftY = y;
  leftRows.forEach((row, index) => {
    const isLast = index === leftRows.length - 1;
    const height = isLast ? y + topHeight - leftY : leftHeights[index];
    doc.rect(PAGE_MARGIN_X, leftY, leftWidth, height).stroke();
    let textY = leftY + ROW_PAD_Y;
    if (row.title) {
      setTextStyle(doc, { fontSize: 8 });
      doc.text(row.title, PAGE_MARGIN_X + ROW_PAD_X, textY, { width: leftWidth - ROW_PAD_X * 2 });
      textY = doc.y + 5;
      doc.moveTo(PAGE_MARGIN_X, textY - 2).lineTo(PAGE_MARGIN_X + leftWidth, textY - 2).stroke();
    }
    if (row.boldFirst) {
      drawCompanyBlock(doc, PAGE_MARGIN_X, leftY, leftWidth, data.company);
    } else {
      setTextStyle(doc, { fontSize: 8 });
      doc.text(row.text, PAGE_MARGIN_X + ROW_PAD_X, textY, { width: leftWidth - ROW_PAD_X * 2 });
    }
    leftY += height;
  });

  let rightY = y;
  infoRows.forEach(([label, value], index) => {
    const isLast = index === infoRows.length - 1;
    const height = isLast ? y + topHeight - rightY : rightHeights[index];
    drawCell(doc, PAGE_MARGIN_X + leftWidth, rightY, labelWidth, height, label, { fontSize: 8 });
    drawCell(doc, PAGE_MARGIN_X + leftWidth + labelWidth, rightY, valueWidth, height, value, { fontSize: 8 });
    rightY += height;
  });

  return y + topHeight;
}

function drawItemsHeader(doc, y, columns) {
  return drawRow(doc, y, [
    { width: columns[0], text: 'Sl No.', align: 'center', bold: true, fontSize: 7 },
    { width: columns[1], text: 'Item Name / Goods and Services', align: 'center', bold: true, fontSize: 7 },
    { width: columns[2], text: 'HSN/SAC', align: 'center', bold: true, fontSize: 7 },
    { width: columns[3], text: 'Quantity', align: 'center', bold: true, fontSize: 7 },
    { width: columns[4], text: 'Rate', align: 'center', bold: true, fontSize: 7 },
    { width: columns[5], text: 'Per', align: 'center', bold: true, fontSize: 7 },
    { width: columns[6], text: 'Amount', align: 'center', bold: true, fontSize: 7 },
  ], 30);
}

function drawItemsTable(doc, y, data) {
  const columns = [35, 220, 65, 70, 60, 40, 55];
  y = drawItemsHeader(doc, y, columns);

  const itemRows = data.items.map((item, index) => ([
    { width: columns[0], text: String(index + 1), align: 'center', fontSize: 8 },
    { width: columns[1], text: item.name, fontSize: 8 },
    { width: columns[2], text: item.hsnSac || '32089090', align: 'center', fontSize: 8 },
    { width: columns[3], text: `${item.quantity} Nos.`, align: 'center', fontSize: 8 },
    { width: columns[4], text: formatAmount(item.unitPrice), align: 'right', fontSize: 8 },
    { width: columns[5], text: item.per || 'Nos.', align: 'center', fontSize: 8 },
    { width: columns[6], text: formatAmount(item.total), align: 'right', fontSize: 8 },
  ]));

  const tax = Number(data.tax || 0);
  const cgst = Number((tax / 2).toFixed(2));
  const sgst = Number((tax - cgst).toFixed(2));
  const totalQty = data.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const summaryRows = [
    [
      { width: columns[0], text: '', fontSize: 8 },
      { width: columns[1], text: 'Freight & Cartage', italic: true, fontSize: 8 },
      { width: columns[2], text: '', fontSize: 8 },
      { width: columns[3], text: '', fontSize: 8 },
      { width: columns[4], text: '', fontSize: 8 },
      { width: columns[5], text: '', fontSize: 8 },
      { width: columns[6], text: formatAmount(data.shipping), align: 'right', italic: true, fontSize: 8 },
    ],
    [
      { width: columns[0], text: '', fontSize: 8 },
      { width: columns[1], text: 'CGST (9%)', italic: true, fontSize: 8 },
      { width: columns[2], text: '', fontSize: 8 },
      { width: columns[3], text: '', fontSize: 8 },
      { width: columns[4], text: '', fontSize: 8 },
      { width: columns[5], text: '', fontSize: 8 },
      { width: columns[6], text: formatAmount(cgst), align: 'right', italic: true, fontSize: 8 },
    ],
    [
      { width: columns[0], text: '', fontSize: 8 },
      { width: columns[1], text: 'SGST (9%)', italic: true, fontSize: 8 },
      { width: columns[2], text: '', fontSize: 8 },
      { width: columns[3], text: '', fontSize: 8 },
      { width: columns[4], text: '', fontSize: 8 },
      { width: columns[5], text: '', fontSize: 8 },
      { width: columns[6], text: formatAmount(sgst), align: 'right', italic: true, fontSize: 8 },
    ],
    [
      { width: columns[0], text: '', fontSize: 8, bold: true },
      { width: columns[1], text: 'Total', bold: true, fontSize: 8 },
      { width: columns[2], text: '', fontSize: 8, bold: true },
      { width: columns[3], text: `${totalQty} Nos.`, align: 'center', bold: true, fontSize: 8 },
      { width: columns[4], text: '', fontSize: 8, bold: true },
      { width: columns[5], text: '', fontSize: 8, bold: true },
      { width: columns[6], text: formatAmount(data.total), align: 'right', bold: true, fontSize: 8 },
    ],
  ];

  for (const row of itemRows) {
    y = ensureSpace(doc, y, rowHeight(doc, row, 24) + 150);
    if (y === PAGE_TOP) y = drawItemsHeader(doc, y, columns);
    y = drawRow(doc, y, row, 24);
  }

  for (const row of summaryRows) {
    y = ensureSpace(doc, y, rowHeight(doc, row, 24) + 110);
    if (y === PAGE_TOP) y = drawItemsHeader(doc, y, columns);
    y = drawRow(doc, y, row, 24);
  }

  return y;
}

function drawBottomSection(doc, y, data) {
  y = ensureSpace(doc, y, 165);
  const leftWidth = 335;
  const rightWidth = CONTENT_WIDTH - leftWidth;
  const firstRowHeight = Math.max(
    44,
    rowHeight(doc, [
      { width: leftWidth, text: `Amount Chargeable (in words)\n${amountInWords(data.total)}`, fontSize: 8, bold: true },
      { width: rightWidth, text: "Company's Bank Details", fontSize: 8 },
    ])
  );

  drawCell(doc, PAGE_MARGIN_X, y, leftWidth, firstRowHeight, `Amount Chargeable (in words)\n${amountInWords(data.total)}`, { fontSize: 8, bold: true });
  drawCell(doc, PAGE_MARGIN_X + leftWidth, y, rightWidth, firstRowHeight, "Company's Bank Details", { fontSize: 8 });
  y += firstRowHeight;

  const bottomHeight = Math.max(
    145,
    rowHeight(doc, [
      { width: leftWidth, text: `Declaration\n${data.company.declaration}`, fontSize: 8 },
      {
        width: rightWidth,
        text: `Bank Name                 : ${data.company.bank.name}\nA/c No.                   : ${data.company.bank.accountNumber}\nBranch & IFSC             : ${data.company.bank.branchIfsc}\n\n\nfor ${data.company.name}\n\n${data.company.signatureLabel}`,
        fontSize: 8,
      },
    ], 145)
  );

  drawCell(doc, PAGE_MARGIN_X, y, leftWidth, bottomHeight, `Declaration\n${data.company.declaration}`, { fontSize: 8 });
  drawCell(doc, PAGE_MARGIN_X + leftWidth, y, rightWidth, bottomHeight, '', { fontSize: 8 });
  setTextStyle(doc, { fontSize: 8 });
  doc.text(
    `Bank Name                 : ${data.company.bank.name}\nA/c No.                   : ${data.company.bank.accountNumber}\nBranch & IFSC             : ${data.company.bank.branchIfsc}`,
    PAGE_MARGIN_X + leftWidth + ROW_PAD_X,
    y + ROW_PAD_Y,
    { width: rightWidth - ROW_PAD_X * 2 }
  );

  setTextStyle(doc, { fontSize: 8, bold: true });
  doc.text(`for ${data.company.name}`, PAGE_MARGIN_X + leftWidth, y + bottomHeight - 54, {
    width: rightWidth - ROW_PAD_X,
    align: 'right',
  });
  setTextStyle(doc, { fontSize: 8 });
  doc.text(data.company.signatureLabel, PAGE_MARGIN_X + leftWidth, y + bottomHeight - 24, {
    width: rightWidth - ROW_PAD_X,
    align: 'right',
  });
  y += bottomHeight;

  const footerHeight = 20;
  drawCell(doc, PAGE_MARGIN_X, y, CONTENT_WIDTH, footerHeight, 'This is a Computer Generated Document', { fontSize: 8, align: 'center' });
}

function generateInvoicePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      margin: 0,
      size: 'A4',
      info: {
        Title: `Invoice ${data.invoiceNumber}`,
        Author: data.company?.name || 'VANCA INTERIO',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawPageFrame(doc);
    let y = PAGE_TOP;
    y = drawTopSection(doc, y, data);
    y = drawItemsTable(doc, y, data);
    drawBottomSection(doc, y, data);

    doc.end();
  });
}

module.exports = { generateInvoicePdfBuffer };
