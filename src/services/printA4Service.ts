import { InventoryCheck, InventoryTransaction, MedicineBatch, StockInOutBalanceRow, MedicineDisposal, ClinicVisit, DisposalCouncilMember, SanitaryNapkinProduct, SanitaryNapkinDispatch, SanitaryNapkinImport } from '../types';
import { formatDateVN, formatVND, formatTime24H, formatDateTimeVN } from '../utils/helpers';
import { isMedicalSupplyItem } from './db';
import { templateConfigService } from './templateConfigService';

interface PrintHeaderConfig {
  schoolName?: string;
  department?: string;
  title: string;
  subtitle?: string;
  code?: string;
}

export function openPrintWindow(htmlContent: string, landscape = false, title = 'In Mẫu Sổ A4 - Trường THCS Đông Thạnh') {
  const orientation = landscape ? 'landscape' : 'portrait';

  const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>In Mẫu Sổ A4 - Trường THCS Đông Thạnh</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Times New Roman", Times, serif, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 10px;
    }
    .print-actions {
      text-align: center;
      margin-bottom: 20px;
      padding: 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .print-actions button {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      margin: 0 6px;
    }
    .print-actions button.close {
      background: #64748b;
    }
    @media print {
      .print-actions {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .header-table td {
      vertical-align: top;
      border: none;
      padding: 2px 0;
    }
    .header-left {
      text-align: center;
      width: 45%;
    }
    .header-right {
      text-align: center;
      width: 55%;
    }
    .unit-name {
      font-size: 10.5pt;
      text-transform: uppercase;
      font-weight: bold;
    }
    .school-name {
      font-size: 11pt;
      text-transform: uppercase;
      font-weight: bold;
      color: #000;
    }
    .divider-line {
      width: 120px;
      height: 1px;
      background: #000;
      margin: 4px auto 0 auto;
    }
    .national-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .national-motto {
      font-size: 11pt;
      font-weight: bold;
      font-style: italic;
    }
    .doc-title {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 15px 0 4px 0;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 11pt;
      font-style: italic;
      margin-bottom: 12px;
    }
    .meta-box {
      margin-bottom: 12px;
      font-size: 11pt;
    }
    .meta-box p {
      margin: 4px 0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10pt;
    }
    table.data-table th,
    table.data-table td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: middle;
    }
    table.data-table th {
      background-color: #e2e8f0;
      font-weight: bold;
      text-align: center;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      border: none;
      vertical-align: top;
      text-align: center;
      width: 33.33%;
      padding: 4px;
    }
    .signature-title {
      font-weight: bold;
      font-size: 10.5pt;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .signature-sub {
      font-style: italic;
      font-size: 9.5pt;
      color: #333;
    }
    .signature-space {
      height: 70px;
    }
    .signature-name {
      font-weight: bold;
      font-size: 10.5pt;
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">🖨️ In Mẫu Sổ / Xuất PDF (A4)</button>
    <button class="close" onclick="window.close()">Đóng Cửa Sổ</button>
  </div>
  ${htmlContent}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;

  // Method 1: Blob URL with anchor click (reliable in iframes)
  try {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  } catch (err) {
    console.warn('Blob window open failed, fallback:', err);
  }

  // Method 2: Standard window.open
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return;
    }
  } catch (err) {
    console.warn('window.open failed:', err);
  }

  // Method 3: Hidden iframe print
  try {
    let iframe = document.getElementById('__hidden_print_frame__') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = '__hidden_print_frame__';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed:', e);
        }
      }, 500);
    }
  } catch (e) {
    console.warn('Iframe fallback error:', e);
  }
}

