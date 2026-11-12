import React, { useState, useMemo, useEffect } from 'react';
import {
  Pill,
  Search,
  Download,
  Printer,
  Calendar,
  Filter,
  User,
  Boxes,
  Layers,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  BriefcaseMedical,
} from 'lucide-react';
import { db, formatDateVN, formatDateTimeVN, formatTime24H, getCurrentDateISO, isMedicalSupplyItem } from '../services/db';
import { exportMedicationUsageExcel, getFilenameDate } from '../services/excelService';

interface MedicationUsageReportProps {
  onSelectStudent?: (studentId: string) => void;
}

export const MedicationUsageReport: React.FC<MedicationUsageReportProps> = ({ onSelectStudent }) => {
  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const unsub = db.subscribe(() => setDbTick((t) => t + 1));
    return () => unsub();
  }, []);

  const visits = db.getClinicVisits();
  const medicines = db.getMedicines();
  const supplies = db.getSupplies();
  const classes = db.getSchoolClasses();
  const exportTransactions = db.getTransactions('export');

  // Filters
  const [selectedMedId, setSelectedMedId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten usage items (bao gồm cả thuốc cấp phát ca khám VÀ vật tư y tế tiêu hao)
  const usageItems = useMemo(() => {
    const list: Array<{
      visitId: string;
      visitCode: string;
      dateTime: string;
      monthKey: string;
      rawSortTime: number;
      studentId: string;
      studentCode: string;
      studentName: string;
      className: string;
      medicineId: string;
      medicineCode: string;
      medicineName: string;
      batchNumber?: string;
      expDate?: string;
      quantity: number;
      unit: string;
      dosageInstructions?: string;
      reason: string;
      performer: string;
    }> = [];

    const visitTxIds = new Set(visits.map((v) => v.inventoryTransactionId).filter(Boolean));

    visits.forEach((v) => {
      const meds = v.medicinesUsed || v.medicinesDispensed || [];
      const sups = v.suppliesUsed || [];
      if (meds.length === 0 && sups.length === 0) return;
      const vDate = v.dateTime
        ? formatDateTimeVN(v.dateTime)
        : (v.visitDate ? `${v.timeIn ? formatTime24H(v.timeIn) + ' ' : ''}${formatDateVN(v.visitDate)}` : '—');
      const rawIsoDate = v.visitDate || (v.dateTime ? v.dateTime.split('T')[0] : '');
      const monthKey = rawIsoDate && rawIsoDate.length >= 7 ? rawIsoDate.substring(0, 7) : '';
      const rawSortTime = new Date(v.createdAt || v.dateTime || v.visitDate || 0).getTime() || 0;
      const vReason = (v.reasons && v.reasons.length > 0 ? v.reasons.join(', ') : v.customReason) || v.reason || '';

      meds.forEach((m) => {
        list.push({
          visitId: v.id,
          visitCode: v.visitCode,
          dateTime: vDate,
          monthKey,
          rawSortTime,
          studentId: v.studentId,
          studentCode: v.studentCode,
          studentName: v.studentName,
          className: v.className,
          medicineId: m.medicineId,
          medicineCode: m.medicineCode || '',
          medicineName: m.medicineName,
          batchNumber: m.batchNumber,
          expDate: m.expDate,
          quantity: m.quantity,
          unit: m.unit,
          dosageInstructions: m.dosageInstructions,
          reason: vReason,
          performer: v.performer,
        });
      });

      sups.forEach((s) => {
        list.push({
          visitId: v.id,
          visitCode: v.visitCode,
          dateTime: vDate,
          monthKey,
          rawSortTime,
          studentId: v.studentId,
          studentCode: v.studentCode,
          studentName: v.studentName,
          className: v.className,
          medicineId: s.supplyId,
          medicineCode: 'VT-YTE',
          medicineName: s.supplyName,
          batchNumber: 'KHO-VT',
          expDate: undefined,
          quantity: s.quantity,
          unit: s.unit,
          dosageInstructions: 'Vật tư sơ cứu',
          reason: vReason,
          performer: v.performer,
        });
      });
    });

    exportTransactions.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      if (
        String(tx.id).startsWith('tx-disp-') ||
        String(tx.purpose || '').includes('Xuất hủy') ||
        String(tx.purpose || '').includes('BB-HUY')
      ) {
        return;
      }
      if (
        !visitTxIds.has(tx.id) &&
        String(tx.purpose || '').includes('Cấp phát phòng y tế - Ca khám')
      ) {
        return;
      }
      if (visitTxIds.has(tx.id) && tx.purpose !== 'Tiêu hao vật tư y tế') return;
      const monthKey = tx.date && tx.date.length >= 7 ? tx.date.substring(0, 7) : '';
      const rawSortTime = new Date(tx.createdAt || tx.date || 0).getTime() || 0;
      (tx.items || []).forEach((item) => {
        list.push({
          visitId: tx.id,
          visitCode: tx.transactionCode,
          dateTime: tx.date,
          monthKey,
          rawSortTime,
          studentId: '',
          studentCode: tx.recipientType === 'student' ? 'HS' : 'YT',
          studentName: tx.recipientName || 'Phòng Y Tế (Tiêu hao vật tư)',
          className: tx.recipientClass || 'Phòng Y tế',
          medicineId: item.medicineId,
          medicineCode: item.medicineCode || '',
          medicineName: item.medicineName,
          batchNumber: item.batchNumber || 'KHO-VT',
          expDate: item.expDate,
          quantity: item.quantity,
          unit: item.unit,
          dosageInstructions: tx.purpose || 'Tiêu hao vật tư y tế',
          reason: tx.purpose || 'Tiêu hao vật tư y tế',
          performer: tx.performer,
        });
      });
    });

    return list.sort((a, b) => b.rawSortTime - a.rawSortTime);
  }, [visits, exportTransactions, dbTick]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(getCurrentDateISO().substring(0, 7));
    usageItems.forEach((it) => {
      if (it.monthKey) set.add(it.monthKey);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [usageItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return usageItems.filter((item) => {
      if (selectedMonth !== 'all' && item.monthKey !== selectedMonth) return false;
      if (selectedMedId !== 'all' && item.medicineId !== selectedMedId) return false;
      if (selectedClass !== 'all' && item.className !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchMed = item.medicineName.toLowerCase().includes(q);
        const matchBatch = item.batchNumber?.toLowerCase().includes(q);
        const matchCode = item.studentCode.toLowerCase().includes(q) || item.visitCode.toLowerCase().includes(q);
        if (!matchName && !matchMed && !matchBatch && !matchCode) return false;
      }
      return true;
    });
  }, [usageItems, selectedMonth, selectedMedId, selectedClass, searchQuery]);

  // Separate filtered items into 1. Thuốc (Dược phẩm) and 2. Vật tư y tế
  const { filteredMedicineItems, filteredSupplyItems } = useMemo(() => {
    const medsList: typeof filteredItems = [];
    const supsList: typeof filteredItems = [];
    filteredItems.forEach((item) => {
      if (
        isMedicalSupplyItem({
          medicineId: item.medicineId,
          medicineCode: item.medicineCode,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          reason: item.reason,
        })
      ) {
        supsList.push(item);
      } else {
        medsList.push(item);
      }
    });
    return { filteredMedicineItems: medsList, filteredSupplyItems: supsList };
  }, [filteredItems]);

  // Summary aggregation by medicine vs supply
  const medSummary = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; totalQty: number; times: number; isSupply: boolean }>();
    filteredItems.forEach((item) => {
      const isSup = isMedicalSupplyItem({
        medicineId: item.medicineId,
        medicineCode: item.medicineCode,
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        reason: item.reason,
      });
      const cur = map.get(item.medicineName) || {
        name: item.medicineName,
        unit: item.unit,
        totalQty: 0,
        times: 0,
        isSupply: isSup,
      };
      cur.totalQty += item.quantity;
      cur.times += 1;
      map.set(item.medicineName, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredItems]);

  const pureMedSummary = useMemo(() => medSummary.filter((m) => !m.isSupply), [medSummary]);
  const supplySummary = useMemo(() => medSummary.filter((m) => m.isSupply), [medSummary]);

  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Export Excel (.xlsx) chuẩn dữ liệu dược học đường
  const handleExportExcel = () => {
    try {
      let filterText = `Toàn bộ ${filteredItems.length} lượt cấp phát`;
      if (selectedMedId !== 'all') {
        const med = medicines.find((m) => m.id === selectedMedId);
        filterText = `Thuốc: ${med?.name || selectedMedId}`;
      }
      if (selectedClass !== 'all') {
        filterText += ` • Lớp: ${selectedClass}`;
      }

      exportMedicationUsageExcel(filteredItems, filterText);
      setExportNotification(
        `Đã xuất file Excel: Bao_Cao_Thuoc_Su_Dung_THCS_Dong_Thanh_${getFilenameDate()}.xlsx thành công!`
      );
      setTimeout(() => setExportNotification(null), 5000);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      setExportNotification('Có lỗi xảy ra khi tạo tệp Excel. Đang thử lại...');
      setTimeout(() => setExportNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              SỔ THEO DÕI DƯỢC & VẬT TƯ
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Sổ Theo Dõi Thuốc & Vật Tư Y Tế Đã Sử Dụng / Tiêu Hao
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trường THCS Đông Thạnh • Theo dõi chi tiết thuốc cấp phát và vật tư y tế tiêu hao theo kỳ / báo cáo tháng và số lô FEFO
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-print-medication-report"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In báo cáo</span>
          </button>
          <button
            id="btn-export-medication-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Tải xuống tệp bảng tính Microsoft Excel (.xlsx) chuẩn A4"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {exportNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2.5 font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* Summary Cards by Top Medicines & Supplies */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {medSummary.slice(0, 4).map((med, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 truncate max-w-[130px]">{med.name}</span>
              <Pill className="w-4 h-4 text-emerald-700 shrink-0" />
            </div>
            <p className="text-xl font-bold text-emerald-800 mt-1">
              {med.totalQty}{' '}
              <span className="text-xs font-normal text-slate-500">{med.unit}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Đã xuất / tiêu hao qua {med.times} lượt</p>
          </div>
        ))}
      </div>

      {/* Filter Bar & Month Report Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-1">Báo cáo tháng:</span>
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả các tháng
            </button>
            {availableMonths.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedMonth === m
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tháng {m.split('-')[1]}/{m.split('-')[0]}
              </button>
            ))}
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || 'all')}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50 text-slate-800 cursor-pointer"
            />
          </div>
          <span className="text-xs text-slate-500">
            Kỳ đang xem:{' '}
            <strong className="text-emerald-800">
              {selectedMonth === 'all'
                ? 'Toàn bộ các tháng'
                : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo học sinh, thuốc, vật tư, số lô..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">Tất cả thuốc & vật tư y tế</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
              {supplies.map((s) => (
                <option key={s.id} value={s.id}>
                  [Vật tư] {s.name} ({s.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">Tất cả các lớp / Phòng Y tế</option>
              <option value="Phòng Y tế">Phòng Y tế (Tiêu hao vật tư)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  Lớp {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
          <span>
            Tìm thấy <strong>{filteredItems.length}</strong> dòng cấp phát thuốc & tiêu hao vật tư
          </span>
          {(selectedMonth !== 'all' || selectedMedId !== 'all' || selectedClass !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedMonth('all');
                setSelectedMedId('all');
                setSelectedClass('all');
                setSearchQuery('');
              }}
              className="text-emerald-700 hover:text-emerald-800 font-medium underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Bảng Tổng Hợp Báo Cáo Tháng Tách Riêng 2 Phần: 1. Thuốc & 2. Vật Tư Y Tế */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Phần 1: Tổng hợp Thuốc đã sử dụng */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase text-slate-900">
                  1. Tổng Hợp Thuốc Đã Xuất Cấp Phát
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedMonth === 'all'
                    ? 'Toàn bộ các tháng'
                    : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
              {pureMedSummary.length} loại thuốc • {pureMedSummary.reduce((s, m) => s + m.totalQty, 0)} ĐV
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Tên thuốc / Biệt dược</th>
                  <th className="py-2.5 px-3 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 text-center">Số lượt cấp</th>
                  <th className="py-2.5 px-3 text-right">Tổng số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pureMedSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Chưa có dữ liệu thuốc xuất cấp phát trong kỳ đã chọn.
                    </td>
                  </tr>
                ) : (
                  pureMedSummary.map((m, idx) => (
                    <tr key={m.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2 px-3 text-center text-slate-600">{m.unit}</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-700 tabular-nums">{m.times} lượt</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                        {m.totalQty} {m.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phần 2: Tổng hợp Vật tư y tế tiêu hao */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <BriefcaseMedical className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase text-slate-900">
                  2. Tổng Hợp Vật Tư Y Tế Đã Xuất / Tiêu Hao
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedMonth === 'all'
                    ? 'Toàn bộ các tháng'
                    : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 tabular-nums">
              {supplySummary.length} loại vật tư • {supplySummary.reduce((s, m) => s + m.totalQty, 0)} ĐV
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">STT</th>
                  <th className="py-2.5 px-3">Tên vật tư y tế</th>
                  <th className="py-2.5 px-3 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 text-center">Số lượt tiêu hao</th>
                  <th className="py-2.5 px-3 text-right">Tổng số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplySummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Chưa có dữ liệu vật tư y tế tiêu hao trong kỳ đã chọn.
                    </td>
                  </tr>
                ) : (
                  supplySummary.map((m, idx) => (
                    <tr key={m.name} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2 px-3 text-center text-slate-600">{m.unit}</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-700 tabular-nums">{m.times} lượt</td>
                      <td className="py-2 px-3 text-right font-bold text-sky-700 tabular-nums">
                        {m.totalQty} {m.unit}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chi Tiết Phần 1: Sổ Cấp Phát Thuốc (Dược Phẩm) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-xs uppercase text-slate-800">
              Phần 1: Nhật Ký Chi Tiết Cấp Phát Thuốc (Dược Phẩm)
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 tabular-nums">
            {filteredMedicineItems.length} lượt cấp thuốc
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Học sinh / Người nhận</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Tên thuốc / Biệt dược</th>
                <th className="py-3 px-3">Số lượng</th>
                <th className="py-3 px-3">Số lô (FEFO)</th>
                <th className="py-3 px-3">Hạn dùng</th>
                <th className="py-3 px-3">Lý do / Triệu chứng</th>
                <th className="py-3 px-3">Cán bộ y tế</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicineItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có dữ liệu cấp phát thuốc trong kỳ đã chọn.
                  </td>
                </tr>
              ) : (
                filteredMedicineItems.map((item, idx) => (
                  <tr key={`med-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDateTimeVN(item.dateTime)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <button
                        onClick={() => onSelectStudent?.(item.studentId)}
                        className="hover:text-emerald-700 hover:underline text-left"
                      >
                        {item.studentName}
                        <span className="text-[10px] text-slate-400 block font-mono">{item.studentCode}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-800">{item.className}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.medicineName}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {item.batchNumber || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {item.expDate ? formatDateVN(item.expDate) : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">{item.performer}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chi Tiết Phần 2: Sổ Tiêu Hao Vật Tư Y Tế */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BriefcaseMedical className="w-4 h-4 text-sky-700" />
            <h3 className="font-bold text-xs uppercase text-slate-800">
              Phần 2: Nhật Ký Chi Tiết Xuất / Tiêu Hao Vật Tư Y Tế
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 tabular-nums">
            {filteredSupplyItems.length} lượt tiêu hao vật tư
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Người nhận / Đơn vị</th>
                <th className="py-3 px-3">Lớp / Phòng</th>
                <th className="py-3 px-3">Tên vật tư y tế</th>
                <th className="py-3 px-3">Số lượng</th>
                <th className="py-3 px-3">Số lô / Kho</th>
                <th className="py-3 px-3">Hạn dùng</th>
                <th className="py-3 px-3">Mục đích sử dụng</th>
                <th className="py-3 px-3">Cán bộ y tế</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSupplyItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có dữ liệu tiêu hao vật tư y tế trong kỳ đã chọn.
                  </td>
                </tr>
              ) : (
                filteredSupplyItems.map((item, idx) => (
                  <tr key={`sup-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDateTimeVN(item.dateTime)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {item.studentName}
                      <span className="text-[10px] text-slate-400 block font-mono">{item.studentCode}</span>
                    </td>
                    <td className="py-3 px-3 font-bold text-sky-800">{item.className}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.medicineName}</td>
                    <td className="py-3 px-3 font-bold text-sky-700 whitespace-nowrap tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {item.batchNumber || 'KHO-VT'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {item.expDate ? formatDateVN(item.expDate) : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">{item.performer}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
