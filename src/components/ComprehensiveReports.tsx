import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  PieChart as PieChartIcon,
  TrendingUp,
  Stethoscope,
  Pill,
  Users,
  AlertTriangle,
  FileText,
  BriefcaseMedical,
} from 'lucide-react';
import { db, formatDateVN, getCurrentDateISO } from '../services/db';
import { exportMonthlyComprehensiveReportExcel } from '../services/excelService';
import { downloadWordDoc } from '../services/printA4Service';
import { templateConfigService } from '../services/templateConfigService';

export const ComprehensiveReports: React.FC = () => {
  const [dbTick, setDbTick] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const visits = db.getClinicVisits();
    if (visits.length > 0 && visits[0].visitDate) {
      return visits[0].visitDate.substring(0, 7);
    }
    return getCurrentDateISO().substring(0, 7);
  });
  const [reportType, setReportType] = useState<'monthly' | 'by_class'>('monthly');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setDbTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(getCurrentDateISO().substring(0, 7));
    for (const v of db.getClinicVisits()) {
      if (v.visitDate && v.visitDate.length >= 7) {
        monthSet.add(v.visitDate.substring(0, 7));
      }
    }
    for (const tx of db.getTransactions('export')) {
      if (tx.status !== 'cancelled' && tx.date && tx.date.length >= 7) {
        monthSet.add(tx.date.substring(0, 7));
      }
    }
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [dbTick]);

  const monthlyReport = useMemo(() => {
    return db.getMonthlyClinicReport(selectedMonth);
  }, [selectedMonth, dbTick]);

  const classStats = useMemo(() => {
    return db.getSchoolClasses().map((c) => {
      const stats = db.getClassClinicStats(c.name);
      return {
        className: c.name,
        grade: c.grade,
        visitCount: stats.totalVisits,
        topReasons: stats.topReasons.slice(0, 3).map((r) => r.reason),
      };
    });
  }, [selectedMonth, dbTick]);

  // Export Monthly Report to Excel (.xlsx)
  const handleExportMonthlyExcel = () => {
    try {
      exportMonthlyComprehensiveReportExcel(selectedMonth, monthlyReport, classStats);
      setNotification({ type: 'success', message: 'Đã xuất file báo cáo tổng hợp Excel (.xlsx) thành công!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      setNotification({ type: 'error', message: 'Có lỗi xảy ra khi tạo tệp Excel. Vui lòng thử lại.' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Export Monthly Report to Microsoft Word (.doc)
  const handleExportMonthlyWord = () => {
    try {
      const cfg = templateConfigService.getConfig();
      const dateStr = templateConfigService.getDateString(cfg);
      const content = `
        <table class="header-table">
          <tr>
            <td class="header-left">
              <div class="unit-name">${cfg.governingBody}</div>
              <div class="school-name">${cfg.schoolName}</div>
              <div>${cfg.department}</div>
              <div class="divider-line"></div>
            </td>
            <td class="header-right">
              <div class="national-title">${cfg.nationalTitle}</div>
              <div class="national-motto">${cfg.nationalMotto}</div>
              <div class="divider-line"></div>
              <div style="font-style: italic; font-size: 10pt; margin-top: 4px;">${dateStr}</div>
            </td>
          </tr>
        </table>

        <div class="doc-title">BÁO CÁO CÔNG TÁC Y TẾ HỌC ĐƯỜNG THÁNG ${selectedMonth}</div>
        <div class="doc-subtitle">Năm học: ${cfg.academicYear} • Đơn vị: ${cfg.schoolName}</div>

        <div style="font-size: 11pt; line-height: 1.6; margin-top: 15pt;">
          <p><strong>I. TỔNG HỢP LƯỢT KHÁM & SƠ CỨU BAN ĐẦU:</strong></p>
          <ul style="padding-left: 20px;">
            <li>Tổng số lượt học sinh đến phòng y tế: <strong>${monthlyReport.totalVisits}</strong> lượt.</li>
            <li>Số ca đã ổn định cho về lớp học: <strong>${monthlyReport.outcomes['Đã ổn định cho về lớp'] || 0}</strong> ca.</li>
            <li>Số ca bàn giao phụ huynh đón về theo dõi: <strong>${monthlyReport.outcomes['Bàn giao phụ huynh đón về'] || 0}</strong> ca.</li>
            <li>Số ca sơ cứu chuyển cơ sở y tế tuyến trên: <strong>${monthlyReport.outcomes['Chuyển cơ sở y tế tuyến trên'] || 0}</strong> ca.</li>
            <li>Số sự cố y tế / tai nạn thương tích học đường: <strong>${monthlyReport.healthEventsCount}</strong> vụ việc.</li>
          </ul>

          <p style="margin-top: 12pt;"><strong>II. CƠ CẤU LÝ DO ĐẾN PHÒNG Y TẾ:</strong></p>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Lý do đến khám / Triệu chứng</th>
                <th style="width: 100px;">Số lượt</th>
                <th style="width: 100px;">Tỷ lệ (%)</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(monthlyReport.byReason)
                .map(
                  ([reason, count], idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${reason}</strong></td>
                  <td class="text-center font-bold">${count}</td>
                  <td class="text-center">${Math.round((Number(count) / (monthlyReport.totalVisits || 1)) * 100)}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <p style="margin-top: 12pt;"><strong>III.1. TỔNG HỢP THUỐC ĐÃ XUẤT CẤP PHÁT TRONG THÁNG:</strong></p>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên thuốc / Biệt dược</th>
                <th style="width: 90px;">Số lô</th>
                <th style="width: 80px;">Số lượng</th>
                <th style="width: 60px;">ĐVT</th>
              </tr>
            </thead>
            <tbody>
              ${
                monthlyReport.medicinesOnlySummary.length === 0
                  ? '<tr><td colspan="5" class="text-center">Chưa có thuốc xuất cấp phát trong tháng này.</td></tr>'
                  : monthlyReport.medicinesOnlySummary
                      .map(
                        (m, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${m.medicineName}</strong></td>
                  <td class="text-center font-mono">${m.batchNumber}</td>
                  <td class="text-center font-bold">${m.quantity}</td>
                  <td class="text-center">${m.unit}</td>
                </tr>
              `
                      )
                      .join('')
              }
            </tbody>
          </table>

          <p style="margin-top: 12pt;"><strong>III.2. TỔNG HỢP VẬT TƯ Y TẾ ĐÃ XUẤT / TIÊU HAO TRONG THÁNG:</strong></p>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên vật tư y tế</th>
                <th style="width: 90px;">Số lô / Kho</th>
                <th style="width: 80px;">Số lượng</th>
                <th style="width: 60px;">ĐVT</th>
              </tr>
            </thead>
            <tbody>
              ${
                monthlyReport.suppliesBatchSummary.length === 0
                  ? '<tr><td colspan="5" class="text-center">Chưa có vật tư y tế tiêu hao trong tháng này.</td></tr>'
                  : monthlyReport.suppliesBatchSummary
                      .map(
                        (s, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${s.supplyName}</strong></td>
                  <td class="text-center font-mono">${s.batchNumber}</td>
                  <td class="text-center font-bold">${s.quantity}</td>
                  <td class="text-center">${s.unit}</td>
                </tr>
              `
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>

        <table class="signatures-table" style="width: 100%; margin-top: 30pt; border-collapse: collapse;">
          <tr>
            <td style="text-align: center; vertical-align: top; width: 50%;">
              <div class="signature-title">${cfg.signatory1Title}</div>
              <div class="signature-sub">${cfg.signatory1Sub}</div>
              <div class="signature-space" style="height: 60pt;"></div>
              <div class="signature-name">${cfg.signatory1Name}</div>
            </td>
            <td style="text-align: center; vertical-align: top; width: 50%;">
              <div class="signature-title">${cfg.signatory2Title}</div>
              <div class="signature-sub">${cfg.signatory2Sub}</div>
              <div class="signature-space" style="height: 60pt;"></div>
              <div class="signature-name">${cfg.signatory2Name}</div>
            </td>
          </tr>
        </table>
      `;

      downloadWordDoc(content, `Bao_Cao_Y_Te_Thang_${selectedMonth}_${cfg.schoolName.replace(/\s+/g, '_')}`);
      setNotification({ type: 'success', message: 'Đã xuất file Word (.doc) thành công! Quý Thầy/Cô có thể mở trong Microsoft Word để chỉnh sửa.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Lỗi xuất Word:', err);
      setNotification({ type: 'error', message: 'Có lỗi khi tạo tệp Word. Vui lòng thử lại.' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              BÁO CÁO TỔNG HỢP
            </span>
            <h1 className="text-xl font-bold text-slate-900">Báo Cáo Công Tác Y Tế Học Đường</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trường THCS Đông Thạnh • Thống kê định kỳ hàng tháng phục vụ báo cáo Ban Giám Hiệu & Phòng GD&ĐT
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Chọn tháng:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
            />
            {availableMonths.length > 1 && (
              <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                {availableMonths.slice(0, 4).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      selectedMonth === m
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {m.split('-')[1]}/{m.split('-')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In A4</span>
          </button>

          <button
            id="btn-export-monthly-word"
            onClick={handleExportMonthlyWord}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Tải xuống tệp Microsoft Word (.doc) cho phép chỉnh sửa toàn bộ báo cáo"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất Word (.doc)</span>
          </button>

          <button
            id="btn-export-monthly-excel"
            onClick={handleExportMonthlyExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Tải xuống tệp Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setReportType('monthly')}
          className={`flex items-center gap-2 pb-3 font-bold text-xs border-b-2 transition-colors ${
            reportType === 'monthly'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Báo cáo tháng toàn trường</span>
        </button>

        <button
          onClick={() => setReportType('by_class')}
          className={`flex items-center gap-2 pb-3 font-bold text-xs border-b-2 transition-colors ${
            reportType === 'by_class'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Thống kê phân bổ theo lớp học</span>
        </button>
      </div>

      {reportType === 'monthly' ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <p className="text-xs font-medium text-[#64748B]">Tổng số lượt khám</p>
              <p className="text-2xl font-bold text-[#17324D] mt-1 tabular-nums">{monthlyReport.totalVisits}</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Trong tháng {selectedMonth}</p>
            </div>

            <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0]">
              <p className="text-xs font-semibold text-[#15803D]">Đã ổn định về lớp</p>
              <p className="text-2xl font-bold text-[#15803D] mt-1 tabular-nums">
                {monthlyReport.outcomes['Đã ổn định cho về lớp'] || 0}
              </p>
              <p className="text-[11px] text-[#15803D] mt-0.5">Xử trí sơ cứu thành công</p>
            </div>

            <div className="bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A]">
              <p className="text-xs font-semibold text-[#B45309]">Phụ huynh đón về</p>
              <p className="text-2xl font-bold text-[#B45309] mt-1 tabular-nums">
                {monthlyReport.outcomes['Bàn giao phụ huynh đón về'] || 0}
              </p>
              <p className="text-[11px] text-[#B45309] mt-0.5">Cần nghỉ ngơi tại nhà</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0]">
              <p className="text-xs font-medium text-[#64748B]">Chuyển viện / Tai nạn</p>
              <p className="text-2xl font-bold text-[#17324D] mt-1 tabular-nums">
                {(monthlyReport.outcomes['Chuyển cơ sở y tế tuyến trên'] || 0) + monthlyReport.healthEventsCount}
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Chuyển tuyến trên / Sự cố</p>
            </div>
          </div>

          {/* Breakdown by Reason & Medicines Used */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reasons breakdown */}
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] space-y-4">
              <h3 className="font-bold text-sm text-[#17324D]">Cơ Cấu Lý Do Đến Phòng Y Tế</h3>
              <div className="space-y-2.5">
                {Object.entries(monthlyReport.byReason).length === 0 ? (
                  <p className="text-xs text-[#64748B] py-6 text-center">Không có ca khám trong tháng này.</p>
                ) : (
                  Object.entries(monthlyReport.byReason).map(([reason, count]) => {
                    const numCount = Number(count);
                    const pct = Math.round((numCount / (monthlyReport.totalVisits || 1)) * 100);
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-[#1E293B]">{reason}</span>
                          <span className="text-[#17324D] font-semibold tabular-nums">
                            {numCount} lượt ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#F5F7FA] h-2 rounded-full overflow-hidden">
                          <div className="bg-[#147D80] h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Separated Sections: 1. Thuốc (Dược phẩm) & 2. Vật tư y tế tiêu hao */}
            <div className="space-y-5">
              {/* Phần 1: Thuốc đã xuất cấp phát */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#F5F7FA] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EAF5F4] text-[#147D80] flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17324D]">
                        1. Tổng Hợp Thuốc Đã Xuất Cấp Phát
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Dược phẩm điều trị & sơ cứu học sinh theo lô FEFO
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#EAF5F4] text-[#147D80] border border-[#B2D8D6] tabular-nums shrink-0">
                    {monthlyReport.medicinesOnlySummary.length} lô thuốc •{' '}
                    {monthlyReport.medicinesOnlySummary.reduce((sum, m) => sum + m.quantity, 0)} ĐV
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F7FA] text-[#64748B] border-b border-[#E2E8F0] uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên thuốc / Biệt dược</th>
                        <th className="py-2.5 px-3 text-center">Số lô</th>
                        <th className="py-2.5 px-3 text-right">Tổng số lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {monthlyReport.medicinesOnlySummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#64748B]">
                            Chưa có thuốc xuất cấp phát trong tháng này.
                          </td>
                        </tr>
                      ) : (
                        monthlyReport.medicinesOnlySummary.map((m, idx) => (
                          <tr key={`${m.medicineName}-${m.batchNumber}-${idx}`} className="hover:bg-[#F5F7FA] transition-colors">
                            <td className="py-2.5 px-3 text-center text-[#64748B] tabular-nums">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{m.medicineName}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-[#64748B] tabular-nums">
                              <span className="px-1.5 py-0.5 bg-[#F5F7FA] rounded border border-[#E2E8F0] text-[11px]">
                                {m.batchNumber || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#147D80] tabular-nums">
                              {m.quantity} <span className="font-medium text-[#64748B]">{m.unit}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phần 2: Vật tư y tế đã xuất / tiêu hao */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#F5F7FA] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                      <BriefcaseMedical className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17324D]">
                        2. Tổng Hợp Vật Tư Y Tế Đã Xuất / Tiêu Hao
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Bông, băng, gạc và vật tư sơ cứu tiêu hao tại Phòng Y tế
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] tabular-nums shrink-0">
                    {monthlyReport.suppliesBatchSummary.length} loại vật tư •{' '}
                    {monthlyReport.suppliesBatchSummary.reduce((sum, s) => sum + s.quantity, 0)} ĐV
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F7FA] text-[#64748B] border-b border-[#E2E8F0] uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên vật tư y tế</th>
                        <th className="py-2.5 px-3 text-center">Số lô / Kho</th>
                        <th className="py-2.5 px-3 text-right">Tổng số lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {monthlyReport.suppliesBatchSummary.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#64748B]">
                            Chưa có vật tư y tế tiêu hao trong tháng này.
                          </td>
                        </tr>
                      ) : (
                        monthlyReport.suppliesBatchSummary.map((s, idx) => (
                          <tr key={`${s.supplyName}-${s.batchNumber}-${idx}`} className="hover:bg-[#F5F7FA] transition-colors">
                            <td className="py-2.5 px-3 text-center text-[#64748B] tabular-nums">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{s.supplyName}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-[#64748B] tabular-nums">
                              <span className="px-1.5 py-0.5 bg-[#F5F7FA] rounded border border-[#E2E8F0] text-[11px]">
                                {s.batchNumber || 'KHO-VT'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#17324D] tabular-nums">
                              {s.quantity} <span className="font-medium text-[#64748B]">{s.unit}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Breakdown by Class */
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 bg-[#F5F7FA] border-b border-[#E2E8F0]">
            <h3 className="font-bold text-xs uppercase text-[#17324D]">
              Thống Kê Lượt Khám Phân Bổ Theo Lớp (Tháng {selectedMonth})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white text-[#64748B] border-b border-[#E2E8F0] uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Khối</th>
                  <th className="py-3 px-4 text-right">Số lượt vào phòng y tế</th>
                  <th className="py-3 px-4">Các lý do chính</th>
                  <th className="py-3 px-4">Đánh giá nguy cơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {classStats.map((item) => (
                  <tr key={item.className} className="hover:bg-[#F5F7FA]">
                    <td className="py-3 px-4 font-bold text-[#17324D]">{item.className}</td>
                    <td className="py-3 px-4 text-[#64748B]">Khối {item.grade}</td>
                    <td className="py-3 px-4 text-right font-bold text-[#17324D] text-sm tabular-nums">{item.visitCount}</td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {item.topReasons.length > 0 ? item.topReasons.join(', ') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {item.visitCount >= 4 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Cần lưu ý theo dõi lớp</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                          Bình thường
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
