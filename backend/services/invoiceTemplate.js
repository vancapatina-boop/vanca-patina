function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function renderInvoiceTemplate(data) {
  const itemsHtml = data.items
    .map(
      (item, index) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.name}</td>
          <td style="text-align: center;">HSN/SAC</td>
          <td style="text-align: center;">${item.quantity} PCS</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: right;">PCS</td>
          <td style="text-align: right;">${formatCurrency(item.total)}</td>
        </tr>
      `
    )
    .join('');

  // Calculate GST (9% CGST + 9% SGST = 18% total)
  const gstRate = 0.09;
  const cgstAmount = data.subtotal * gstRate;
  const sgstAmount = data.subtotal * gstRate;
  const totalTax = cgstAmount + sgstAmount;

  const invoiceDate = new Date(data.generatedAt);
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Tax Invoice - ${data.invoiceNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            color: #000;
            font-size: 11px;
            line-height: 1.2;
            background: #fff;
            padding: 20px;
          }
          
          .invoice-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border: 2px solid #000;
          }
          
          .header-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            text-decoration: underline;
          }
          
          .header-section {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          
          .header-left, .header-right {
            display: table-cell;
            vertical-align: top;
            width: 50%;
          }
          
          .header-right {
            text-align: right;
          }
          
          .company-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .company-details {
            font-size: 10px;
            line-height: 1.4;
            margin-bottom: 5px;
          }
          
          .gst-row {
            font-weight: bold;
            font-size: 10px;
          }
          
          .state-row {
            font-size: 10px;
          }
          
          .invoice-details {
            display: table;
            width: 100%;
            margin-bottom: 20px;
          }
          
          .invoice-details-row {
            display: table-row;
          }
          
          .invoice-details-label {
            display: table-cell;
            width: 40%;
            font-weight: bold;
            padding: 5px;
          }
          
          .invoice-details-value {
            display: table-cell;
            width: 60%;
            padding: 5px;
          }
          
          .consignee-section, .buyer-section {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            border: 1px solid #000;
          }
          
          .section-header {
            font-weight: bold;
            padding: 8px;
            background: #f5f5f5;
            border-bottom: 1px solid #000;
          }
          
          .section-content {
            padding: 8px;
            font-size: 10px;
            line-height: 1.3;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 1px solid #000;
          }
          
          thead {
            background: #f0f0f0;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 10px;
          }
          
          th {
            font-weight: bold;
            text-align: center;
          }
          
          .Sl-No { width: 5%; }
          .Description { width: 30%; }
          .HSN { width: 10%; }
          .Quantity { width: 15%; }
          .Rate { width: 12%; }
          .Per { width: 8%; }
          .Amount { width: 15%; }
          
          td.center {
            text-align: center;
          }
          
          td.right {
            text-align: right;
          }
          
          .totals-section {
            display: table;
            width: 100%;
            margin-top: 10px;
            border: 1px solid #000;
          }
          
          .totals-row {
            display: table-row;
          }
          
          .totals-label {
            display: table-cell;
            border: 1px solid #000;
            padding: 8px;
            font-weight: bold;
            width: 50%;
          }
          
          .totals-value {
            display: table-cell;
            border: 1px solid #000;
            padding: 8px;
            text-align: right;
            width: 50%;
            font-weight: bold;
          }
          
          .tax-summary {
            display: table;
            width: 100%;
            margin: 15px 0;
            border: 1px solid #000;
          }
          
          .tax-row {
            display: table-row;
          }
          
          .tax-cell {
            display: table-cell;
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-weight: bold;
          }
          
          .tax-cell-label {
            font-weight: bold;
            text-align: left;
          }
          
          .declaration {
            margin-top: 20px;
            font-size: 10px;
            line-height: 1.4;
            border-top: 1px solid #000;
            padding-top: 15px;
          }
          
          .declaration-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .signature-section {
            display: table;
            width: 100%;
            margin-top: 20px;
          }
          
          .signature-item {
            display: table-cell;
            width: 50%;
            text-align: right;
            padding-top: 40px;
            vertical-align: bottom;
          }
          
          .signature-line {
            border-top: 1px dashed #000;
            margin-top: 5px;
            padding-top: 5px;
            font-weight: bold;
          }
          
          .footer-text {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
            font-style: italic;
          }
          
          .amount-in-words {
            font-weight: bold;
            padding: 10px;
            background: #f9f9f9;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header-title">Tax Invoice</div>
          
          <div class="header-section">
            <div class="header-left">
              <div class="company-name">VANCA PATINA</div>
              <div class="company-details">
                HOUSE NO PVT-5 PLOT NO-26 GROUND FLOOR, WHS TIMBER<br>
                MARKET BLK A-1, KIRTI NAGAR
              </div>
              <div class="gst-row">GSTIN/UIN: ${data.company.gstNumber}</div>
              <div class="state-row">State Name : Delhi, Code : 07</div>
              <div class="company-details" style="margin-top: 5px;">E-Mail : support@vancapatina.com</div>
            </div>
            <div class="header-right">
              <div class="invoice-details">
                <div class="invoice-details-row">
                  <div class="invoice-details-label">Invoice No.</div>
                  <div class="invoice-details-value">${data.invoiceNumber}</div>
                </div>
                <div class="invoice-details-row">
                  <div class="invoice-details-label">Dated</div>
                  <div class="invoice-details-value">${formattedDate}</div>
                </div>
                <div class="invoice-details-row">
                  <div class="invoice-details-label">Delivery Note</div>
                  <div class="invoice-details-value">-</div>
                </div>
                <div class="invoice-details-row">
                  <div class="invoice-details-label">Mode/Terms of Payment</div>
                  <div class="invoice-details-value">${data.paymentMethod}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="consignee-section">
            <div class="section-header">Consignee (Ship to)</div>
            <div class="section-content">
              <strong>${data.customer.name}</strong><br>
              ${data.customer.address}<br>
              ${data.customer.city}, ${data.customer.postalCode}<br>
              ${data.customer.country}<br>
              <strong>GSTIN/UIN : 07AABCJ0076B1Z4</strong><br>
              State Name : Delhi, Code : 07
            </div>
          </div>
          
          <div class="buyer-section">
            <div class="section-header">Buyer (Bill to)</div>
            <div class="section-content">
              <strong>${data.customer.name}</strong><br>
              ${data.customer.address}<br>
              ${data.customer.city}, ${data.customer.postalCode}<br>
              ${data.customer.country}<br>
              <strong>GSTIN/UIN : 07AABCJ0076B1Z4</strong><br>
              State Name : Delhi, Code : 07
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="Sl-No">Sl No.</th>
                <th class="Description">Description of Goods</th>
                <th class="HSN">HSN/SAC</th>
                <th class="Quantity">Quantity</th>
                <th class="Rate">Rate per</th>
                <th class="Per">per</th>
                <th class="Amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="totals-row">
              <div class="totals-label">Subtotal</div>
              <div class="totals-value">${formatCurrency(data.subtotal)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label">CGST @9%</div>
              <div class="totals-value">${formatCurrency(cgstAmount)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label">SGST @9%</div>
              <div class="totals-value">${formatCurrency(sgstAmount)}</div>
            </div>
            <div class="totals-row">
              <div class="totals-label" style="font-size: 13px;">TOTAL</div>
              <div class="totals-value" style="font-size: 13px;">${formatCurrency(data.subtotal + totalTax)}</div>
            </div>
          </div>
          
          <div class="amount-in-words">
            Amount Chargeable (in words): ${convertNumberToWords(data.subtotal + totalTax)} Only
          </div>
          
          <div class="tax-summary">
            <div class="tax-row">
              <div class="tax-cell tax-cell-label">HSN/SAC</div>
              <div class="tax-cell">Taxable Value</div>
              <div class="tax-cell">CGST Rate</div>
              <div class="tax-cell">CGST Amount</div>
              <div class="tax-cell">SGST Rate</div>
              <div class="tax-cell">SGST Amount</div>
              <div class="tax-cell">Total Tax Amount</div>
            </div>
            <div class="tax-row">
              <div class="tax-cell tax-cell-label">Various</div>
              <div class="tax-cell">${formatCurrency(data.subtotal)}</div>
              <div class="tax-cell">9%</div>
              <div class="tax-cell">${formatCurrency(cgstAmount)}</div>
              <div class="tax-cell">9%</div>
              <div class="tax-cell">${formatCurrency(sgstAmount)}</div>
              <div class="tax-cell">${formatCurrency(totalTax)}</div>
            </div>
          </div>
          
          <div class="declaration">
            <div class="declaration-title">Declaration</div>
            <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-item">
              <div class="signature-line">For VANCA PATINA</div>
            </div>
            <div class="signature-item">
              <div class="signature-line">Authorised Signatory</div>
            </div>
          </div>
          
          <div class="footer-text">
            This is a Computer Generated Invoice
          </div>
        </div>
      </body>
    </html>
  `;
}

function convertNumberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    return '';
  }

  if (num === 0) return 'Zero';
  
  let numStr = num.toString();
  let parts = [];
  let scaleIndex = 0;

  // Handle decimal part
  if (numStr.includes('.')) {
    const [intPart, decPart] = numStr.split('.');
    numStr = intPart;
    parts.push(convert(parseInt(decPart.substring(0, 2))) + ' Paise');
  }

  // Convert integer part in Indian numbering system
  let remaining = parseInt(numStr);
  while (remaining > 0 && scaleIndex < scales.length) {
    let divisor;
    if (scaleIndex === 0) divisor = 1000;
    else if (scaleIndex === 1) divisor = 100; // Lakh
    else if (scaleIndex === 2) divisor = 100; // Crore
    else divisor = 1000;

    let chunk = remaining % divisor;
    remaining = Math.floor(remaining / divisor);

    if (chunk > 0) {
      let chunkWords = convert(chunk);
      if (scales[scaleIndex]) {
        chunkWords += ' ' + scales[scaleIndex];
      }
      parts.unshift(chunkWords);
    }

    scaleIndex++;
  }

  return parts.join(' and ').trim() + ' Only';
}

module.exports = { renderInvoiceTemplate };