export function downloadPrintHtml(htmlContent: string, fileName: string, landscape = false) {
  const orientation = landscape ? 'landscape' : 'portrait';
  const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    @page { size: A4 ${orientation}; margin: 12mm 15mm 15mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "Times New Roman", Times, serif, Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
    .print-actions { text-align: center; margin-bottom: 20px; padding: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-family: sans-serif; }
    .print-actions button { background: #047857; color: #fff; border: none; padding: 8px 18px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin: 0 6px; }
    @media print { .print-actions { display: none !important; } body { padding: 0; } }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .header-table td { vertical-align: top; border: none; padding: 2px 0; }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 55%; }
    .unit-name { font-size: 10.5pt; text-transform: uppercase; font-weight: bold; }
    .school-name { font-size: 11pt; text-transform: uppercase; font-weight: bold; }
    .national-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
    .national-motto { font-size: 11pt; font-weight: bold; }
    .divider-line { width: 60px; height: 1px; background: #000; margin: 4px auto; }
    .doc-title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px 0; }
    .doc-subtitle { text-align: center; font-size: 10.5pt; font-style: italic; margin-bottom: 12px; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .data-table th, .data-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10pt; }
    .data-table th { background: #f1f5f9; font-weight: bold; text-align: center; }
    .signature-grid { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
    .signature-col { text-align: center; width: 45%; }
    .signature-title { font-weight: bold; text-transform: uppercase; font-size: 10.5pt; }
    .signature-sub { font-style: italic; font-size: 9.5pt; color: #333; }
    .signature-space { height: 70px; }
    .signature-name { font-weight: bold; font-size: 10.5pt; }
  </style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">🖨️ In Mẫu Sổ / Xuất PDF (A4)</button>
  </div>
  ${htmlContent}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Xuất văn bản Microsoft Word (.doc) cho phép mở và chỉnh sửa trực tiếp trong Microsoft Word
export function downloadWordDoc(
  htmlContent: string,
  fileName: string,
  landscape = false,
  fontSize = '11pt'
) {
  const isLandscape = landscape;
  const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${fileName}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: ${isLandscape ? '841.9pt 595.3pt' : '595.3pt 841.9pt'};
      margin: 15mm 15mm 15mm 15mm;
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
      mso-page-orientation: ${isLandscape ? 'landscape' : 'portrait'};
    }
    div.Section1 { page: Section1; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: ${fontSize};
      line-height: 1.35;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8pt 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    table.header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12pt;
    }
    table.header-table td {
      border: none;
      vertical-align: top;
      padding: 2pt 4pt;
    }
    .header-left { text-align: center; width: 45%; }
    .header-right { text-align: center; width: 55%; }
    .unit-name { font-size: 10.5pt; text-transform: uppercase; font-weight: bold; }
    .school-name { font-size: 11pt; text-transform: uppercase; font-weight: bold; }
    .national-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
    .national-motto { font-size: 11pt; font-weight: bold; }
    .divider-line { width: 100pt; height: 1pt; background: #000; margin: 4pt auto; }
    .doc-title { text-align: center; font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 12pt 0 4pt 0; }
    .doc-subtitle { text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 12pt; }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
    }
    table.data-table th, table.data-table td {
      border: 1pt solid #000000;
      padding: 5pt 6pt;
      font-size: 10pt;
      vertical-align: middle;
    }
    table.data-table th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-align: center;
    }
    .signature-grid, table.signatures-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 25pt;
      page-break-inside: avoid;
    }
    .signature-grid td, table.signatures-table td {
      border: none;
      vertical-align: top;
      text-align: center;
      padding: 4pt;
    }
    .signature-title { font-weight: bold; text-transform: uppercase; font-size: 10.5pt; }
    .signature-sub { font-style: italic; font-size: 9.5pt; color: #333333; }
    .signature-space { height: 60pt; }
    .signature-name { font-weight: bold; font-size: 10.5pt; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="Section1">
    ${htmlContent}
  </div>
</body>
</html>`;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function renderHeader(config: PrintHeaderConfig) {
  const cfg = templateConfigService.getConfig();
  const dateStr = templateConfigService.getDateString(cfg);
  return `
    <table class="header-table">
      <tr>
        <td class="header-left">
          <div class="unit-name">${cfg.governingBody || 'PHÒNG GD&ĐT HUYỆN HÓC MÔN'}</div>
          <div class="school-name">${config.schoolName || cfg.schoolName || 'TRƯỜNG THCS ĐÔNG THẠNH'}</div>
          <div>${config.department || cfg.department || 'Bộ phận: Y TẾ HỌC ĐƯỜNG'}</div>
          <div class="divider-line"></div>
        </td>
        <td class="header-right">
          <div class="national-title">${cfg.nationalTitle || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'}</div>
          <div class="national-motto">${cfg.nationalMotto || 'Độc lập - Tự do - Hạnh phúc'}</div>
          <div class="divider-line"></div>
          <div style="font-style: italic; font-size: 10pt; margin-top: 6px;">
            ${dateStr}
          </div>
        </td>
      </tr>
    </table>
    <div class="doc-title">${config.title}</div>
    ${config.subtitle ? `<div class="doc-subtitle">${config.subtitle}</div>` : ''}
    ${config.code ? `<div style="text-align: center; font-weight: bold; margin-bottom: 8px;">Mã số: ${config.code}</div>` : ''}
  `;
}

export function renderSignaturesTable(customSigners?: {
  title1?: string;
  sub1?: string;
  name1?: string;
  title2?: string;
  sub2?: string;
  name2?: string;
  showSigner3?: boolean;
  title3?: string;
  sub3?: string;
  name3?: string;
}) {
  const cfg = templateConfigService.getConfig();
  const title1 = customSigners?.title1 || cfg.signatory1Title || 'CÁN BỘ Y TẾ';
  const sub1 = customSigners?.sub1 || cfg.signatory1Sub || '(Ký và ghi rõ họ tên)';
  const name1 = customSigners?.name1 || cfg.signatory1Name || 'Cô Đoàn Thị Minh Trang';

  const title2 = customSigners?.title2 || cfg.signatory2Title || 'HIỆU TRƯỞNG';
  const sub2 = customSigners?.sub2 || cfg.signatory2Sub || '(Ký, đóng dấu và ghi rõ họ tên)';
  const name2 = customSigners?.name2 || cfg.signatory2Name || 'Ban Giám Hiệu';

  const show3 = customSigners?.showSigner3 ?? cfg.showSignatory3;
  const title3 = customSigners?.title3 || cfg.signatory3Title || 'KẾ TOÁN / THỦ KHO';
  const sub3 = customSigners?.sub3 || cfg.signatory3Sub || '(Ký và ghi rõ họ tên)';
  const name3 = customSigners?.name3 || cfg.signatory3Name || 'Đại diện kiểm soát';

  if (show3) {
    return `
      <table class="signatures-table">
        <tr>
          <td>
            <div class="signature-title">${title1}</div>
            <div class="signature-sub">${sub1}</div>
            <div class="signature-space"></div>
            <div class="signature-name">${name1}</div>
          </td>
          <td>
            <div class="signature-title">${title3}</div>
            <div class="signature-sub">${sub3}</div>
            <div class="signature-space"></div>
            <div class="signature-name">${name3}</div>
          </td>
          <td>
            <div class="signature-title">${title2}</div>
            <div class="signature-sub">${sub2}</div>
            <div class="signature-space"></div>
            <div class="signature-name">${name2}</div>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-title">${title1}</div>
          <div class="signature-sub">${sub1}</div>
          <div class="signature-space"></div>
          <div class="signature-name">${name1}</div>
        </td>
        <td>
          <div class="signature-title">${title2}</div>
          <div class="signature-sub">${sub2}</div>
          <div class="signature-space"></div>
          <div class="signature-name">${name2}</div>
        </td>
      </tr>
    </table>
  `;
}

function renderStockSectionTableHtml(list: StockInOutBalanceRow[], isSupplySection: boolean) {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 35px;">STT</th>
          <th rowspan="2" style="width: 80px;">${isSupplySection ? 'Mã vật tư' : 'Mã thuốc'}</th>
          <th rowspan="2">${isSupplySection ? 'Tên vật tư y tế, quy cách' : 'Tên thuốc, nồng độ, hàm lượng'}</th>
          <th rowspan="2" style="width: 75px;">Số lô</th>
          <th rowspan="2" style="width: 75px;">Hạn dùng</th>
          <th rowspan="2" style="width: 50px;">ĐVT</th>
          <th rowspan="2" style="width: 60px;">Tồn đầu kỳ</th>
          <th colspan="2">Phát sinh trong kỳ</th>
          <th rowspan="2" style="width: 60px;">Điều chỉnh</th>
          <th rowspan="2" style="width: 60px;">Tồn cuối kỳ</th>
          <th rowspan="2" style="width: 90px;">Vị trí lưu trữ</th>
        </tr>
        <tr>
          <th style="width: 60px;">Nhập (+)</th>
          <th style="width: 60px;">Xuất (-)</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (r, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="text-center font-bold">${r.medicineCode}</td>
            <td>${r.medicineName}</td>
            <td class="text-center font-bold">${r.batchNumber}</td>
            <td class="text-center">${formatDateVN(r.expDate)}</td>
            <td class="text-center">${r.unit}</td>
            <td class="text-right font-bold">${r.openingStock}</td>
            <td class="text-right" style="color: #047857;">${r.importQuantity > 0 ? '+' + r.importQuantity : '0'}</td>
            <td class="text-right" style="color: #b91c1c;">${r.exportQuantity > 0 ? '-' + r.exportQuantity : '0'}</td>
            <td class="text-right">${r.adjustmentQuantity !== 0 ? (r.adjustmentQuantity > 0 ? '+' + r.adjustmentQuantity : r.adjustmentQuantity) : '0'}</td>
            <td class="text-right font-bold" style="background: #f8fafc;">${r.closingStock}</td>
            <td class="text-left" style="font-size: 9pt;">${r.notes || 'Tủ thuốc y tế'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #f1f5f9;">
          <td colspan="6" class="text-center">CỘNG ${isSupplySection ? 'VẬT TƯ Y TẾ' : 'THUỐC'} (${list.length} mục)</td>
          <td class="text-right">${list.reduce((s, r) => s + r.openingStock, 0)}</td>
          <td class="text-right">${list.reduce((s, r) => s + r.importQuantity, 0)}</td>
          <td class="text-right">${list.reduce((s, r) => s + r.exportQuantity, 0)}</td>
          <td class="text-right">${list.reduce((s, r) => s + r.adjustmentQuantity, 0)}</td>
          <td class="text-right font-bold">${list.reduce((s, r) => s + r.closingStock, 0)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

// 1. In Sổ Nhập - Xuất - Tồn A4 Landscape
export function printStockBalanceA4(
  rows: StockInOutBalanceRow[],
  periodLabel: string,
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const medRows = rows.filter(
    (r) =>
      !isMedicalSupplyItem({
        medicineId: r.medicineId,
        code: r.medicineCode,
        name: r.medicineName,
        batchNumber: r.batchNumber,
      })
  );
  const supRows = rows.filter((r) =>
    isMedicalSupplyItem({
      medicineId: r.medicineId,
      code: r.medicineCode,
      name: r.medicineName,
      batchNumber: r.batchNumber,
    })
  );

  const content = `
    ${renderHeader({
      schoolName,
      title: 'SỔ THEO DÕI NHẬP - XUẤT - TỒN THUỐC VÀ VẬT TƯ Y TẾ',
      subtitle: `Kỳ báo cáo: ${periodLabel}`,
    })}

    <div style="font-weight: bold; font-size: 11pt; margin: 12px 0 4px 0; text-transform: uppercase;">
      PHẦN 1: BẢNG NHẬP - XUẤT - TỒN THUỐC (DƯỢC PHẨM) (${medRows.length} LÔ)
    </div>
    ${renderStockSectionTableHtml(medRows, false)}

    <div style="font-weight: bold; font-size: 11pt; margin: 16px 0 4px 0; text-transform: uppercase;">
      PHẦN 2: BẢNG NHẬP - XUẤT - TỒN VẬT TƯ Y TẾ (${supRows.length} LÔ)
    </div>
    ${renderStockSectionTableHtml(supRows, true)}

    ${renderSignaturesTable()}
  `;

  openPrintWindow(content, true); // Landscape for wide tables
}

// Xuất file Microsoft Word (.doc) cho Sổ theo dõi Nhập - Xuất - Tồn
export function exportStockBalanceWordA4(
  rows: StockInOutBalanceRow[],
  periodLabel: string,
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const medRows = rows.filter(
    (r) =>
      !isMedicalSupplyItem({
        medicineId: r.medicineId,
        code: r.medicineCode,
        name: r.medicineName,
        batchNumber: r.batchNumber,
      })
  );
  const supRows = rows.filter((r) =>
    isMedicalSupplyItem({
      medicineId: r.medicineId,
      code: r.medicineCode,
      name: r.medicineName,
      batchNumber: r.batchNumber,
    })
  );

  const content = `
    ${renderHeader({
      schoolName,
      title: 'SỔ THEO DÕI NHẬP - XUẤT - TỒN THUỐC VÀ VẬT TƯ Y TẾ',
      subtitle: `Kỳ báo cáo: ${periodLabel}`,
    })}

    <div style="font-weight: bold; font-size: 11pt; margin: 12pt 0 4pt 0; text-transform: uppercase;">
      PHẦN 1: BẢNG NHẬP - XUẤT - TỒN THUỐC (DƯỢC PHẨM) (${medRows.length} LÔ)
    </div>
    ${renderStockSectionTableHtml(medRows, false)}

    <div style="font-weight: bold; font-size: 11pt; margin: 16pt 0 4pt 0; text-transform: uppercase;">
      PHẦN 2: BẢNG NHẬP - XUẤT - TỒN VẬT TƯ Y TẾ (${supRows.length} LÔ)
    </div>
    ${renderStockSectionTableHtml(supRows, true)}

    ${renderSignaturesTable()}
  `;

  downloadWordDoc(content, `So_Nhap_Xuat_Ton_Kho_Y_Te_${periodLabel.replace(/\s+/g, '_')}`, true);
}

// 2. In Biên Bản Kiểm Kê A4 Portrait
export function printInventoryCheckA4(check: InventoryCheck, schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH') {
  const content = `
    ${renderHeader({
      schoolName,
      title: 'BIÊN BẢN KIỂM KÊ THUỐC VÀ VẬT TƯ Y TẾ',
      subtitle: `Thời điểm kiểm kê: ${check.checkTime || '---'}, ngày ${formatDateVN(check.checkDate)}`,
      code: check.checkCode,
    })}

    <div class="meta-box">
      <p><strong>1. Hội đồng kiểm kê gồm có:</strong></p>
      <ul style="margin: 4px 0 10px 20px; padding: 0;">
        ${(check.participants || ['Cán bộ Y tế học đường', 'Ban Giám Hiệu', 'Đại diện kế toán'])
          .map((p) => `<li>${p}</li>`)
          .join('')}
      </ul>
      <p><strong>2. Người lập biên bản:</strong> ${check.performer}</p>
      <p><strong>3. Trạng thái biên bản:</strong> ${
        check.status === 'adjusted'
          ? 'ĐÃ ĐIỀU CHỈNH TỒN KHO THỰC TẾ'
          : check.status === 'confirmed'
          ? 'ĐÃ XÁC NHẬN BỞI BAN KIỂM KÊ'
          : 'DỰ THẢO / ĐANG XỬ LÝ'
      } ${check.confirmedBy ? `(Người duyệt: ${check.confirmedBy})` : ''}</p>
      ${check.notes ? `<p><strong>4. Nhận xét / Đề xuất:</strong> ${check.notes}</p>` : ''}
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35px;">STT</th>
          <th style="width: 75px;">Mã thuốc</th>
          <th>Tên thuốc / Nồng độ</th>
          <th style="width: 75px;">Số lô</th>
          <th style="width: 75px;">Hạn dùng</th>
          <th style="width: 50px;">ĐVT</th>
          <th style="width: 60px;">Tồn sổ sách</th>
          <th style="width: 60px;">Thực kiểm</th>
          <th style="width: 60px;">Chênh lệch</th>
          <th style="width: 80px;">Chất lượng</th>
          <th>Lý do chênh lệch & Xử lý</th>
        </tr>
      </thead>
      <tbody>
        ${check.items
          .map(
            (it, i) => `
          <tr ${it.difference !== 0 ? 'style="background: #fffbeb;"' : ''}>
            <td class="text-center">${i + 1}</td>
            <td class="text-center font-bold">${it.medicineCode}</td>
            <td>${it.medicineName}</td>
            <td class="text-center font-bold">${it.batchNumber}</td>
            <td class="text-center">${formatDateVN(it.expDate)}</td>
            <td class="text-center">${it.unit}</td>
            <td class="text-right">${it.bookQuantity}</td>
            <td class="text-right font-bold">${it.actualQuantity}</td>
            <td class="text-right font-bold" style="color: ${it.difference < 0 ? '#dc2626' : it.difference > 0 ? '#16a34a' : '#000'};">
              ${it.difference > 0 ? '+' + it.difference : it.difference}
            </td>
            <td class="text-center">${it.qualityStatus === 'damaged' ? 'Hỏng/kém phẩm chất' : it.qualityStatus === 'expired' ? 'Hết hạn' : 'Tốt'}</td>
            <td style="font-size: 9pt;">${it.reason || (it.difference === 0 ? 'Khớp số liệu' : 'Cần rà soát')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #f1f5f9;">
          <td colspan="6" class="text-center">TỔNG CỘNG</td>
          <td class="text-right">${check.items.reduce((s, it) => s + it.bookQuantity, 0)}</td>
          <td class="text-right">${check.items.reduce((s, it) => s + it.actualQuantity, 0)}</td>
          <td class="text-right">${check.items.reduce((s, it) => s + it.difference, 0)}</td>
          <td colspan="2" class="text-center">Số mục lệch: ${check.items.filter((it) => it.difference !== 0).length}</td>
        </tr>
      </tfoot>
    </table>

    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-title">CÁN BỘ Y TẾ</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${check.performer}</div>
        </td>
        <td>
          <div class="signature-title">ĐẠI DIỆN HỘI ĐỒNG KIỂM KÊ</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">Thành viên Ban kiểm kê</div>
        </td>
        <td>
          <div class="signature-title">HIỆU TRƯỞNG</div>
          <div class="signature-sub">(Ký, đóng dấu và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${check.confirmedBy || 'Ban Giám Hiệu'}</div>
        </td>
      </tr>
    </table>
  `;

  openPrintWindow(content, false); // Portrait
}

// 3. In Phiếu Nhập / Phiếu Xuất A4 Portrait
export function printTransactionA4(tx: InventoryTransaction, schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH') {
  const isImport = tx.type === 'import';
  const title = isImport ? 'PHIẾU NHẬP KHO THUỐC VÀ VẬT TƯ Y TẾ' : 'PHIẾU XUẤT / CẤP PHÁT THUỐC HỌC ĐƯỜNG';

  const content = `
    ${renderHeader({
      schoolName,
      title,
      subtitle: `Ngày thực hiện: ${formatDateVN(tx.date)}`,
      code: tx.transactionCode,
    })}

    <div class="meta-box">
      ${
        isImport
          ? `
        <p><strong>Nguồn cấp / Đơn vị cung cấp:</strong> ${tx.source || 'Nhà thuốc / Trung tâm y tế'}</p>
        <p><strong>Người giao hàng:</strong> ${tx.deliverer || 'Đại diện nhà cung ứng'} | <strong>Người nhận:</strong> ${tx.receiver || tx.performer}</p>
        <p><strong>Cán bộ y tế lập phiếu:</strong> ${tx.performer}</p>
      `
          : `
        <p><strong>Họ và tên người nhận / sử dụng:</strong> ${tx.recipientName || '---'} ${tx.recipientClass ? `(Lớp: ${tx.recipientClass})` : ''}</p>
        <p><strong>Đối tượng:</strong> ${tx.recipientType === 'student' ? 'Học sinh' : tx.recipientType === 'teacher' ? 'Giáo viên' : 'Cán bộ / Khác'}</p>
        <p><strong>Lý do / Mục đích cấp phát:</strong> ${tx.purpose || 'Xử lý sơ cấp cứu học sinh'}</p>
        <p><strong>Cán bộ y tế thực hiện:</strong> ${tx.performer}</p>
      `
      }
      ${tx.notes ? `<p><strong>Ghi chú:</strong> ${tx.notes}</p>` : ''}
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35px;">STT</th>
          <th style="width: 80px;">Mã thuốc</th>
          <th>Tên thuốc, nồng độ, quy cách</th>
          <th style="width: 80px;">Số lô</th>
          <th style="width: 80px;">Hạn sử dụng</th>
          <th style="width: 50px;">ĐVT</th>
          <th style="width: 65px;">Số lượng</th>
        </tr>
      </thead>
      <tbody>
        ${tx.items
          .map(
            (it, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="text-center font-bold">${it.medicineCode}</td>
            <td>${it.medicineName}</td>
            <td class="text-center font-bold">${it.batchNumber}</td>
            <td class="text-center">${formatDateVN(it.expDate || '')}</td>
            <td class="text-center">${it.unit}</td>
            <td class="text-right font-bold">${it.quantity}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #f1f5f9;">
          <td colspan="6" class="text-center">TỔNG CỘNG</td>
          <td class="text-right font-bold">${tx.items.reduce((s, it) => s + it.quantity, 0)}</td>
        </tr>
      </tfoot>
    </table>

    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-title">${isImport ? 'NGƯỜI GIAO HÀNG' : 'NGƯỜI NHẬN THUỐC'}</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${isImport ? tx.deliverer || 'Đại diện nhà xe/NCC' : tx.recipientName || 'Người nhận'}</div>
        </td>
        <td>
          <div class="signature-title">CÁN BỘ Y TẾ</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${tx.performer}</div>
        </td>
        <td>
          <div class="signature-title">BAN GIÁM HIỆU</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">Hiệu Trưởng duyệt</div>
        </td>
      </tr>
    </table>
  `;

  openPrintWindow(content, false);
}

// 4. In Báo Cáo Hạn Sử Dụng / Đề Nghị Tiêu Hủy A4 Portrait
export function printExpiryReportA4(
  batches: (MedicineBatch & { medicineName?: string; unit?: string; medicineCode?: string })[],
  reportType: 'expired' | 'expiring_soon',
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const isExpired = reportType === 'expired';
  const title = isExpired
    ? 'DANH SÁCH THUỐC HẾT HẠN SỬ DỤNG - ĐỀ NGHỊ TIÊU HỦY'
    : 'DANH SÁCH THUỐC CẢNH BÁO SẮP HẾT HẠN DÙNG (CẦN ƯU TIÊN SỬ DỤNG)';

  const content = `
    ${renderHeader({
      schoolName,
      title,
      subtitle: `Thời điểm xuất báo cáo: ${formatDateVN(new Date().toISOString().split('T')[0])}`,
    })}

    <div class="meta-box">
      <p>Căn cứ quy chế quản lý thuốc và trang thiết bị y tế học đường hiện hành;</p>
      <p>Bộ phận Y tế học đường kính trình Ban Giám Hiệu danh sách các mặt hàng thuốc ${
        isExpired ? 'đã hết hạn sử dụng cần thực hiện niêm phong và tiêu hủy' : 'sắp hết hạn dùng cần ưu tiên cấp phát theo nguyên tắc FEFO'
      }:</p>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35px;">STT</th>
          <th style="width: 75px;">Mã thuốc</th>
          <th>Tên thuốc / Hoạt chất</th>
          <th style="width: 80px;">Số lô</th>
          <th style="width: 80px;">Hạn dùng</th>
          <th style="width: 50px;">ĐVT</th>
          <th style="width: 65px;">Số lượng</th>
          <th>Đề xuất xử lý</th>
        </tr>
      </thead>
      <tbody>
        ${batches
          .map(
            (b, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td class="text-center font-bold">${b.medicineCode || '---'}</td>
            <td>${b.medicineName || 'Thuốc'}</td>
            <td class="text-center font-bold">${b.batchNumber}</td>
            <td class="text-center font-bold" style="color: #dc2626;">${formatDateVN(b.expDate)}</td>
            <td class="text-center">${b.unit || 'Đơn vị'}</td>
            <td class="text-right font-bold">${b.quantity}</td>
            <td style="font-size: 9pt;">${isExpired ? 'Niêm phong chờ tiêu hủy' : 'Ưu tiên xuất theo FEFO'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #f1f5f9;">
          <td colspan="6" class="text-center">TỔNG CỘNG (${batches.length} lô)</td>
          <td class="text-right font-bold">${batches.reduce((s, b) => s + b.quantity, 0)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-title">CÁN BỘ Y TẾ</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">Người lập danh sách</div>
        </td>
        <td>
          <div class="signature-title">ĐẠI DIỆN CÔNG ĐOÀN / THANH TRA</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">Thành viên giám sát</div>
        </td>
        <td>
          <div class="signature-title">HIỆU TRƯỞNG</div>
          <div class="signature-sub">(Ký, đóng dấu duyệt phương án)</div>
          <div class="signature-space"></div>
          <div class="signature-name">Ban Giám Hiệu Nhà Trường</div>
        </td>
      </tr>
    </table>
  `;

  openPrintWindow(content, false);
}

// 7. In Biên Bản Tiêu Hủy Thuốc A4 Chuẩn Bộ Y Tế & GDĐT
export function printDisposalReportA4(
  disposal: MedicineDisposal,
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const cfg = templateConfigService.getConfig();
  const governingBody =
    cfg.governingBody && cfg.governingBody !== 'PHÒNG GD&ĐT HUYỆN HÓC MÔN'
      ? cfg.governingBody
      : 'UBND XÃ ĐÔNG THẠNH';
  const effectiveSchoolName = schoolName || cfg.schoolName || 'TRƯỜNG THCS ĐÔNG THẠNH';

  const totalQty = (disposal.items || []).reduce((s, i) => s + (i.disposalQuantity || 0), 0);
  const rawMembers = disposal.councilMembers || [];

  const bgh = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('hiệu trưởng') ||
      m.roleTitle.toLowerCase().includes('chủ tịch') ||
      m.position.toLowerCase().includes('giám hiệu')
  ) || rawMembers[0] || {
    roleTitle: 'P. HIỆU TRƯỞNG',
    name: 'Trần Thị Thanh Hiền',
    position: 'Phó Hiệu trưởng',
    signNote: '',
  };

  const medic = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('y tế') ||
      m.roleTitle.toLowerCase().includes('thư ký') ||
      m.position.toLowerCase().includes('y tế')
  ) || (rawMembers.length > 1 ? rawMembers[1] : null) || {
    roleTitle: 'NHÂN VIÊN Y TẾ',
    name: 'Đoàn Thị Minh Trang',
    position: 'Phụ trách Phòng Y tế học đường',
    signNote: '',
  };

  const acc = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('kế toán') ||
      m.position.toLowerCase().includes('kế toán')
  );

  const hasAccountant = Boolean(acc && acc.name && acc.name.trim() !== '');
  const extras = rawMembers.filter((m) => m !== bgh && m !== medic && m !== acc);

  // Attendees list
  const displayCouncil: DisposalCouncilMember[] = [
    { ...bgh, roleTitle: bgh.roleTitle || 'P. HIỆU TRƯỞNG', name: bgh.name, position: bgh.position || 'Phó Hiệu trưởng' },
    { ...medic, roleTitle: medic.roleTitle || 'NHÂN VIÊN Y TẾ', name: medic.name, position: medic.position || 'Phụ trách Phòng Y tế học đường' },
  ];
  if (hasAccountant && acc) {
    displayCouncil.push({
      ...acc,
      roleTitle: acc.roleTitle || 'KẾ TOÁN TRƯỜNG',
      name: acc.name,
      position: acc.position || 'Kế toán trường',
    });
  }
  extras.forEach((ext) => displayCouncil.push(ext));

  // Thứ tự ký tên chuẩn theo mẫu PDF: P. HIỆU TRƯỞNG bên trái, Kế toán ở giữa (nếu có), NHÂN VIÊN Y TẾ bên phải
  const signersList: DisposalCouncilMember[] = [
    bgh,
    ...(hasAccountant && acc ? [acc] : []),
    ...extras,
    medic,
  ];
  const colWidth = (100 / signersList.length).toFixed(1);

  // Format date: "Đông Thạnh, ngày 15 tháng 10 năm 2026"
  const dateParts = (disposal.disposalDate || new Date().toISOString().split('T')[0]).split('-');
  const dateHeaderStr = `${cfg.location || 'Đông Thạnh'}, ngày ${Number(dateParts[2])} tháng ${Number(dateParts[1])} năm ${dateParts[0]}`;

  const content = `
    <!-- Top Header -->
    <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
      <tr>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <div style="font-size: 11pt; font-weight: normal; text-transform: uppercase; color: #000;">${governingBody}</div>
          <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #000; margin-top: 1px;">${effectiveSchoolName}</div>
          <div style="font-size: 10.5pt; margin-top: 3px; color: #000;">Số:……../BB-HUY</div>
        </td>
        <td style="width: 4%; border: none;"></td>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #000;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-size: 11pt; font-weight: bold; color: #000; margin-top: 1px;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="font-style: italic; font-size: 10.5pt; margin-top: 6px; color: #000;">
            ${dateHeaderStr}
          </div>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <div style="text-align: center; margin: 15px 0 12px 0; font-family: 'Times New Roman', serif;">
      <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; line-height: 1.35; color: #000;">
        BIÊN BẢN TIÊU HỦY THUỐC VÀ VẬT TƯ Y TẾ HẾT HẠN
      </div>
      <div style="font-size: 10.5pt; font-style: italic; margin-top: 3px; color: #000;">
        Số biên bản: ${disposal.disposalCode} • Ngày lập: ${formatDateVN(disposal.disposalDate)}
      </div>
      <div style="font-size: 11pt; font-weight: bold; margin-top: 5px; color: #000;">
        Mã số: ${disposal.disposalCode}
      </div>
    </div>

    <!-- Legal & Attendees -->
    <div style="font-size: 11pt; line-height: 1.5; margin-bottom: 12px; font-family: 'Times New Roman', serif; color: #000;">
      <p style="margin: 0 0 6px 0; text-align: justify;">
        Căn cứ Thông tư liên tịch số 13/2016/TTLT-BYT-BGDĐT ngày 12/5/2016 của Bộ Y tế và Bộ Giáo dục & Đào tạo quy định về công tác y tế trường học;
      </p>
      ${disposal.decisionNumber && disposal.decisionNumber.trim() ? `
      <p style="margin: 0 0 6px 0; text-align: justify;">
        Căn cứ Quyết định số <strong>${disposal.decisionNumber}</strong> ${disposal.decisionDate ? `ngày ${formatDateVN(disposal.decisionDate)}` : ''} của Hiệu trưởng Trường THCS Đông Thạnh về việc thành lập Hội đồng tiêu hủy thuốc và vật tư y tế;
      </p>` : ''}
      <p style="margin: 0 0 4px 0; text-align: justify;">
        Hôm nay, ngày ${formatDateVN(disposal.disposalDate)}, tại ${disposal.disposalLocation || 'Phòng Y tế Trường THCS Đông Thạnh'}, Hội đồng tiến hành tiêu hủy gồm có:
      </p>
      
      <table style="width: 100%; margin: 4px 0 8px 0; border: none; border-collapse: collapse; font-size: 11pt;">
        ${displayCouncil
          .map(
            (m, i) => `
          <tr>
            <td style="padding: 2px 0; width: 45%; border: none; vertical-align: top;">
              ${i + 1}.Ông/Bà: <strong>${m.name}</strong>
            </td>
            <td style="padding: 2px 0; width: 55%; border: none; vertical-align: top;">
              Chức vụ: ${m.position || '—'}
            </td>
          </tr>
        `
          )
          .join('')}
      </table>

      <p style="margin: 6px 0 6px 0; text-align: justify;">
        <strong>Phương pháp tiêu hủy:</strong> ${disposal.disposalMethod || 'Hòa tan, trung hòa bất hoạt và chuyển bao gói rác thải y tế chuyên trách tiêu hủy theo quy định'}
      </p>
      <p style="margin: 0 0 10px 0; text-align: justify;">
        <strong>Ghi nhận tiêu hủy:</strong> ${disposal.witnessNotes || 'Hội đồng đã kiểm tra đúng chủng loại, số lượng, niêm phong và tiêu hủy an toàn theo quy định. | Biên bản thực tế: Tiêu hủy và xuất trừ kho tự động.'}
      </p>
    </div>

    <!-- Items Table -->
    <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 10pt; margin: 8px 0; font-family: 'Times New Roman', serif;">
      <thead>
        <tr style="background: #fff; text-align: center;">
          <th style="border: 1px solid #000; padding: 6px 2px; width: 36px; font-weight: bold;">STT</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; font-weight: bold;">Mã thuốc</th>
          <th style="border: 1px solid #000; padding: 6px 6px; font-weight: bold;">Tên thuốc, nồng độ, hoạt chất</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 70px; font-weight: bold;">Số lô</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; font-weight: bold;">Hạn dùng</th>
          <th style="border: 1px solid #000; padding: 6px 2px; width: 45px; font-weight: bold;">ĐVT</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 60px; font-weight: bold;">Số lượng</th>
          <th style="border: 1px solid #000; padding: 6px 6px; width: 105px; font-weight: bold;">Lý do tiêu hủy</th>
        </tr>
      </thead>
      <tbody>
        ${(disposal.items || [])
          .map(
            (item, i) => `
          <tr>
            <td style="border: 1px solid #000; padding: 6px 2px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; font-family: monospace;">${item.medicineCode}</td>
            <td style="border: 1px solid #000; padding: 6px 6px;">
              <strong>${item.medicineName}</strong>
              ${item.activeIngredient ? `<div style="font-size: 8.5pt; color: #475569;">${item.activeIngredient}</div>` : ''}
            </td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-family: monospace;">${item.batchNumber}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; color: #dc2626; font-weight: bold;">${formatDateVN(item.expDate)}</td>
            <td style="border: 1px solid #000; padding: 6px 2px; text-align: center;">${item.unit}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold;">${item.disposalQuantity}</td>
            <td style="border: 1px solid #000; padding: 6px 6px; font-size: 9.5pt;">${item.reason || 'Hết hạn sử dụng'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #fff;">
          <td colspan="6" style="border: 1px solid #000; padding: 6px 6px; text-align: left;">TỔNG CỘNG (${disposal.items?.length || 0} khoản mục)</td>
          <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${totalQty}</td>
          <td style="border: 1px solid #000; padding: 6px 6px;"></td>
        </tr>
      </tfoot>
    </table>

    <!-- Total Note & Conclusion -->
    <div style="margin: 8px 0; font-size: 11pt; font-style: italic; font-family: 'Times New Roman', serif;">
      * Tổng số lượng tiêu hủy: <strong>${totalQty} đơn vị thuốc.</strong>
    </div>

    <div style="margin: 10px 0 25px 0; font-size: 11pt; line-height: 1.5; text-align: justify; font-family: 'Times New Roman', serif;">
      Hội đồng đã tiến hành tiêu hủy đúng quy trình kỹ thuật, đảm bảo an toàn tuyệt đối và vệ sinh môi trường. Biên bản được lập thành ${hasAccountant ? '03' : '02'} bản có giá trị pháp lý như nhau (01 bản lưu hồ sơ y tế, 01 bản nộp Ban Giám Hiệu${hasAccountant ? ', 01 bản nộp bộ phận Kế toán' : ''}).
    </div>

    <!-- Signatures: P. HIỆU TRƯỞNG on left, NHÂN VIÊN Y TẾ on right exactly as attached PDF -->
    <table class="signatures-table" style="margin-top: 25px; width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif;">
      <tr>
        ${signersList
          .map(
            (s) => `
          <td style="width: ${colWidth}%; vertical-align: top; text-align: center; padding: 0 10px; border: none;">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 11pt; line-height: 1.3; color: #000;">
              ${s.roleTitle || 'NGƯỜI KÝ'}
            </div>
            ${s.signNote ? `<div style="font-size: 9.5pt; font-style: italic; color: #475569; margin-top: 2px;">${s.signNote}</div>` : ''}
            ${s.signatureContent && s.signatureContent.trim() ? `
              <div style="min-height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-style: italic; color: #1e3a8a; font-weight: 600; padding: 6px 0; font-family: 'Times New Roman', serif; font-size: 11pt;">
                ${s.signatureContent}
              </div>
            ` : `
              <div style="height: 70px;"></div>
            `}
            <div style="font-weight: bold; font-size: 11pt; color: #000;">
              ${s.name}
            </div>
          </td>
        `
          )
          .join('')}
      </tr>
    </table>
  `;

  openPrintWindow(content, false, `In Biên Bản Tiêu Hủy Thuốc - ${disposal.disposalCode}`);
}

// 8. Xuất Biên Bản Tiêu Hủy Thuốc sang Word (.doc)
export function exportDisposalWordA4(
  disposal: MedicineDisposal,
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const cfg = templateConfigService.getConfig();
  const governingBody =
    cfg.governingBody && cfg.governingBody !== 'PHÒNG GD&ĐT HUYỆN HÓC MÔN'
      ? cfg.governingBody
      : 'UBND XÃ ĐÔNG THẠNH';
  const effectiveSchoolName = schoolName || cfg.schoolName || 'TRƯỜNG THCS ĐÔNG THẠNH';

  const totalQty = (disposal.items || []).reduce((s, i) => s + (i.disposalQuantity || 0), 0);
  const rawMembers = disposal.councilMembers || [];

  const bgh = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('hiệu trưởng') ||
      m.roleTitle.toLowerCase().includes('chủ tịch') ||
      m.position.toLowerCase().includes('giám hiệu')
  ) || rawMembers[0] || {
    roleTitle: 'P. HIỆU TRƯỞNG',
    name: 'Trần Thị Thanh Hiền',
    position: 'Phó Hiệu trưởng',
    signNote: '',
  };

  const medic = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('y tế') ||
      m.roleTitle.toLowerCase().includes('thư ký') ||
      m.position.toLowerCase().includes('y tế')
  ) || (rawMembers.length > 1 ? rawMembers[1] : null) || {
    roleTitle: 'NHÂN VIÊN Y TẾ',
    name: 'Đoàn Thị Minh Trang',
    position: 'Phụ trách Phòng Y tế học đường',
    signNote: '',
  };

  const acc = rawMembers.find(
    (m) =>
      m.roleTitle.toLowerCase().includes('kế toán') ||
      m.position.toLowerCase().includes('kế toán')
  );

  const hasAccountant = Boolean(acc && acc.name && acc.name.trim() !== '');
  const extras = rawMembers.filter((m) => m !== bgh && m !== medic && m !== acc);

  // Attendees list
  const displayCouncil: DisposalCouncilMember[] = [
    { ...bgh, roleTitle: bgh.roleTitle || 'P. HIỆU TRƯỞNG', name: bgh.name, position: bgh.position || 'Phó Hiệu trưởng' },
    { ...medic, roleTitle: medic.roleTitle || 'NHÂN VIÊN Y TẾ', name: medic.name, position: medic.position || 'Phụ trách Phòng Y tế học đường' },
  ];
  if (hasAccountant && acc) {
    displayCouncil.push({
      ...acc,
      roleTitle: acc.roleTitle || 'KẾ TOÁN TRƯỜNG',
      name: acc.name,
      position: acc.position || 'Kế toán trường',
    });
  }
  extras.forEach((ext) => displayCouncil.push(ext));

  // Thứ tự ký tên chuẩn theo mẫu PDF: P. HIỆU TRƯỞNG bên trái, Kế toán ở giữa (nếu có), NHÂN VIÊN Y TẾ bên phải
  const signersList: DisposalCouncilMember[] = [
    bgh,
    ...(hasAccountant && acc ? [acc] : []),
    ...extras,
    medic,
  ];
  const colWidth = (100 / signersList.length).toFixed(1);

  // Format date: "Đông Thạnh, ngày 15 tháng 10 năm 2026"
  const dateParts = (disposal.disposalDate || new Date().toISOString().split('T')[0]).split('-');
  const dateHeaderStr = `${cfg.location || 'Đông Thạnh'}, ngày ${Number(dateParts[2])} tháng ${Number(dateParts[1])} năm ${dateParts[0]}`;

  const content = `
    <!-- Top Header -->
    <table style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 12px; font-family: 'Times New Roman', serif;">
      <tr>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <div style="font-size: 11pt; font-weight: normal; text-transform: uppercase; color: #000;">${governingBody}</div>
          <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; color: #000; margin-top: 1px;">${effectiveSchoolName}</div>
          <div style="font-size: 10.5pt; margin-top: 3px; color: #000;">Số:……../BB-HUY</div>
        </td>
        <td style="width: 4%; border: none;"></td>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #000;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-size: 11pt; font-weight: bold; color: #000; margin-top: 1px;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="font-style: italic; font-size: 10.5pt; margin-top: 6px; color: #000;">
            ${dateHeaderStr}
          </div>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <div style="text-align: center; margin: 15px 0 12px 0; font-family: 'Times New Roman', serif;">
      <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase; line-height: 1.35; color: #000;">
        BIÊN BẢN TIÊU HỦY THUỐC VÀ VẬT TƯ Y TẾ HẾT HẠN
      </div>
      <div style="font-size: 10.5pt; font-style: italic; margin-top: 3px; color: #000;">
        Số biên bản: ${disposal.disposalCode} • Ngày lập: ${formatDateVN(disposal.disposalDate)}
      </div>
      <div style="font-size: 11pt; font-weight: bold; margin-top: 5px; color: #000;">
        Mã số: ${disposal.disposalCode}
      </div>
    </div>

    <!-- Legal & Attendees -->
    <div style="font-size: 11pt; line-height: 1.5; margin-bottom: 12px; font-family: 'Times New Roman', serif; color: #000;">
      <p style="margin: 0 0 6px 0; text-align: justify;">
        Căn cứ Thông tư liên tịch số 13/2016/TTLT-BYT-BGDĐT ngày 12/5/2016 của Bộ Y tế và Bộ Giáo dục & Đào tạo quy định về công tác y tế trường học;
      </p>
      ${disposal.decisionNumber && disposal.decisionNumber.trim() ? `
      <p style="margin: 0 0 6px 0; text-align: justify;">
        Căn cứ Quyết định số <strong>${disposal.decisionNumber}</strong> ${disposal.decisionDate ? `ngày ${formatDateVN(disposal.decisionDate)}` : ''} của Hiệu trưởng Trường THCS Đông Thạnh về việc thành lập Hội đồng tiêu hủy thuốc và vật tư y tế;
      </p>` : ''}
      <p style="margin: 0 0 4px 0; text-align: justify;">
        Hôm nay, ngày ${formatDateVN(disposal.disposalDate)}, tại ${disposal.disposalLocation || 'Phòng Y tế Trường THCS Đông Thạnh'}, Hội đồng tiến hành tiêu hủy gồm có:
      </p>
      
      <table style="width: 100%; margin: 4px 0 8px 0; border: none; border-collapse: collapse; font-size: 11pt;">
        ${displayCouncil
          .map(
            (m, i) => `
          <tr>
            <td style="padding: 2px 0; width: 45%; border: none; vertical-align: top;">
              ${i + 1}.Ông/Bà: <strong>${m.name}</strong>
            </td>
            <td style="padding: 2px 0; width: 55%; border: none; vertical-align: top;">
              Chức vụ: ${m.position || '—'}
            </td>
          </tr>
        `
          )
          .join('')}
      </table>

      <p style="margin: 6px 0 6px 0; text-align: justify;">
        <strong>Phương pháp tiêu hủy:</strong> ${disposal.disposalMethod || 'Hòa tan, trung hòa bất hoạt và chuyển bao gói rác thải y tế chuyên trách tiêu hủy theo quy định'}
      </p>
      <p style="margin: 0 0 10px 0; text-align: justify;">
        <strong>Ghi nhận tiêu hủy:</strong> ${disposal.witnessNotes || 'Hội đồng đã kiểm tra đúng chủng loại, số lượng, niêm phong và tiêu hủy an toàn theo quy định. | Biên bản thực tế: Tiêu hủy và xuất trừ kho tự động.'}
      </p>
    </div>

    <!-- Items Table -->
    <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 10pt; margin: 8px 0; font-family: 'Times New Roman', serif;">
      <thead>
        <tr style="background: #fff; text-align: center;">
          <th style="border: 1px solid #000; padding: 6px 2px; width: 36px; font-weight: bold;">STT</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; font-weight: bold;">Mã thuốc</th>
          <th style="border: 1px solid #000; padding: 6px 6px; font-weight: bold;">Tên thuốc, nồng độ, hoạt chất</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 70px; font-weight: bold;">Số lô</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; font-weight: bold;">Hạn dùng</th>
          <th style="border: 1px solid #000; padding: 6px 2px; width: 45px; font-weight: bold;">ĐVT</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 60px; font-weight: bold;">Số lượng</th>
          <th style="border: 1px solid #000; padding: 6px 6px; width: 105px; font-weight: bold;">Lý do tiêu hủy</th>
        </tr>
      </thead>
      <tbody>
        ${(disposal.items || [])
          .map(
            (item, i) => `
          <tr>
            <td style="border: 1px solid #000; padding: 6px 2px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; font-family: monospace;">${item.medicineCode}</td>
            <td style="border: 1px solid #000; padding: 6px 6px;">
              <strong>${item.medicineName}</strong>
              ${item.activeIngredient ? `<div style="font-size: 8.5pt; color: #475569;">${item.activeIngredient}</div>` : ''}
            </td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-family: monospace;">${item.batchNumber}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; color: #dc2626; font-weight: bold;">${formatDateVN(item.expDate)}</td>
            <td style="border: 1px solid #000; padding: 6px 2px; text-align: center;">${item.unit}</td>
            <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold;">${item.disposalQuantity}</td>
            <td style="border: 1px solid #000; padding: 6px 6px; font-size: 9.5pt;">${item.reason || 'Hết hạn sử dụng'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: #fff;">
          <td colspan="6" style="border: 1px solid #000; padding: 6px 6px; text-align: left;">TỔNG CỘNG (${disposal.items?.length || 0} khoản mục)</td>
          <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${totalQty}</td>
          <td style="border: 1px solid #000; padding: 6px 6px;"></td>
        </tr>
      </tfoot>
    </table>

    <!-- Total Note & Conclusion -->
    <div style="margin: 8px 0; font-size: 11pt; font-style: italic; font-family: 'Times New Roman', serif;">
      * Tổng số lượng tiêu hủy: <strong>${totalQty} đơn vị thuốc.</strong>
    </div>

    <div style="margin: 10px 0 25px 0; font-size: 11pt; line-height: 1.5; text-align: justify; font-family: 'Times New Roman', serif;">
      Hội đồng đã tiến hành tiêu hủy đúng quy trình kỹ thuật, đảm bảo an toàn tuyệt đối và vệ sinh môi trường. Biên bản được lập thành ${hasAccountant ? '03' : '02'} bản có giá trị pháp lý như nhau (01 bản lưu hồ sơ y tế, 01 bản nộp Ban Giám Hiệu${hasAccountant ? ', 01 bản nộp bộ phận Kế toán' : ''}).
    </div>

    <!-- Signatures: P. HIỆU TRƯỞNG on left, NHÂN VIÊN Y TẾ on right exactly as attached PDF -->
    <table class="signatures-table" style="margin-top: 25px; width: 100%; border-collapse: collapse; border: none; font-family: 'Times New Roman', serif;">
      <tr>
        ${signersList
          .map(
            (s) => `
          <td style="width: ${colWidth}%; vertical-align: top; text-align: center; padding: 0 10px; border: none;">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 11pt; line-height: 1.3; color: #000;">
              ${s.roleTitle || 'NGƯỜI KÝ'}
            </div>
            ${s.signNote ? `<div style="font-size: 9.5pt; font-style: italic; color: #475569; margin-top: 2px;">${s.signNote}</div>` : ''}
            ${s.signatureContent && s.signatureContent.trim() ? `
              <div style="min-height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-style: italic; color: #1e3a8a; font-weight: 600; padding: 6px 0; font-family: 'Times New Roman', serif; font-size: 11pt;">
                ${s.signatureContent}
              </div>
            ` : `
              <div style="height: 70px;"></div>
            `}
            <div style="font-weight: bold; font-size: 11pt; color: #000;">
              ${s.name}
            </div>
          </td>
        `
          )
          .join('')}
      </tr>
    </table>
  `;

  downloadWordDoc(content, `Bien_Ban_Tieu_Huy_Thuoc_${disposal.disposalCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`, false);
}

/**
 * In Phiếu Chăm Sóc & Tiếp Nhận Phòng Y Tế A4 Portrait
 */
export function printClinicVisitReceiptA4(
  visit: ClinicVisit,
  schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH'
) {
  const config = templateConfigService.getConfig();
  const actualSchoolName = config.schoolName || schoolName;

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
      <div style="text-align: center; width: 45%;">
        <div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">UBND HUYỆN HÓC MÔN</div>
        <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; color: #0f766e;">${actualSchoolName}</div>
        <div style="font-size: 9pt; font-style: italic;">Phòng Y Tế Học Đường</div>
      </div>
      <div style="text-align: center; width: 50%;">
        <div style="font-size: 10pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-size: 9.5pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size: 9pt; margin-top: 2px;">***</div>
      </div>
    </div>
  `;

  const vitalsText = [
    visit.vitals?.weight ? `Cân nặng: <b>${visit.vitals.weight} kg</b>` : '',
    visit.vitals?.height ? `Chiều cao: <b>${visit.vitals.height} cm</b>` : '',
    visit.vitals?.temperature ? `Nhiệt độ: <b>${visit.vitals.temperature}°C</b>` : '',
    visit.vitals?.pulse ? `Mạch: <b>${visit.vitals.pulse} lần/phút</b>` : '',
    visit.vitals?.bloodPressure ? `Huyết áp: <b>${visit.vitals.bloodPressure} mmHg</b>` : '',
    visit.vitals?.respiratoryRate ? `Nhịp thở: <b>${visit.vitals.respiratoryRate} l/p</b>` : '',
    visit.vitals?.spO2 ? `SpO2: <b>${visit.vitals.spO2}%</b>` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp; | &nbsp; ');

  const medsList = visit.medicinesUsed && visit.medicinesUsed.length > 0 ? visit.medicinesUsed : (visit.medicinesDispensed || []);

  const medsRows = medsList.length > 0
    ? medsList.map((m, idx) => `
        <tr>
          <td style="text-align: center; padding: 5px;">${idx + 1}</td>
          <td style="padding: 5px; font-weight: bold;">${m.medicineName}</td>
          <td style="text-align: center; padding: 5px; font-family: monospace;">${m.batchNumber || '-'}</td>
          <td style="text-align: center; padding: 5px;">${m.expDate ? formatDateVN(m.expDate) : '-'}</td>
          <td style="text-align: right; padding: 5px; font-weight: bold;">${m.quantity} ${m.unit}</td>
          <td style="padding: 5px;">${m.dosageInstructions || 'Uống theo chỉ định cán bộ y tế'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align: center; padding: 10px; font-style: italic; color: #64748b;">Không chỉ định dùng thuốc</td></tr>`;

  const content = `
    ${headerHtml}

    <div style="text-align: center; margin: 10px 0 16px;">
      <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #1e293b;">
        PHIẾU CHĂM SÓC & TIẾP NHẬN PHÒNG Y TẾ
      </h2>
      <div style="font-size: 9.5pt; font-style: italic; color: #475569; margin-top: 3px;">
        Mã lượt khám: <strong>${visit.visitCode}</strong> &nbsp;•&nbsp; Ngày: <strong>${formatDateVN(visit.visitDate)}</strong> &nbsp;•&nbsp; Giờ vào: <strong>${formatTime24H(visit.timeIn)}</strong>${visit.timeOut ? ` &nbsp;•&nbsp; Giờ ra: <strong>${formatTime24H(visit.timeOut)}</strong>` : ''}
      </div>
    </div>

    <table style="width: 100%; font-size: 10pt; line-height: 1.6; margin-bottom: 12px; border-collapse: collapse;">
      <tr>
        <td style="width: 50%;">Họ và tên học sinh: <strong>${visit.studentName}</strong></td>
        <td style="width: 25%;">Lớp: <strong>${visit.className}</strong></td>
        <td style="width: 25%;">Mã HS: <strong>${visit.studentCode}</strong></td>
      </tr>
      <tr>
        <td>Người đưa đến: <strong>${visit.broughtBy || 'Tự đến'}</strong></td>
        <td colspan="2">Cán bộ y tế phụ trách: <strong>${visit.performer}</strong></td>
      </tr>
      <tr>
        <td colspan="3">Lý do vào phòng y tế: <strong>${visit.reason || (visit.reasons?.join(', ') || 'Kiểm tra sức khỏe')}</strong></td>
      </tr>
      <tr>
        <td colspan="3">Tình trạng ban đầu: <em>${visit.initialCondition || 'Học sinh mệt mỏi, cần theo dõi'}</em></td>
      </tr>
      ${vitalsText ? `<tr><td colspan="3" style="background: #f8fafc; padding: 4px 6px; border: 1px dashed #cbd5e1;">Dấu hiệu sinh tồn: ${vitalsText}</td></tr>` : ''}
      <tr>
        <td colspan="3">Biện pháp xử trí y tế: <strong>${visit.treatment || visit.treatmentDetails}</strong></td>
      </tr>
      <tr>
        <td colspan="3">Kết quả / Hướng giải quyết: <strong style="color: #047857;">${visit.outcome}</strong> ${visit.isTransferred ? `(Chuyển đến: ${visit.transferHospital || 'Bệnh viện Đa khoa'})` : ''}</td>
      </tr>
      ${visit.parentContacted ? `<tr><td colspan="3">Thông báo phụ huynh: <strong>Đã liên hệ</strong> ${visit.parentContactNotes ? `(${visit.parentContactNotes})` : ''}</td></tr>` : ''}
    </table>

    <div style="font-size: 10.5pt; font-weight: bold; margin: 12px 0 6px; color: #0f766e;">
      DANH MỤC THUỐC ĐÃ CẤP PHÁT (TRỪ KHO THEO LÔ FEFO):
    </div>
    <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 15px;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="width: 35px; text-align: center; padding: 6px; border: 1px solid #94a3b8;">STT</th>
          <th style="text-align: left; padding: 6px; border: 1px solid #94a3b8;">Tên thuốc, nồng độ/hàm lượng</th>
          <th style="width: 80px; text-align: center; padding: 6px; border: 1px solid #94a3b8;">Số lô</th>
          <th style="width: 85px; text-align: center; padding: 6px; border: 1px solid #94a3b8;">Hạn dùng</th>
          <th style="width: 70px; text-align: right; padding: 6px; border: 1px solid #94a3b8;">Số lượng</th>
          <th style="padding: 6px; border: 1px solid #94a3b8;">Cách dùng & Liều lượng</th>
        </tr>
      </thead>
      <tbody>
        ${medsRows}
      </tbody>
    </table>

    <table class="signatures-table" style="margin-top: 25px;">
      <tr>
        <td style="width: 33%;">
          <div class="signature-title">HỌC SINH / PHỤ HUYNH</div>
          <div class="signature-sub">(Ký, ghi rõ họ tên nếu có)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${visit.studentName}</div>
        </td>
        <td style="width: 33%;">
          <div class="signature-title">CÁN BỘ Y TẾ HỌC ĐƯỜNG</div>
          <div class="signature-sub">(Ký và ghi rõ họ tên)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${visit.performer}</div>
        </td>
        <td style="width: 34%;">
          <div class="signature-title">HIỆU TRƯỞNG / BGH DUYỆT</div>
          <div class="signature-sub">(Ký, đóng dấu xác nhận)</div>
          <div class="signature-space"></div>
          <div class="signature-name">${config.signatory2Name || 'Hiệu Trưởng / Ban Giám Hiệu'}</div>
        </td>
      </tr>
    </table>
  `;

  openPrintWindow(content, false, `Phieu_Cham_Soc_Y_Te_${visit.visitCode}`);
}

// =========================================================================
// MẪU IN BÁO CÁO CẤP PHÁT BĂNG VỆ SINH CHO HỌC SINH NỮ (CHUẨN BỘ Y TẾ & GDĐT)
// =========================================================================
export function printSanitaryNapkinReportA4(reportData: {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalDispatchCount: number;
  totalDispatchedPieces: number;
  totalImportedPieces: number;
  totalCurrentStock: number;
  dispatches: SanitaryNapkinDispatch[];
  imports: SanitaryNapkinImport[];
  byProduct: { product: SanitaryNapkinProduct; pieces: number; count: number }[];
  byClass: { className: string; pieces: number; count: number }[];
  bySource: { source: string; pieces: number; count: number }[];
  privacyNote: string;
}, schoolName = 'TRƯỜNG THCS ĐÔNG THẠNH', customSigners?: {
  title1?: string;
  name1?: string;
  title2?: string;
  name2?: string;
}) {
  const config = templateConfigService.getConfig();
  const title1 = customSigners?.title1 || config.signatory1Title || 'CÁN BỘ Y TẾ HỌC ĐƯỜNG';
  const name1 = customSigners?.name1 || config.signatory1Name || 'Cô Đoàn Thị Minh Trang';
  const title2 = customSigners?.title2 || config.signatory2Title || 'HIỆU TRƯỞNG / BAN GIÁM HIỆU';
  const name2 = customSigners?.name2 || config.signatory2Name || 'Ban Giám Hiệu';
  const now = new Date();

  const productRows = reportData.byProduct
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #334155; padding: 6px;">${idx + 1}</td>
        <td style="border: 1px solid #334155; padding: 6px; font-weight: 600;">${item.product.name}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">${item.product.brand || '---'}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">miếng</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: right; font-weight: bold;">${item.product.stockQuantity}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: right;">${item.count}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: right; font-weight: bold; color: #be185d;">${item.pieces}</td>
        <td style="border: 1px solid #334155; padding: 6px; text-align: center;">
          ${item.product.stockQuantity <= item.product.minAlertThreshold ? '<span style="color: #b91c1c; font-weight: bold;">⚠️ Dưới ngưỡng</span>' : '<span style="color: #15803d;">Đảm bảo</span>'}
        </td>
      </tr>
    `
    )
    .join('');

  const classRows = reportData.byClass
    .map(
      (c, idx) => `
      <tr>
        <td style="text-align: center; border: 1px solid #334155; padding: 5px;">${idx + 1}</td>
        <td style="border: 1px solid #334155; padding: 5px; font-weight: bold; text-align: center;">${c.className}</td>
        <td style="border: 1px solid #334155; padding: 5px; text-align: right;">${c.count} lượt</td>
        <td style="border: 1px solid #334155; padding: 5px; text-align: right; font-weight: bold; color: #be185d;">${c.pieces} miếng</td>
      </tr>
    `
    )
    .join('');

  const content = `
    <table class="report-header-table" style="width: 100%; margin-bottom: 15px;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <div style="font-size: 10pt; text-transform: uppercase;">UBND XÃ ĐÔNG THẠNH</div>
          <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">${schoolName}</div>
          <div style="font-size: 10pt; font-style: italic;">Bộ phận Y tế Học đường</div>
          <div style="margin-top: 3px; font-size: 9pt;">Số: ......./BC-YTHĐ</div>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <div style="font-size: 11pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-size: 11pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="font-size: 10pt; font-style: italic; margin-top: 6px;">
            Đông Thạnh, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 15px 0 10px 0;">
      <h2 style="font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0; color: #831843;">
        BÁO CÁO CÔNG TÁC CẤP PHÁT BĂNG VỆ SINH CHO HỌC SINH NỮ
      </h2>
      <div style="font-size: 11pt; font-weight: bold; font-style: italic; color: #475569;">
        Kỳ báo cáo: ${reportData.periodLabel}
      </div>
      <div style="font-size: 9.5pt; font-style: italic; color: #0284c7; margin-top: 3px;">
        (Căn cứ Thông tư liên tịch số 13/2016/TTLT-BYT-BGDĐT về Công tác Y tế trường học & Chăm sóc sức khỏe vị thành niên)
      </div>
    </div>

    <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 6px; padding: 10px; margin-bottom: 15px; font-size: 10pt;">
      <div style="font-weight: bold; color: #9d174d; margin-bottom: 5px;">I. SỐ LIỆU TỔNG HỢP TOÀN TRƯỜNG:</div>
      <table style="width: 100%; font-size: 10pt;">
        <tr>
          <td style="width: 50%;">• <strong>Tổng số lượt cấp phát hỗ trợ:</strong> <span style="font-size: 11pt; font-weight: bold; color: #be185d;">${reportData.totalDispatchCount}</span> lượt</td>
          <td style="width: 50%;">• <strong>Tổng số miếng đã cấp:</strong> <span style="font-size: 11pt; font-weight: bold; color: #be185d;">${reportData.totalDispatchedPieces}</span> miếng</td>
        </tr>
        <tr>
          <td>• <strong>Tổng số miếng tiếp nhận nhập kho trong kỳ:</strong> <strong>${reportData.totalImportedPieces}</strong> miếng</td>
          <td>• <strong>Tổng số lượng tồn kho hiện tại:</strong> <strong style="color: #15803d;">${reportData.totalCurrentStock}</strong> miếng</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top: 4px; font-style: italic; color: #64748b; font-size: 9pt;">
            * Ghi chú nguyên tắc bảo mật: "${reportData.privacyNote}"
          </td>
        </tr>
      </table>
    </div>

    <div style="font-weight: bold; text-transform: uppercase; font-size: 10.5pt; margin-bottom: 6px;">
      II. BẢNG CHI TIẾT THEO TỪNG LOẠI SẢN PHẨM:
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 15px;">
      <thead>
        <tr style="background-color: #f8fafc;">
          <th style="width: 35px; border: 1px solid #334155; padding: 6px;">STT</th>
          <th style="border: 1px solid #334155; padding: 6px;">Loại sản phẩm BVS</th>
          <th style="width: 90px; border: 1px solid #334155; padding: 6px;">Nhãn hiệu</th>
          <th style="width: 50px; border: 1px solid #334155; padding: 6px;">ĐVT</th>
          <th style="width: 80px; border: 1px solid #334155; padding: 6px;">Tồn kho</th>
          <th style="width: 75px; border: 1px solid #334155; padding: 6px;">Số lượt</th>
          <th style="width: 85px; border: 1px solid #334155; padding: 6px;">Số miếng cấp</th>
          <th style="width: 90px; border: 1px solid #334155; padding: 6px;">Tình trạng</th>
        </tr>
      </thead>
      <tbody>
        ${productRows}
        <tr style="font-weight: bold; background-color: #f1f5f9;">
          <td colspan="4" style="text-align: center; border: 1px solid #334155; padding: 6px;">TỔNG CỘNG</td>
          <td style="text-align: right; border: 1px solid #334155; padding: 6px;">${reportData.totalCurrentStock}</td>
          <td style="text-align: right; border: 1px solid #334155; padding: 6px;">${reportData.totalDispatchCount}</td>
          <td style="text-align: right; border: 1px solid #334155; padding: 6px; color: #be185d;">${reportData.totalDispatchedPieces}</td>
          <td style="text-align: center; border: 1px solid #334155; padding: 6px;">---</td>
        </tr>
      </tbody>
    </table>

    ${reportData.byClass.length > 0 ? `
      <div style="font-weight: bold; text-transform: uppercase; font-size: 10.5pt; margin-bottom: 6px;">
        III. THỐNG KÊ CẤP PHÁT THEO LỚP HỌC (Không lưu tên học sinh):
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="width: 40px; border: 1px solid #334155; padding: 5px;">STT</th>
            <th style="border: 1px solid #334155; padding: 5px;">Lớp tiếp nhận</th>
            <th style="width: 140px; border: 1px solid #334155; padding: 5px;">Số lượt hỗ trợ</th>
            <th style="width: 160px; border: 1px solid #334155; padding: 5px;">Tổng số miếng đã nhận</th>
          </tr>
        </thead>
        <tbody>
          ${classRows}
        </tbody>
      </table>
    ` : ''}

    <table class="signatures-table" style="width: 100%; margin-top: 25px;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <div style="font-size: 10.5pt; font-weight: bold;">${title1}</div>
          <div style="font-size: 9pt; font-style: italic;">(Ký và ghi rõ họ tên)</div>
          <div style="height: 65px;"></div>
          <div style="font-size: 10.5pt; font-weight: bold;">${name1}</div>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <div style="font-size: 10.5pt; font-weight: bold;">${title2}</div>
          <div style="font-size: 9pt; font-style: italic;">(Ký, đóng dấu xác nhận)</div>
          <div style="height: 65px;"></div>
          <div style="font-size: 10.5pt; font-weight: bold;">${name2}</div>
        </td>
      </tr>
    </table>
  `;

  openPrintWindow(content, false, `Bao_Cao_BVS_Nu_Sinh_${reportData.startDate}_${reportData.endDate}`);
}

