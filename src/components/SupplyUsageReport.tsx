import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BriefcaseMedical,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { db, formatDateTimeVN, formatDateVN, formatTime24H, getCurrentDateISO, isMedicalSupplyItem } from '../services/db';
import { exportSupplyUsageExcel, getFilenameDate } from '../services/excelService';

interface SupplyUsageRowItem {
  rowKey: string;
  sourceType: 'visit' | 'transaction';
  recordId: string;
  itemIndex: number;
  batchId?: string;
  visitId: string;
  visitCode: string;
  dateTime: string;
  monthKey: string;
  rawSortTime: number;
  studentName: string;
  studentCode: string;
  className: string;
  supplyId: string;
  supplyName: string;
  quantity: number;
  unit: string;
  reason: string;
  performer: string;
}

export const SupplyUsageReport: React.FC = () => {
  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const unsub = db.subscribe(() => setDbTick((t) => t + 1));
    return () => unsub();
  }, []);

  const visits = db.getClinicVisits();
  const supplies = db.getSupplies();
  const classes = db.getSchoolClasses();
  const exportTransactions = db.getTransactions('export');
  const allWarehouseMedicines = useMemo(() => db.getMedicines(), [dbTick]);
  const consumableCatalog = useMemo(() => db.getConsumableSupplyCatalog(), [dbTick, allWarehouseMedicines]);
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);

  // State cho phần "Nhập tiêu hao vật tư y tế"
  const [consumptionDate, setConsumptionDate] = useState<string>(() => getCurrentDateISO());
  const [consumptionItemId, setConsumptionItemId] = useState<string>('');
  const [consumptionQtyInput, setConsumptionQtyInput] = useState<string>('');
  const [consumptionError, setConsumptionError] = useState<string | null>(null);
  const [consumptionSuccess, setConsumptionSuccess] = useState<string | null>(null);
  const [lastCreatedSlip, setLastCreatedSlip] = useState<{
    txId: string;
    txCode: string;
    supplyId: string;
    supplyName: string;
    quantity: number;
    unit: string;
  } | null>(null);
  const [isSubmittingConsumption, setIsSubmittingConsumption] = useState<boolean>(false);
  const submitLockRef = useRef<boolean>(false);

  // State cho xóa khi nhập sai
  const [isDeletingItem, setIsDeletingItem] = useState<boolean>(false);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const deleteLockRef = useRef<boolean>(false);

  const selectedCatalogItem = useMemo(
    () => consumableCatalog.find((item) => item.id === consumptionItemId) || null,
    [consumableCatalog, consumptionItemId]
  );

  const handleCancelConsumption = () => {
    setConsumptionDate(getCurrentDateISO());
    setConsumptionItemId('');
    setConsumptionQtyInput('');
    setConsumptionError(null);
  };

  const handleSaveConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmittingConsumption) return;

    setConsumptionError(null);
    setConsumptionSuccess(null);

    if (!consumptionDate.trim()) {
      setConsumptionError('Vui lòng chọn ngày sử dụng.');
      return;
    }
    if (!consumptionItemId) {
      setConsumptionError('Vui lòng chọn vật tư từ danh mục hiện có.');
      return;
    }
    const rawQty = consumptionQtyInput.trim();
    if (!rawQty) {
      setConsumptionError('Vui lòng nhập số lượng tiêu hao.');
      return;
    }
    const parsedQty = Number(rawQty);
    if (!Number.isFinite(parsedQty) || !Number.isInteger(parsedQty) || parsedQty <= 0) {
      setConsumptionError('Số lượng tiêu hao phải là số nguyên lớn hơn 0.');
      return;
    }

    // Kiểm tra lại tồn kho thực tế ngay tại thời điểm lưu
    const freshCatalog = db.getConsumableSupplyCatalog();
    const freshItem = freshCatalog.find((it) => it.id === consumptionItemId);
    if (!freshItem) {
      setConsumptionError('Không tìm thấy vật tư đã chọn trong danh mục hiện có.');
      return;
    }
    if (parsedQty > freshItem.currentStock) {
      setConsumptionError(
        `Số lượng tiêu hao (${parsedQty} ${freshItem.unit}) vượt quá số lượng tồn thực tế hiện tại (${freshItem.currentStock} ${freshItem.unit}).`
      );
      return;
    }

    submitLockRef.current = true;
    setIsSubmittingConsumption(true);
    try {
      const tx = db.recordSupplyConsumption({
        date: consumptionDate.trim(),
        itemId: consumptionItemId,
        quantity: parsedQty,
      });
      const updatedCatalog = db.getConsumableSupplyCatalog();
      const updatedItem = updatedCatalog.find((it) => it.id === consumptionItemId);
      const remainingStock = updatedItem ? updatedItem.currentStock : freshItem.currentStock - parsedQty;

      setConsumptionQtyInput('');
      setLastCreatedSlip({
        txId: tx.id,
        txCode: tx.transactionCode,
        supplyId: freshItem.id,
        supplyName: freshItem.name,
        quantity: parsedQty,
        unit: freshItem.unit,
      });
      setConsumptionSuccess(
        `Đã lưu phiếu tiêu hao ${tx.transactionCode}: trừ ${parsedQty} ${freshItem.unit} "${freshItem.name}". Tồn kho còn lại: ${remainingStock} ${freshItem.unit}.`
      );
    } catch (err: any) {
      setConsumptionError(err?.message || 'Không thể lưu phiếu tiêu hao vật tư.');
    } finally {
      submitLockRef.current = false;
      setIsSubmittingConsumption(false);
    }
  };

  // Xử lý xóa trực tiếp phiếu/mục tiêu hao khi nhập sai và hoàn trả tồn kho ngay lập tức
  const handleDeleteConsumptionItem = (item: SupplyUsageRowItem) => {
    if (!item || deleteLockRef.current || isDeletingItem) return;

    deleteLockRef.current = true;
    setIsDeletingItem(true);
    setDeletingRowKey(item.rowKey);
    setConsumptionError(null);
    setConsumptionSuccess(null);

    try {
      const res = db.deleteSupplyConsumption({
        sourceType: item.sourceType,
        recordId: item.recordId,
        supplyId: item.supplyId,
        batchId: item.batchId,
        itemIndex: item.itemIndex,
      });

      if (lastCreatedSlip && lastCreatedSlip.txId === item.recordId) {
        setLastCreatedSlip(null);
      }

      setConsumptionSuccess(
        `Đã xóa mục tiêu hao (${item.visitCode}) và hoàn trả ${res.restoredQty} ${res.unit} "${res.supplyName}" về kho. Tồn kho hiện tại: ${res.remainingStock} ${res.unit}.`
      );
    } catch (err: any) {
      setConsumptionError(err?.message || 'Không thể xóa mục tiêu hao vật tư.');
    } finally {
      deleteLockRef.current = false;
      setIsDeletingItem(false);
      setDeletingRowKey(null);
    }
  };

  const handleQuickUndoLastSlip = () => {
    if (!lastCreatedSlip || deleteLockRef.current || isDeletingItem) return;
    deleteLockRef.current = true;
    setIsDeletingItem(true);
    setConsumptionError(null);
    try {
      db.deleteTransaction(lastCreatedSlip.txId, true);
      const updatedCatalog = db.getConsumableSupplyCatalog();
      const updatedItem = updatedCatalog.find((c) => c.id === lastCreatedSlip.supplyId);
      const restoredStock = updatedItem ? updatedItem.currentStock : lastCreatedSlip.quantity;
      setConsumptionSuccess(
        `Đã xóa phiếu vừa nhập (${lastCreatedSlip.txCode}) và hoàn trả ${lastCreatedSlip.quantity} ${lastCreatedSlip.unit} "${lastCreatedSlip.supplyName}". Tồn kho hiện tại: ${restoredStock} ${lastCreatedSlip.unit}.`
      );
      setLastCreatedSlip(null);
    } catch (err: any) {
      setConsumptionError(err?.message || 'Không thể xóa phiếu vừa nhập.');
    } finally {
      deleteLockRef.current = false;
      setIsDeletingItem(false);
    }
  };

  // Filters
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten supply usage items (từ ca khám sơ cứu + phiếu xuất/tiêu hao vật tư y tế trong kho)
  const supplyItems = useMemo(() => {
    const list: SupplyUsageRowItem[] = [];

    const supplyIdSet = new Set(consumableCatalog.map((c) => c.id));
    const supplyCodeSet = new Set(consumableCatalog.map((c) => c.code));
    const visitTxIds = new Set(visits.map((v) => v.inventoryTransactionId).filter(Boolean));

    visits.forEach((v) => {
      const vDate = v.dateTime
        ? formatDateTimeVN(v.dateTime)
        : v.visitDate
          ? `${v.timeIn ? formatTime24H(v.timeIn) + ' ' : ''}${formatDateVN(v.visitDate)}`
          : '—';
      const rawIsoDate = v.visitDate || (v.dateTime ? v.dateTime.split('T')[0] : '');
      const monthKey = rawIsoDate && rawIsoDate.length >= 7 ? rawIsoDate.substring(0, 7) : '';
      const sortTime = new Date(v.createdAt || v.dateTime || v.visitDate || 0).getTime() || 0;
      const vReason =
        (v.reasons && v.reasons.length > 0 ? v.reasons.join(', ') : v.customReason) || v.reason || '';

      (v.suppliesUsed || []).forEach((s, sIdx) => {
        list.push({
          rowKey: `visit-${v.id}-${sIdx}-${s.supplyId}`,
          sourceType: 'visit',
          recordId: v.id,
          itemIndex: sIdx,
          visitId: v.id,
          visitCode: v.visitCode,
          dateTime: vDate,
          monthKey,
          rawSortTime: sortTime,
          studentName: v.studentName,
          studentCode: v.studentCode,
          className: v.className,
          supplyId: s.supplyId,
          supplyName: s.supplyName,
          quantity: s.quantity,
          unit: s.unit,
          reason: vReason,
          performer: v.performer,
        });
      });

      // Nếu ca khám không có inventoryTransactionId nhưng có vật tư y tế trong medicinesUsed
      if (!v.inventoryTransactionId) {
        (v.medicinesUsed || v.medicinesDispensed || []).forEach((m, mIdx) => {
          if (!isMedicalSupplyItem(m)) return;
          list.push({
            rowKey: `visit-med-${v.id}-${mIdx}-${m.medicineId}`,
            sourceType: 'visit',
            recordId: v.id,
            itemIndex: mIdx,
            batchId: m.batchId,
            visitId: v.id,
            visitCode: v.visitCode,
            dateTime: vDate,
            monthKey,
            rawSortTime: sortTime,
            studentName: v.studentName,
            studentCode: v.studentCode,
            className: v.className,
            supplyId: m.medicineId,
            supplyName: m.medicineName,
            quantity: m.quantity,
            unit: m.unit,
            reason: vReason,
            performer: v.performer,
          });
        });
      }
    });

    exportTransactions.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      // Không đưa giao dịch xuất hủy thuốc hết hạn (BB-HUY) vào danh sách tiêu hao vật tư sơ cứu
      const isDisposalTx =
        String(tx.id).startsWith('tx-disp-') ||
        String(tx.purpose || '').includes('Xuất hủy') ||
        String(tx.purpose || '').includes('BB-HUY');
      if (isDisposalTx) return;

      const isConsumptionSlip = tx.purpose === 'Tiêu hao vật tư y tế';
      const isClinicVisitTx =
        visitTxIds.has(tx.id) ||
        String(tx.purpose || '').includes('Cấp phát phòng y tế - Ca khám');

      (tx.items || []).forEach((item, itemIdx) => {
        // Nếu là phiếu cấp phát ca khám học sinh, chỉ lấy mặt hàng thực sự thuộc nhóm Vật tư y tế (không lấy thuốc TH-* cấp cho HS)
        const isSupplyItem = isConsumptionSlip
          ? true
          : isClinicVisitTx
            ? isMedicalSupplyItem(item)
            : isMedicalSupplyItem(item) ||
              supplyIdSet.has(item.medicineId) ||
              (item.medicineCode && supplyCodeSet.has(item.medicineCode));
        if (!isSupplyItem) return;

        // Avoid duplicate if already added via v.suppliesUsed on the linked visit
        if (visitTxIds.has(tx.id)) {
          const linkedVisit = visits.find((v) => v.inventoryTransactionId === tx.id);
          if (
            linkedVisit &&
            (linkedVisit.suppliesUsed || []).some(
              (s) => s.supplyId === item.medicineId || s.supplyName === item.medicineName
            )
          ) {
            return;
          }
        }

        const sortTime = new Date(tx.createdAt || tx.date || 0).getTime() || 0;
        const monthKey = tx.date && tx.date.length >= 7 ? tx.date.substring(0, 7) : '';
        list.push({
          rowKey: `tx-${tx.id}-${itemIdx}-${item.medicineId}-${item.batchId || 'nobatch'}`,
          sourceType: 'transaction',
          recordId: tx.id,
          itemIndex: itemIdx,
          batchId: item.batchId,
          visitId: tx.id,
          visitCode: tx.transactionCode,
          dateTime: tx.date,
          monthKey,
          rawSortTime: sortTime,
          studentName: tx.recipientName || 'Phòng Y Tế',
          studentCode: tx.recipientType === 'student' ? 'HS' : 'YT',
          className: tx.recipientClass || 'Phòng Y tế',
          supplyId: item.medicineId,
          supplyName: item.medicineName,
          quantity: item.quantity,
          unit: item.unit,
          reason: tx.purpose || 'Tiêu hao vật tư y tế',
          performer: tx.performer,
        });
      });
    });

    return list.sort((a, b) => b.rawSortTime - a.rawSortTime);
  }, [visits, exportTransactions, consumableCatalog]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(getCurrentDateISO().substring(0, 7));
    supplyItems.forEach((it) => {
      if (it.monthKey) set.add(it.monthKey);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [supplyItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return supplyItems.filter((item) => {
      if (selectedMonth !== 'all' && item.monthKey !== selectedMonth) return false;
      if (selectedSupplyId !== 'all' && item.supplyId !== selectedSupplyId) return false;
      if (selectedClass !== 'all' && item.className !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchSup = item.supplyName.toLowerCase().includes(q);
        const matchCode = item.visitCode.toLowerCase().includes(q);
        if (!matchName && !matchSup && !matchCode) return false;
      }
      return true;
    });
  }, [supplyItems, selectedMonth, selectedSupplyId, selectedClass, searchQuery]);

  // Summary aggregation by supply
  const supplySummary = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; totalQty: number; times: number }>();
    filteredItems.forEach((item) => {
      const cur = map.get(item.supplyName) || {
        name: item.supplyName,
        unit: item.unit,
        totalQty: 0,
        times: 0,
      };
      cur.totalQty += item.quantity;
      cur.times += 1;
      map.set(item.supplyName, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredItems]);

  const [exportNotification, setExportNotification] = useState<string | null>(null);

  // Export Excel (.xlsx) chuẩn dữ liệu vật tư tiêu hao
  const handleExportExcel = () => {
    try {
      let filterText = `Toàn bộ ${filteredItems.length} lượt sử dụng vật tư`;
      if (selectedSupplyId !== 'all') {
        const sup =
          consumableCatalog.find((s) => s.id === selectedSupplyId) ||
          supplies.find((s) => s.id === selectedSupplyId);
        filterText = `Vật tư: ${sup?.name || selectedSupplyId}`;
      }
      if (selectedClass !== 'all') {
        filterText += ` • Lớp: ${selectedClass}`;
      }

      exportSupplyUsageExcel(filteredItems, filterText);
      setExportNotification(
        `Đã xuất file Excel: Bao_Cao_Vat_Tu_THCS_Dong_Thanh_${getFilenameDate()}.xlsx thành công!`
      );
      setTimeout(() => setExportNotification(null), 5000);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      setExportNotification('Có lỗi xảy ra khi tạo tệp Excel. Đang thử lại...');
      setTimeout(() => setExportNotification(null), 5000);
    }
  };

  const warehouseCatalogItems = useMemo(
    () => consumableCatalog.filter((c) => c.source === 'warehouse'),
    [consumableCatalog]
  );
  const firstAidCatalogItems = useMemo(
    () => consumableCatalog.filter((c) => c.source === 'supplies'),
    [consumableCatalog]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              VẬT TƯ TIÊU HAO
            </span>
            <h1 className="text-xl font-bold text-slate-900">Báo Cáo Vật Tư Y Tế Đã Sử Dụng</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trường THCS Đông Thạnh • Theo dõi số lượng bông gạc, cồn sát khuẩn, nước muối, băng cá nhân tiêu hao
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-print-supply-report"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In báo cáo</span>
          </button>
          <button
            id="btn-export-supply-excel"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Tải xuống tệp bảng tính Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Phần Nhập tiêu hao vật tư y tế */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">Nhập tiêu hao vật tư y tế</h2>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              {warehouseCatalogItems.length} vật tư Kho chính • {firstAidCatalogItems.length} vật tư sơ cứu
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCatalogItem && (
              <div className="text-xs font-semibold text-slate-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                Số lượng tồn hiện tại:{' '}
                <span className="font-bold text-blue-800">
                  {selectedCatalogItem.currentStock} {selectedCatalogItem.unit}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowCategoryManager((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Chọn hoặc bỏ chọn các mặt hàng từ Kho thuốc đưa vào Danh mục Vật tư tiêu hao"
            >
              <BriefcaseMedical className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {showCategoryManager
                  ? 'Ẩn chọn vật tư từ Kho thuốc'
                  : 'Chọn thêm / Phân loại vật tư từ Kho thuốc'}
              </span>
            </button>
          </div>
        </div>

        {showCategoryManager && (
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-blue-950">
                  Danh mục mặt hàng trong Kho thuốc ({allWarehouseMedicines.length} mặt hàng)
                </h3>
                <p className="text-[11px] text-slate-600">
                  Bấm vào từng mặt hàng để chuyển nhanh giữa <strong className="text-[#17324D]">Vật tư y tế</strong> (hiển thị trong danh sách tiêu hao) và <strong className="text-[#147D80]">Thuốc điều trị</strong>:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="self-start sm:self-auto px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Đóng bảng chọn
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {allWarehouseMedicines.map((med) => {
                const isSupply = isMedicalSupplyItem(med);
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => {
                      const nextCat = isSupply ? 'medicine' : 'supply';
                      db.setMedicineCategory(med.id, nextCat);
                      setDbTick((t) => t + 1);
                    }}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSupply
                        ? 'bg-[#17324D] text-white border-[#17324D] font-semibold shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-mono text-[10px] opacity-80 mr-1.5">[{med.code}]</span>
                      <span>{med.name}</span>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isSupply
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isSupply ? 'Vật tư' : 'Thuốc'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {consumptionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{consumptionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setConsumptionError(null)}
              className="text-red-500 hover:text-red-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {consumptionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{consumptionSuccess}</span>
            </div>
            <div className="flex items-center gap-2">
              {lastCreatedSlip && (
                <button
                  id="btn-undo-last-consumption"
                  type="button"
                  onClick={handleQuickUndoLastSlip}
                  disabled={isDeletingItem}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa phiếu vừa nhập ({lastCreatedSlip.txCode})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setConsumptionSuccess(null)}
                className="text-emerald-600 hover:text-emerald-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveConsumption} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Ngày sử dụng */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ngày sử dụng <span className="text-red-500">*</span>
            </label>
            <input
              id="input-supply-consumption-date"
              type="date"
              value={consumptionDate}
              onChange={(e) => {
                setConsumptionDate(e.target.value);
                setConsumptionError(null);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Chọn vật tư từ danh mục hiện có */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vật tư y tế <span className="text-red-500">*</span>
            </label>
            <select
              id="select-supply-consumption-item"
              value={consumptionItemId}
              onChange={(e) => {
                setConsumptionItemId(e.target.value);
                setConsumptionError(null);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">-- Chọn vật tư từ danh mục hiện có --</option>
              {warehouseCatalogItems.length > 0 && (
                <optgroup label="Kho thuốc & Vật tư y tế chính">
                  {warehouseCatalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} (Tồn: {item.currentStock} {item.unit})
                    </option>
                  ))}
                </optgroup>
              )}
              {firstAidCatalogItems.length > 0 && (
                <optgroup label="Dung dịch sát khuẩn & Sơ cứu trong Kho chính">
                  {firstAidCatalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} (Tồn: {item.currentStock} {item.unit})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Đơn vị tính (lấy theo vật tư) & Số lượng tồn hiện tại */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đơn vị tính / Tồn hiện tại
            </label>
            <input
              id="input-supply-consumption-unit"
              type="text"
              readOnly
              value={
                selectedCatalogItem
                  ? `${selectedCatalogItem.unit} (Tồn: ${selectedCatalogItem.currentStock})`
                  : '—'
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold cursor-not-allowed"
            />
          </div>

          {/* Số lượng tiêu hao */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng tiêu hao <span className="text-red-500">*</span>
            </label>
            <input
              id="input-supply-consumption-qty"
              type="number"
              min={1}
              max={selectedCatalogItem ? Math.max(1, selectedCatalogItem.currentStock) : undefined}
              step={1}
              placeholder="Nhập số lượng..."
              value={consumptionQtyInput}
              onChange={(e) => {
                setConsumptionQtyInput(e.target.value);
                setConsumptionError(null);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Nút Lưu / Hủy */}
          <div className="sm:col-span-12 flex items-center justify-end gap-2 pt-1">
            <button
              id="btn-cancel-supply-consumption"
              type="button"
              onClick={handleCancelConsumption}
              disabled={isSubmittingConsumption}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hủy</span>
            </button>
            <button
              id="btn-save-supply-consumption"
              type="submit"
              disabled={isSubmittingConsumption}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmittingConsumption ? 'Đang lưu...' : 'Lưu phiếu tiêu hao'}</span>
            </button>
          </div>
        </form>

        {/* Danh sách các mục tiêu hao đã nhập để xóa nhanh ngay trong phần Nhập tiêu hao khi nhập sai */}
        {supplyItems.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Các lượt tiêu hao đã ghi nhận ({supplyItems.length} mục) — Bấm &ldquo;Xóa&rdquo; nếu nhập sai để hoàn trả tồn kho:
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
              {supplyItems.slice(0, 10).map((item) => (
                <div
                  key={`quick-del-${item.rowKey}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-white transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                    <span className="font-mono text-[11px] font-semibold text-slate-500">
                      {item.visitCode}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{formatDateTimeVN(item.dateTime)}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-slate-900">{item.supplyName}</span>
                    <span className="font-bold text-blue-700">
                      (-{item.quantity} {item.unit})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteConsumptionItem(item)}
                    disabled={isDeletingItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Xóa ngay lượt tiêu hao nhập sai và hoàn trả tồn kho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingRowKey === item.rowKey ? 'Đang xóa...' : 'Xóa'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {exportNotification && (
        <div className="p-3.5 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-xs flex items-center gap-2.5 font-medium shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {supplySummary.slice(0, 4).map((sup, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 truncate max-w-[130px]">{sup.name}</span>
              <BriefcaseMedical className="w-4 h-4 text-blue-700 shrink-0" />
            </div>
            <p className="text-xl font-bold text-blue-800 mt-1">
              {sup.totalQty}{' '}
              <span className="text-xs font-normal text-slate-500">{sup.unit}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sử dụng qua {sup.times} lượt</p>
          </div>
        ))}
      </div>

      {/* Filter Bar & Monthly Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-1">Báo cáo tháng / Kỳ:</span>
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-blue-700 text-white shadow-2xs'
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
                    ? 'bg-blue-700 text-white shadow-2xs'
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
            <strong className="text-blue-800">
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
              placeholder="Tìm theo học sinh, vật tư, mã phiếu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedSupplyId}
              onChange={(e) => setSelectedSupplyId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
            >
              <option value="all">Tất cả vật tư tiêu hao</option>
              {consumableCatalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.unit})
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
              <option value="all">Tất cả các lớp</option>
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
            Tổng số: <strong>{filteredItems.length}</strong> lượt sử dụng vật tư
          </span>
          {(selectedMonth !== 'all' || selectedSupplyId !== 'all' || selectedClass !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedMonth('all');
                setSelectedSupplyId('all');
                setSelectedClass('all');
                setSearchQuery('');
              }}
              className="text-blue-700 hover:text-blue-800 font-medium underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Bảng Tổng Hợp Báo Cáo Tháng Trên Sổ Theo Dõi Vật Tư Y Tế */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-xs uppercase text-slate-800">
            Báo Cáo Tổng Hợp Tiêu Hao Vật Tư Y Tế (
            {selectedMonth === 'all'
              ? 'Toàn bộ các tháng'
              : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
            )
          </div>
          <span className="text-[11px] font-semibold text-blue-700">
            {supplySummary.length} mặt hàng có phát sinh tiêu hao
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3">Tên vật tư y tế</th>
                <th className="py-2.5 px-3 text-center">Đơn vị tính</th>
                <th className="py-2.5 px-3 text-center">Số lượt xuất / tiêu hao</th>
                <th className="py-2.5 px-3 text-right">Tổng số lượng tiêu hao</th>
                <th className="py-2.5 px-3 text-right">Tồn kho hiện tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplySummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Chưa có vật tư tiêu hao trong kỳ đang chọn.
                  </td>
                </tr>
              ) : (
                supplySummary.map((sup, idx) => {
                  const catItem = consumableCatalog.find((c) => c.name === sup.name);
                  return (
                    <tr key={sup.name} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{sup.name}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{sup.unit}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{sup.times} lượt</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        -{sup.totalQty} {sup.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {catItem ? `${catItem.currentStock} ${catItem.unit}` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Học sinh / Đơn vị</th>
                <th className="py-3 px-3">Lớp / Bộ phận</th>
                <th className="py-3 px-3">Tên vật tư</th>
                <th className="py-3 px-3">Số lượng đã dùng</th>
                <th className="py-3 px-3">Mục đích sử dụng</th>
                <th className="py-3 px-3">Cán bộ y tế</th>
                <th className="py-3 px-3">Mã phiếu / Ca khám</th>
                <th className="py-3 px-3 text-right">Xóa khi nhập sai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BriefcaseMedical className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">Không có dữ liệu sử dụng vật tư</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.rowKey} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTimeVN(item.dateTime)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.studentName}</td>
                    <td className="py-3 px-3 font-bold text-emerald-800">{item.className}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.supplyName}</td>
                    <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.reason}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{item.performer}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{item.visitCode}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteConsumptionItem(item)}
                        disabled={isDeletingItem}
                        title="Xóa lượt tiêu hao nhập sai và hoàn trả tồn kho"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{deletingRowKey === item.rowKey ? 'Đang xóa...' : 'Xóa'}</span>
                      </button>
                    </td>
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
