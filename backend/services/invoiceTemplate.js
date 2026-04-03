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
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${data.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 32px;
            background: #f7f4ec;
          }
          .invoice {
            background: #ffffff;
            border-radius: 18px;
            padding: 36px;
            box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
          }
          .header, .meta, .summary, .footer {
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }
          .header {
            padding-bottom: 24px;
            border-bottom: 2px solid #e5dcc9;
          }
          .brand {
            max-width: 60%;
          }
          .brand img {
            max-height: 64px;
            margin-bottom: 12px;
          }
          .pill {
            display: inline-block;
            background: #1f2937;
            color: white;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .meta, .summary {
            margin-top: 28px;
          }
          .panel {
            flex: 1;
            background: #faf7f0;
            border: 1px solid #ede4d4;
            border-radius: 14px;
            padding: 18px;
          }
          h1, h2, h3, p {
            margin: 0;
          }
          h1 {
            font-size: 32px;
            margin-bottom: 10px;
          }
          h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #8a6f42;
            margin-bottom: 10px;
          }
          p {
            line-height: 1.6;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 28px;
            font-size: 14px;
          }
          thead {
            background: #1f2937;
            color: white;
          }
          th, td {
            padding: 14px 12px;
            text-align: left;
            border-bottom: 1px solid #eee6d8;
          }
          .summary .totals {
            max-width: 320px;
            margin-left: auto;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e8dfd0;
          }
          .totals-row.total {
            font-size: 18px;
            font-weight: bold;
            color: #111827;
            border-bottom: 0;
          }
          .footer {
            margin-top: 36px;
            align-items: flex-end;
          }
          .signature {
            min-width: 240px;
            text-align: right;
          }
          .signature-box {
            border-top: 1px dashed #8a6f42;
            margin-top: 36px;
            padding-top: 10px;
            color: #8a6f42;
          }
          .small {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="brand">
              ${data.company.logoUrl ? `<img src="${data.company.logoUrl}" alt="${data.company.name}" />` : ''}
              <div class="pill">Tax Invoice</div>
              <h1>${data.company.name}</h1>
              <p>${data.company.address}</p>
              <p>GSTIN: ${data.company.gstNumber}</p>
            </div>
            <div>
              <h3>Invoice Details</h3>
              <p><strong>Invoice No:</strong> ${data.invoiceNumber}</p>
              <p><strong>Order ID:</strong> ${data.orderId}</p>
              <p><strong>Date:</strong> ${data.generatedAt}</p>
              <p><strong>Payment:</strong> ${data.paymentMethod}</p>
              <p><strong>Status:</strong> ${data.paymentStatus}</p>
            </div>
          </div>

          <div class="meta">
            <div class="panel">
              <h3>Bill To</h3>
              <p><strong>${data.customer.name}</strong></p>
              <p>${data.customer.address}</p>
              <p>${data.customer.city}, ${data.customer.postalCode}</p>
              <p>${data.customer.country}</p>
              <p>${data.customer.email}</p>
            </div>
            <div class="panel">
              <h3>Order Summary</h3>
              <p><strong>Subtotal:</strong> ${formatCurrency(data.subtotal)}</p>
              <p><strong>GST:</strong> ${formatCurrency(data.tax)}</p>
              <p><strong>Shipping:</strong> ${formatCurrency(data.shipping)}</p>
              <p><strong>Total:</strong> ${formatCurrency(data.total)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="summary">
            <div class="panel">
              <h3>Notes</h3>
              <p>Thank you for shopping with ${data.company.name}. This is a system-generated invoice and serves as proof of purchase.</p>
              <p class="small">For support, contact ${data.company.supportEmail}.</p>
            </div>
            <div class="panel totals">
              <div class="totals-row"><span>Subtotal</span><strong>${formatCurrency(data.subtotal)}</strong></div>
              <div class="totals-row"><span>GST</span><strong>${formatCurrency(data.tax)}</strong></div>
              <div class="totals-row"><span>Shipping</span><strong>${formatCurrency(data.shipping)}</strong></div>
              <div class="totals-row total"><span>Total</span><span>${formatCurrency(data.total)}</span></div>
            </div>
          </div>

          <div class="footer">
            <div>
              <p class="small">Invoice generated automatically for paid and delivered orders only.</p>
            </div>
            <div class="signature">
              <p class="small">Authorized Signatory</p>
              <div class="signature-box">${data.company.signatureLabel}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = { renderInvoiceTemplate };
