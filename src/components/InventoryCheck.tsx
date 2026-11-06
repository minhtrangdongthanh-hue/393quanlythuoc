import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Users,
  X,
  Save,
  Check,
  RotateCcw,
  Sliders,
  Info,
  Trash2,
  FileText,
  Boxes,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { db } from '../services/db';
import { InventoryCheck, InventoryCheckItem, MedicineBatch, Medicine } from '../types';
import { formatDateVN, formatTime24H, normalizeManualTime24H } from '../utils/helpers';
import { exportInventoryCheckExcel } from '../services/excelService';
import { printInventoryCheckA4 } from '../services/printA4Service';

// Helper chuẩn hóa tiếng Việt không dấu cho tìm kiếm
const removeVietnameseTones = (str: string = ''): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

export const InventoryCheckComponent: React.FC = () => {
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [settings, setSettings] = useState(db.getSettings());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewCheck, setViewCheck] = useState<InventoryCheck | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<InventoryCheck | null>(null);
  const [deleteConfirmCheck, setDeleteConfirmCheck] = useState<InventoryCheck | null>(null);
  const [confirmCheckTarget, setConfirmCheckTarget] = useState<InventoryCheck | null>(null);
  const [adjustReason, setAdjustReason] = useState('');
  const [approverName, setApproverName] = useState(db.getCurrentUser()?.fullName || 'Cán bộ Y tế');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getNowTime24H = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Form State for creating new check
  const [formCheckCode, setFormCheckCode] = useState('');
  const [formCheckDate, setFormCheckDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCheckTime, setFormCheckTime] = useState(getNowTime24H);
  const [formPerformer, setFormPerformer] = useState('');
  const [formParticipants, setFormParticipants] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<InventoryCheckItem[]>([]);
  const [itemFilterSearch, setItemFilterSearch] = useState('');
  const [itemDiscrepancyOnly, setItemDiscrepancyOnly] = useState(false);

  // Load data from DB
  const loadData = () => {
    setChecks(db.getInventoryChecks());
    setMedicines(db.getMedicines());
    setBatches(db.getBatches());
    setSettings(db.getSettings());
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(loadData);
    return unsub;
  }, []);

  // Xử lý mở modal lập biên bản mới
  const handleOpenCreate = () => {
    const nextCode = db.getNextCheckCode();
    const currentUser = db.getCurrentUser();
    const performerName = currentUser?.fullName || 'Cán bộ Y tế';

    setFormCheckCode(nextCode);
    setFormCheckDate(new Date().toISOString().split('T')[0]);
    setFormCheckTime(getNowTime24H());
    setFormPerformer(performerName);
    setFormParticipants(
      [
        `${performerName} - Phụ trách Phòng Y tế học đường`,
        'Ban Giám Hiệu trường THCS Đông Thạnh',
        'Kế toán trường',
      ].join('\n')
    );
    setFormNotes('');
    setItemFilterSearch('');
    setItemDiscrepancyOnly(false);

    const currentBatches = db.getBatches();
    const currentMeds = db.getMedicines();

    const items: InventoryCheckItem[] = currentBatches.map((b) => {
      const med = currentMeds.find((m) => m.id === b.medicineId);
      return {
        id: 'item-' + b.id,
        medicineId: b.medicineId,
        medicineCode: med?.code || '',
        medicineName: med?.name || 'Thuốc không xác định',
        batchId: b.id,
        batchNumber: b.batchNumber,
        expDate: b.expDate,
        unit: med?.unit || 'Đơn vị',
        systemQuantity: b.quantity,
        bookQuantity: b.quantity,
        actualQuantity: b.quantity, // Mặc định khớp sổ sách để người dùng chỉ cần điều chỉnh các mục có lệch
        difference: 0,
        qualityStatus: 'good',
        reason: '',
      };
    });

    setFormItems(items);
    setShowCreateModal(true);
  };

  // Thay đổi số lượng thực kiểm
  const handleItemQuantityChange = (batchId: string, actualVal: number) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.batchId === batchId) {
          const qty = isNaN(actualVal) || actualVal < 0 ? 0 : actualVal;
          const book = item.bookQuantity ?? item.systemQuantity ?? 0;
          const diff = qty - book;
          return {
            ...item,
            actualQuantity: qty,
            difference: diff,
          };
        }
        return item;
      })
    );
  };

  // Thay đổi chất lượng lô thuốc
  const handleItemQualityChange = (batchId: string, status: 'good' | 'damaged' | 'expired') => {
    setFormItems((prev) =>
      prev.map((item) => (item.batchId === batchId ? { ...item, qualityStatus: status } : item))
    );
  };

  // Thay đổi lý do chênh lệch
  const handleItemReasonChange = (batchId: string, reason: string) => {
    setFormItems((prev) =>
      prev.map((item) => (item.batchId === batchId ? { ...item, reason } : item))
    );
  };

  // Đặt tất cả thực kiểm bằng số tồn sổ sách
  const handleMatchAllBookQuantities = () => {
    setFormItems((prev) =>
      prev.map((item) => {
        const book = item.bookQuantity ?? item.systemQuantity ?? 0;
        return {
          ...item,
          actualQuantity: book,
          difference: 0,
          reason: '',
        };
      })
    );
    showToast('Đã thiết lập số lượng thực kiểm khớp 100% sổ sách!');
  };

  // Lưu biên bản kiểm kê (Dự thảo hoặc Đã xác nhận)
  const handleSaveCheck = (status: 'draft' | 'confirmed') => {
    try {
      if (!formCheckCode.trim()) {
        showToast('Vui lòng nhập mã kiểm kê.');
        return;
      }

      const participantsList = (formParticipants || '')
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);

      const saved = db.saveInventoryCheck({
        checkCode: formCheckCode.trim(),
        checkDate: formCheckDate,
        checkTime: normalizeManualTime24H(formCheckTime) || getNowTime24H(),
        performer: formPerformer.trim() || 'Cán bộ Y tế',
        participants: participantsList,
        notes: formNotes,
        status: status,
        confirmedBy: status === 'confirmed' ? (formPerformer || 'Cán bộ Y tế') : undefined,
        confirmedAt: status === 'confirmed' ? new Date().toISOString() : undefined,
        items: formItems,
      });

      setShowCreateModal(false);
      setViewCheck(saved);
      loadData();
      showToast(
        status === 'confirmed'
          ? `Đã lưu và xác nhận biên bản kiểm kê ${saved.checkCode} thành công!`
          : `Đã lưu bản dự thảo ${saved.checkCode} thành công!`
      );
    } catch (err: any) {
      showToast(`Lỗi lưu phiếu kiểm kê: ${err.message}`);
    }
  };

  // Xác nhận biên bản kiểm kê (Bước 1)
  const handleConfirmCheck = (check: InventoryCheck) => {
    setConfirmCheckTarget(check);
  };

  const executeConfirmCheck = () => {
    if (!confirmCheckTarget) return;
    try {
      const currentUser = db.getCurrentUser();
      const approver = currentUser?.fullName || 'Cán bộ Y tế';
      const updated = db.confirmInventoryCheck(confirmCheckTarget.id, approver);
      setViewCheck(updated);
      loadData();
      showToast(`Đã xác nhận biên bản kiểm kê "${confirmCheckTarget.checkCode}" thành công!`);
    } catch (err: any) {
      showToast(`Lỗi xác nhận: ${err.message}`);
    } finally {
      setConfirmCheckTarget(null);
    }
  };

  // Điều chỉnh tồn kho thực tế theo biên bản kiểm kê (Bước 2)
  const handleAdjustStock = () => {
    if (!showAdjustModal) return;
    try {
      const currentUser = db.getCurrentUser();
      const approver = approverName.trim() || currentUser?.fullName || 'Cán bộ Y tế';
      const updated = db.adjustInventoryFromCheck(showAdjustModal.id, approver, adjustReason);
      setShowAdjustModal(null);
      setViewCheck(updated);
      loadData();
      showToast('Đã hoàn tất điều chỉnh tồn kho thực tế theo biên bản kiểm kê!');
    } catch (err: any) {
      showToast(`Lỗi điều chỉnh tồn kho: ${err.message}`);
    }
  };

  // Xóa biên bản kiểm kê
  const handleDeleteCheckConfirm = () => {
    if (!deleteConfirmCheck) return;
    const targetCheck = deleteConfirmCheck;
    try {
      db.deleteInventoryCheck(targetCheck.id);
      // Cập nhật state danh sách ngay lập tức
      setChecks((prev) => prev.filter((c) => c.id !== targetCheck.id));
      if (viewCheck?.id === targetCheck.id) {
        setViewCheck(null);
      }
      setDeleteConfirmCheck(null);
      showToast('Xóa biên bản kiểm kê thành công');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa biên bản kiểm kê.');
      setDeleteConfirmCheck(null);
    }
  };

  // Danh sách biên bản sau khi lọc và tìm kiếm (được tối ưu hóa bằng useMemo)
  const filteredChecks = useMemo(() => {
    const rawSearch = searchTerm.trim();
    const normSearch = removeVietnameseTones(rawSearch);

    return checks.filter((c) => {
      // Lọc theo từ khóa tìm kiếm
      let matchesSearch = true;
      if (normSearch) {
        const normCode = removeVietnameseTones(c.checkCode);
        const normPerformer = removeVietnameseTones(c.performer);
        const normNotes = removeVietnameseTones(c.notes || '');
        const normParticipants = removeVietnameseTones((c.participants || []).join(' '));

        matchesSearch =
          normCode.includes(normSearch) ||
          normPerformer.includes(normSearch) ||
          normNotes.includes(normSearch) ||
          normParticipants.includes(normSearch);
      }

      // Lọc theo trạng thái
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [checks, searchTerm, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = checks.length;
    const adjusted = checks.filter((c) => c.status === 'adjusted').length;
    const confirmed = checks.filter((c) => c.status === 'confirmed').length;
    const draft = checks.filter((c) => c.status === 'draft').length;
    return { total, adjusted, confirmed, draft };
  }, [checks]);

  return (
    <div id="inventory-check-module" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-50 text-sky-700 rounded-2xl border border-sky-100 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Kiểm Kê Thuốc & Vật Tư Y Tế Định Kỳ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Quy trình 2 bước chuẩn: Lập biên bản thực kiểm đối chiếu sổ sách và Phê duyệt điều chỉnh tồn kho thực tế
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-create-inventory-check"
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lập Biên Bản Kiểm Kê Mới
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng biên bản</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hồ sơ kiểm kê đã lập</div>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5 shadow-xs text-purple-900">
          <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Đã cân bằng kho</div>
          <div className="text-2xl font-black text-purple-700 mt-0.5">{stats.adjusted}</div>
          <div className="text-[10px] text-purple-600 mt-0.5">Đã cập nhật tồn thực tế</div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 shadow-xs text-emerald-900">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Đã xác nhận</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">{stats.confirmed}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Sẵn sàng điều chỉnh kho</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 shadow-xs text-amber-900">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Bản dự thảo</div>
          <div className="text-2xl font-black text-amber-700 mt-0.5">{stats.draft}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Chờ hoàn thiện & ký duyệt</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-check"
            type="text"
            placeholder="Tìm theo mã kiểm kê, người kiểm kê, hội đồng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="select-filter-check-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">Tất cả trạng thái ({stats.total})</option>
              <option value="adjusted">Đã cân bằng kho ({stats.adjusted})</option>
              <option value="confirmed">Đã xác nhận ({stats.confirmed})</option>
              <option value="draft">Bản dự thảo ({stats.draft})</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold px-2 py-1 hover:bg-sky-50 rounded-lg transition-colors"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Table of Inventory Checks */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã kiểm kê</th>
                <th className="py-3.5 px-4">Thời gian kiểm kê</th>
                <th className="py-3.5 px-4">Người lập / Hội đồng</th>
                <th className="py-3.5 px-4 text-center">Số mặt hàng</th>
                <th className="py-3.5 px-4 text-center">Chênh lệch</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300" />
                      <div className="font-bold text-slate-700 text-sm">
                        {checks.length === 0
                          ? 'Chưa có biên bản kiểm kê nào được lập'
                          : 'Không tìm thấy biên bản kiểm kê phù hợp'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {checks.length === 0
                          ? 'Nhấn nút "Lập Biên Bản Kiểm Kê Mới" phía trên để tiến hành đối chiếu tồn kho thuốc & vật tư y tế thực tế.'
                          : 'Thử kiểm tra lại từ khóa tìm kiếm hoặc chọn "Tất cả trạng thái" để hiển thị lại dữ liệu.'}
                      </p>
                      {checks.length > 0 && (searchTerm || statusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Xóa bộ lọc tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredChecks.map((check) => {
                  const itemsList = check.items || [];
                  const discrepancyCount = itemsList.filter((it) => it.difference !== 0).length;
                  return (
                    <tr key={check.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                        {check.checkCode}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-xs sm:text-sm">{formatDateVN(check.checkDate)}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {check.checkTime ? formatTime24H(check.checkTime) : '---'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900">{check.performer}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {(check.participants || []).slice(0, 2).join(', ')}
                          {(check.participants?.length || 0) > 2 ? '...' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-md text-xs font-semibold text-slate-800">
                          {itemsList.length} lô
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {discrepancyCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {discrepancyCount} mục lệch
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            Khớp 100%
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {check.status === 'adjusted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <RotateCcw className="w-3.5 h-3.5" />
                            Đã cân bằng kho
                          </span>
                        ) : check.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Dự thảo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Xem chi tiết & Thao tác"
                            onClick={() => setViewCheck(check)}
                            className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            title="In Mẫu A4 / Xuất PDF"
                            onClick={() => printInventoryCheckA4(check, settings.schoolName)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            title="Xuất file Excel"
                            onClick={() => exportInventoryCheckExcel(check)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            title="Xóa biên bản kiểm kê"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmCheck(check);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 pointer-events-none" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View & Actions for a Check */}
      {viewCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Biên Bản Kiểm Kê: <span className="font-mono text-sky-700">{viewCheck.checkCode}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ngày {formatDateVN(viewCheck.checkDate)} lúc {viewCheck.checkTime ? formatTime24H(viewCheck.checkTime) : '---'} | Người lập: <strong>{viewCheck.performer}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewCheck(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status and Action banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái hồ sơ</div>
                  <div className="flex items-center gap-2 mt-1">
                    {viewCheck.status === 'adjusted' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Đã cân bằng số liệu tồn kho (Người duyệt: {viewCheck.adjustedBy || 'BGH'})
                      </span>
                    ) : viewCheck.status === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã xác nhận kiểm kê (Sẵn sàng điều chỉnh kho)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Bản dự thảo (Cần xác nhận)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printInventoryCheckA4(viewCheck, settings.schoolName)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    In Mẫu Sổ A4 / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportInventoryCheckExcel(viewCheck)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Xuất File Excel
                  </button>

                  {/* Workflow buttons */}
                  {viewCheck.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmCheck(viewCheck)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Bước 1: Xác Nhận Kiểm Kê
                    </button>
                  )}

                  {viewCheck.status !== 'adjusted' && (
                    db.hasPermission('canApproveInventoryAdjustment') ? (
                      <button
                        type="button"
                        onClick={() => setShowAdjustModal(viewCheck)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4" />
                        Bước 2: Phê Duyệt Cân Bằng Kho (Quản trị)
                      </button>
                    ) : (
                      <span
                        title="Chỉ nhiệm vụ Quản trị mới có quyền phê duyệt điều chỉnh chênh lệch tồn kho"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold rounded-xl"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        Chờ Quản trị phê duyệt cân bằng kho
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    Thành viên Hội đồng kiểm kê:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    {(viewCheck.participants || []).map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Ghi chú & Đề xuất xử lý:
                  </div>
                  <p className="text-slate-600 leading-relaxed">{viewCheck.notes || 'Không có ghi chú bổ sung.'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-3 font-bold text-xs text-slate-700 uppercase flex items-center justify-between">
                  <span>Chi tiết đối chiếu số liệu kiểm kê ({viewCheck.items?.length || 0} lô thuốc/vật tư)</span>
                  <span className="text-slate-500 font-normal lowercase">
                    {viewCheck.items?.filter((it) => it.difference !== 0).length || 0} mục có chênh lệch
                  </span>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Tên thuốc</th>
                        <th className="py-2.5 px-3">Số lô</th>
                        <th className="py-2.5 px-3">Hạn dùng</th>
                        <th className="py-2.5 px-3 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-right">Tồn sổ sách</th>
                        <th className="py-2.5 px-3 text-right">Thực tế</th>
                        <th className="py-2.5 px-3 text-right">Chênh lệch</th>
                        <th className="py-2.5 px-3 text-center">Chất lượng</th>
                        <th className="py-2.5 px-3">Lý do & Xử lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewCheck.items || []).map((it, i) => (
                        <tr
                          key={it.id || i}
                          className={it.difference !== 0 ? 'bg-amber-50/60 font-medium' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {it.medicineName}
                            <span className="text-slate-400 block text-[10px] font-normal font-mono">{it.medicineCode}</span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-sky-700 font-mono">{it.batchNumber}</td>
                          <td className="py-2 px-3">{it.expDate ? formatDateVN(it.expDate) : '---'}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{it.unit}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">{it.bookQuantity ?? it.systemQuantity ?? 0}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{it.actualQuantity}</td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              it.difference < 0 ? 'text-red-600' : it.difference > 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {it.difference > 0 ? '+' + it.difference : it.difference}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {it.qualityStatus === 'damaged' ? 'Kém/Hỏng' : it.qualityStatus === 'expired' ? 'Hết hạn' : 'Tốt'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {it.reason || (it.difference === 0 ? 'Khớp sổ' : '---')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmCheck(viewCheck);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Xóa biên bản kiểm kê này
              </button>
              <button
                type="button"
                onClick={() => setViewCheck(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Record New Inventory Check */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col my-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-sky-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-xl">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lập Phiếu Kiểm Kê Kho Thực Tế</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đối chiếu số tồn trên sổ sách với số lượng kiểm đếm thực tế trong tủ y tế trường học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {/* Top Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã kiểm kê</label>
                  <input
                    type="text"
                    value={formCheckCode}
                    onChange={(e) => setFormCheckCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-slate-50 font-mono font-bold text-sky-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày kiểm kê</label>
                  <input
                    type="date"
                    value={formCheckDate}
                    onChange={(e) => setFormCheckDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ kiểm kê (24h)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formCheckTime}
                      onChange={(e) => setFormCheckTime(e.target.value)}
                      onBlur={() => {
                        if (formCheckTime.trim()) {
                          setFormCheckTime(normalizeManualTime24H(formCheckTime));
                        }
                      }}
                      placeholder="14:30"
                      maxLength={8}
                      className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-xl text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setFormCheckTime(getNowTime24H())}
                      title="Điền giờ hiện tại"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cán bộ lập</label>
                  <input
                    type="text"
                    value={formPerformer}
                    onChange={(e) => setFormPerformer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thành viên Hội đồng kiểm kê (mỗi người 1 dòng)
                  </label>
                  <textarea
                    rows={3}
                    value={formParticipants}
                    onChange={(e) => setFormParticipants(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed"
                    placeholder="Nhập danh sách thành viên tham gia kiểm kê..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú & Đề xuất xử lý chung
                  </label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs leading-relaxed"
                    placeholder="Ghi chú về điều kiện bảo quản, nhiệt độ, độ ẩm tủ thuốc..."
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-700 uppercase">
                      Bảng kiểm đếm số lượng thực tế ({formItems.length} lô)
                    </span>
                    <button
                      type="button"
                      onClick={handleMatchAllBookQuantities}
                      className="px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
                      title="Đặt nhanh số thực kiểm bằng số tồn sổ sách cho tất cả mặt hàng"
                    >
                      Khớp sổ tất cả
                    </button>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setItemDiscrepancyOnly((prev) => !prev)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        itemDiscrepancyOnly
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {itemDiscrepancyOnly ? '✓ Đang lọc chênh lệch' : 'Chỉ xem chênh lệch'}
                    </button>
                    <div className="w-full sm:w-56">
                      <input
                        type="text"
                        placeholder="Lọc tên thuốc, số lô..."
                        value={itemFilterSearch}
                        onChange={(e) => setItemFilterSearch(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                        <th className="py-2.5 px-3">Tên thuốc</th>
                        <th className="py-2.5 px-3">Số lô</th>
                        <th className="py-2.5 px-3">Hạn dùng</th>
                        <th className="py-2.5 px-3 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-right">Tồn sổ sách</th>
                        <th className="py-2.5 px-3 text-right w-24">Thực kiểm (*)</th>
                        <th className="py-2.5 px-3 text-right">Chênh lệch</th>
                        <th className="py-2.5 px-3 w-32">Chất lượng</th>
                        <th className="py-2.5 px-3">Lý do chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formItems
                        .filter((it) => {
                          const normTerm = removeVietnameseTones(itemFilterSearch);
                          const matchesText =
                            !normTerm ||
                            removeVietnameseTones(it.medicineName).includes(normTerm) ||
                            removeVietnameseTones(it.batchNumber).includes(normTerm);
                          const matchesDiscrepancy = !itemDiscrepancyOnly || it.difference !== 0;
                          return matchesText && matchesDiscrepancy;
                        })
                        .map((it) => (
                          <tr
                            key={it.batchId}
                            className={it.difference !== 0 ? 'bg-amber-50/60 font-medium' : 'hover:bg-slate-50'}
                          >
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {it.medicineName}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-sky-700">{it.batchNumber}</td>
                            <td className="py-2 px-3">{it.expDate ? formatDateVN(it.expDate) : '---'}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{it.unit}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-700">
                              {it.bookQuantity ?? it.systemQuantity ?? 0}
                            </td>
                            <td className="py-1 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={it.actualQuantity}
                                onChange={(e) =>
                                  handleItemQuantityChange(it.batchId, parseInt(e.target.value, 10))
                                }
                                className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-right font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-bold ${
                                it.difference < 0
                                  ? 'text-red-600'
                                  : it.difference > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {it.difference > 0 ? '+' + it.difference : it.difference}
                            </td>
                            <td className="py-1 px-3">
                              <select
                                value={it.qualityStatus || 'good'}
                                onChange={(e: any) =>
                                  handleItemQualityChange(it.batchId, e.target.value)
                                }
                                className="w-full text-[11px] border border-slate-300 rounded-lg px-1.5 py-1"
                              >
                                <option value="good">Tốt</option>
                                <option value="damaged">Hỏng / Kém</option>
                                <option value="expired">Hết hạn dùng</option>
                              </select>
                            </td>
                            <td className="py-1 px-3">
                              <input
                                type="text"
                                placeholder={it.difference !== 0 ? 'Nhập nguyên nhân lệch...' : ''}
                                value={it.reason || ''}
                                onChange={(e) => handleItemReasonChange(it.batchId, e.target.value)}
                                className="w-full text-xs px-2 py-1 border border-slate-200 rounded-lg"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 rounded-b-2xl">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Số lượng mục có chênh lệch:</span>
                <strong className="text-slate-900 font-bold">
                  {formItems.filter((i) => i.difference !== 0).length} lô
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCheck('draft')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Bản Dự Thảo
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCheck('confirmed')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Lưu & Xác Nhận Kiểm Kê
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Stock Adjustment (Step 2) */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shrink-0">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cân Bằng Tồn Kho Thực Tế Theo Kiểm Kê
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Biên bản: <strong>{showAdjustModal.checkCode}</strong>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Chú ý về nghiệp vụ kho:
              </p>
              <p className="leading-relaxed">
                Thao tác này sẽ tự động cập nhật lại số lượng tồn kho của các lô thuốc/vật tư có chênh lệch theo đúng số lượng thực tế kiểm kê.
              </p>
              <p className="leading-relaxed">
                Hệ thống sẽ ghi log vết kiểm toán chi tiết và cập nhật trạng thái biên bản thành <strong>Đã cân bằng kho</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Người phê duyệt điều chỉnh
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lý do / Quyết định xử lý chênh lệch
                </label>
                <textarea
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ví dụ: Theo kết luận cuộc họp kiểm kê định kỳ cuối học kỳ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAdjustModal(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Đồng Ý Cân Bằng Tồn Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Inventory Check Confirmation Modal */}
      {deleteConfirmCheck && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xác nhận xóa biên bản</h3>
                <p className="text-xs text-rose-600 font-semibold font-mono">{deleteConfirmCheck.checkCode}</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Bạn có chắc chắn muốn xóa biên bản kiểm kê <strong>{deleteConfirmCheck.checkCode}</strong> không? Hành động này không thể hoàn tác.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-200 text-slate-600">
              <div>
                <strong>Thời gian lập:</strong> {formatDateVN(deleteConfirmCheck.checkDate)}{' '}
                {deleteConfirmCheck.checkTime ? `(${deleteConfirmCheck.checkTime})` : ''}
              </div>
              <div>
                <strong>Người thực hiện:</strong> {deleteConfirmCheck.performer}
              </div>
              <div>
                <strong>Số lượng mặt hàng:</strong> {deleteConfirmCheck.items?.length || 0} lô thuốc/vật tư
              </div>
              <div>
                <strong>Trạng thái:</strong>{' '}
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    deleteConfirmCheck.status === 'adjusted'
                      ? 'bg-purple-100 text-purple-800'
                      : deleteConfirmCheck.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {deleteConfirmCheck.status === 'adjusted'
                    ? 'Đã cân bằng kho'
                    : deleteConfirmCheck.status === 'confirmed'
                    ? 'Đã xác nhận'
                    : 'Dự thảo / Đang kiểm kê'}
                </span>
              </div>
            </div>

            {deleteConfirmCheck.status === 'adjusted' && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Lưu ý:</strong> Biên bản này đã thực hiện cân bằng kho trước đó. Việc xóa biên bản sẽ xóa lưu vết đợt kiểm kê này khỏi hệ thống (số lượng tồn kho hiện tại đã cân bằng trước đó vẫn được giữ nguyên).
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmCheck(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteCheckConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal: Confirm Inventory Check */}
      {confirmCheckTarget && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-purple-700">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Xác Nhận Biên Bản Kiểm Kê</h3>
                <p className="text-xs text-purple-700 font-semibold font-mono">{confirmCheckTarget.checkCode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xác nhận biên bản kiểm kê ngày <strong>{formatDateVN(confirmCheckTarget.checkDate)}</strong>? Sau khi xác nhận, biên bản sẽ chuyển sang trạng thái sẵn sàng để Ban Giám Hiệu phê duyệt và điều chỉnh tồn kho.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmCheckTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={executeConfirmCheck}
                className="px-4 py-2 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận biên bản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
