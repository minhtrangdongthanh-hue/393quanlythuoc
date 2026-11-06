import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartHandshake,
  Heart,
  Plus,
  Package,
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  X,
  Trash2,
  RefreshCw,
  HelpCircle,
  Settings,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Info,
  Sparkles,
  School,
  Database,
  Lock,
  Layers,
  Edit3,
  XCircle,
} from 'lucide-react';
import { db } from '../services/db';
import {
  SanitaryNapkinProduct,
  SanitaryNapkinDispatch,
  SanitaryNapkinImport,
  SanitaryNapkinSettings,
  SchoolClass,
} from '../types';
import {
  formatDateVN,
  formatDateTimeVN,
  formatTime24H,
  formatDateTime24H,
  parseDateTimeToISO,
  isValidDateTime24H,
  normalizeDateToISO,
  normalizeManualTime24H,
} from '../utils/helpers';
import { exportSanitaryNapkinReportExcel } from '../services/excelService';
import { printSanitaryNapkinReportA4 } from '../services/printA4Service';
import { templateConfigService } from '../services/templateConfigService';

interface SanitaryNapkinModuleProps {
  onShowToast?: (msg: string, type?: 'success' | 'info') => void;
}

export type CuteThemeKey = 'sakura' | 'strawberry' | 'lavender' | 'peach';

export interface CuteThemeConfig {
  key: CuteThemeKey;
  name: string;
  icon: string;
  badge: string;
  bgPage: string;
  headerBg: string;
  headerBorder: string;
  headerGradient: string;
  accentText: string;
  badgeBg: string;
  cardBg: string;
  cardBorder: string;
  btnPrimary: string;
  tabActive: string;
  tableHead: string;
  floatingPill: string;
}

export const CUTE_THEMES: Record<CuteThemeKey, CuteThemeConfig> = {
  sakura: {
    key: 'sakura',
    name: 'Hồng Phấn Sakura',
    icon: '🌸',
    badge: 'Dịu dàng & Ngọt ngào',
    bgPage: 'bg-gradient-to-b from-rose-50/70 via-pink-50/40 to-white',
    headerBg: 'bg-gradient-to-r from-pink-100/90 via-rose-50 to-pink-50/90',
    headerBorder: 'border-pink-200/90',
    headerGradient: 'from-pink-500 via-rose-500 to-pink-600',
    accentText: 'text-pink-600',
    badgeBg: 'bg-pink-100/90 text-pink-700 border-pink-200',
    cardBg: 'bg-white/95 border-pink-100 hover:border-pink-200 shadow-xs shadow-pink-100/50',
    cardBorder: 'border-pink-200/80',
    btnPrimary: 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-200/60',
    tabActive: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs font-bold border-pink-500',
    tableHead: 'bg-pink-50/80 text-pink-900 border-pink-100',
    floatingPill: 'bg-pink-100/80 border-pink-200 text-pink-700',
  },
  strawberry: {
    key: 'strawberry',
    name: 'Dâu Tây Kem Sữa',
    icon: '🍓',
    badge: 'Đáng yêu & Rực rỡ',
    bgPage: 'bg-gradient-to-b from-red-50/50 via-rose-50/40 to-white',
    headerBg: 'bg-gradient-to-r from-rose-100/90 via-red-50/80 to-pink-50/90',
    headerBorder: 'border-rose-200/90',
    headerGradient: 'from-rose-500 via-red-500 to-rose-600',
    accentText: 'text-rose-600',
    badgeBg: 'bg-rose-100/90 text-rose-700 border-rose-200',
    cardBg: 'bg-white/95 border-rose-100 hover:border-rose-200 shadow-xs shadow-rose-100/50',
    cardBorder: 'border-rose-200/80',
    btnPrimary: 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-500 hover:from-rose-600 hover:to-red-600 text-white shadow-md shadow-rose-200/60',
    tabActive: 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-xs font-bold border-rose-500',
    tableHead: 'bg-rose-50/80 text-rose-900 border-rose-100',
    floatingPill: 'bg-rose-100/80 border-rose-200 text-rose-700',
  },
  lavender: {
    key: 'lavender',
    name: 'Oải Hương Dịu Êm',
    icon: '💜',
    badge: 'Tinh tế & Bình yên',
    bgPage: 'bg-gradient-to-b from-purple-50/50 via-fuchsia-50/30 to-white',
    headerBg: 'bg-gradient-to-r from-purple-100/90 via-fuchsia-50/70 to-pink-50/90',
    headerBorder: 'border-purple-200/90',
    headerGradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    accentText: 'text-purple-600',
    badgeBg: 'bg-purple-100/90 text-purple-700 border-purple-200',
    cardBg: 'bg-white/95 border-purple-100 hover:border-purple-200 shadow-xs shadow-purple-100/50',
    cardBorder: 'border-purple-200/80',
    btnPrimary: 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-md shadow-purple-200/60',
    tabActive: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white shadow-xs font-bold border-purple-500',
    tableHead: 'bg-purple-50/80 text-purple-900 border-purple-100',
    floatingPill: 'bg-purple-100/80 border-purple-200 text-purple-700',
  },
  peach: {
    key: 'peach',
    name: 'Cam Đào Mơ Mộng',
    icon: '🍑',
    badge: 'Ấm áp & Tươi sáng',
    bgPage: 'bg-gradient-to-b from-orange-50/50 via-amber-50/40 to-white',
    headerBg: 'bg-gradient-to-r from-orange-100/90 via-amber-50/80 to-rose-50/90',
    headerBorder: 'border-orange-200/90',
    headerGradient: 'from-orange-500 via-amber-500 to-rose-400',
    accentText: 'text-amber-700',
    badgeBg: 'bg-orange-100/90 text-orange-800 border-orange-200',
    cardBg: 'bg-white/95 border-orange-100 hover:border-orange-200 shadow-xs shadow-orange-100/50',
    cardBorder: 'border-orange-200/80',
    btnPrimary: 'bg-gradient-to-r from-orange-500 via-amber-500 to-rose-400 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-200/60',
    tabActive: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs font-bold border-orange-500',
    tableHead: 'bg-orange-50/80 text-orange-900 border-orange-100',
    floatingPill: 'bg-orange-100/80 border-orange-200 text-orange-800',
  },
};

export const SanitaryNapkinModule: React.FC<SanitaryNapkinModuleProps> = ({ onShowToast }) => {
  const [dbTick, setDbTick] = useState(0);

  // Subscribe to DB reactivity
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setDbTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const currentUser = useMemo(() => db.getCurrentUser(), [dbTick]);
  const syncStatus = useMemo(() => db.getSyncStatus(), [dbTick]);
  const classesList: SchoolClass[] = useMemo(() => db.getSchoolClasses(), [dbTick]);

  // Bảng màu dễ thương (Cute Theme) cho nữ sinh
  const [cuteTheme, setCuteTheme] = useState<CuteThemeKey>(() => {
    try {
      const saved = localStorage.getItem('sanitary_napkin_cute_theme');
      if (saved && saved in CUTE_THEMES) return saved as CuteThemeKey;
    } catch {
      // ignore
    }
    return 'sakura';
  });

  const activeCuteTheme = CUTE_THEMES[cuteTheme] || CUTE_THEMES.sakura;

  const handleSelectCuteTheme = (key: CuteThemeKey) => {
    setCuteTheme(key);
    try {
      localStorage.setItem('sanitary_napkin_cute_theme', key);
    } catch {
      // ignore
    }
    triggerToast(`Đã áp dụng màu dễ thương: ${CUTE_THEMES[key].icon} ${CUTE_THEMES[key].name}!`, 'info');
  };

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'report' | 'products'>('overview');

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<SanitaryNapkinProduct | null>(null);

  // Detail & Cancel Modal
  const [viewingDispatch, setViewingDispatch] = useState<SanitaryNapkinDispatch | null>(null);
  const [cancellingItem, setCancellingItem] = useState<{
    type: 'dispatch' | 'import';
    id: string;
    code: string;
    name: string;
    quantity: number;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // In-app Confirm Modal (Thay thế hoàn toàn window.confirm để chạy trơn tru trong iframe)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: 'rose' | 'amber' | 'emerald';
    onConfirm: () => void;
  } | null>(null);

  // Toast / notification inside component
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setLocalToast({ message, type });
    if (onShowToast) onShowToast(message, type === 'error' ? 'info' : type);
    setTimeout(() => setLocalToast(null), 4000);
  };

  // Metrics
  const metrics = useMemo(() => db.getSanitaryMetrics(), [dbTick]);
  const products = useMemo(() => db.getSanitaryProducts(true), [dbTick]);
  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);
  const settings = useMemo(() => db.getSanitarySettings(), [dbTick]);

  // Cấu hình người ký báo cáo A4
  const [reportSignerMedic, setReportSignerMedic] = useState(() => {
    return templateConfigService.getConfig().signatory1Name || 'Cô Đoàn Thị Minh Trang';
  });
  const [reportSignerPrincipal, setReportSignerPrincipal] = useState(() => {
    return templateConfigService.getConfig().signatory2Name || 'Ban Giám Hiệu';
  });
  const [isEditingSigners, setIsEditingSigners] = useState(false);

  useEffect(() => {
    const handleConfigChange = () => {
      const cfg = templateConfigService.getConfig();
      setReportSignerMedic(cfg.signatory1Name);
      setReportSignerPrincipal(cfg.signatory2Name);
    };
    window.addEventListener('templateConfigChanged', handleConfigChange);
    return () => window.removeEventListener('templateConfigChanged', handleConfigChange);
  }, []);

  // =========================================================================
  // DISPENSE FORM STATE (CẤP PHÁT)
  // =========================================================================
  // =========================================================================
  // DISPENSE FORM STATE (CẤP PHÁT) - TỰ NHẬP LOẠI BVS & 100% ẨN DANH HỌC SINH
  // =========================================================================
  const [dispatchDate, setDispatchDate] = useState(() => formatDateVN(new Date().toISOString()));
  const [dispatchTime, setDispatchTime] = useState(() => formatTime24H(new Date()));
  const [isDispatchDateCalendarOpen, setIsDispatchDateCalendarOpen] = useState(false);

  const [dispatchForm, setDispatchForm] = useState({
    dateTime: `${formatDateVN(new Date().toISOString())} ${formatTime24H(new Date())}`,
    productId: activeProducts[0]?.id || 'custom',
    customProductName: '',
    customProductBrand: '',
    customInitialStock: 30,
    quantity: 1,
    className: classesList[0]?.name || '6A1',
    customClass: '',
    dispenserName: currentUser?.fullName || 'Đoàn Thị Minh Trang',
    notes: '',
  });
  const [isDispatchSubmitting, setIsDispatchSubmitting] = useState(false);

  // Sync selected product if list changed
  useEffect(() => {
    if ((!dispatchForm.productId || dispatchForm.productId === 'custom') && activeProducts.length > 0) {
      setDispatchForm((prev) => ({ ...prev, productId: activeProducts[0].id }));
    } else if (activeProducts.length === 0) {
      setDispatchForm((prev) => ({ ...prev, productId: 'custom' }));
    }
  }, [activeProducts]);

  // Handler for Dispense Submit
  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispatchSubmitting) return;

    const qty = Math.floor(Number(dispatchForm.quantity));
    if (isNaN(qty) || qty <= 0) {
      triggerToast('Số lượng cấp phải là số nguyên dương (tối thiểu 1 miếng)', 'error');
      return;
    }

    const dateVal = dispatchDate?.trim() || '';
    const timeVal = dispatchTime?.trim() || '';
    if (!dateVal) {
      triggerToast('Vui lòng nhập ngày cấp phát (DD/MM/YYYY)', 'error');
      return;
    }
    if (!timeVal) {
      triggerToast('Vui lòng nhập giờ cấp phát (HH:mm)', 'error');
      return;
    }

    const isoDate = normalizeDateToISO(dateVal);
    if (!isoDate || isoDate.length < 10) {
      triggerToast('Ngày cấp không hợp lệ. Vui lòng nhập định dạng DD/MM/YYYY (Ví dụ: 03/11/2026)', 'error');
      return;
    }

    const normTime = formatTime24H(normalizeManualTime24H(timeVal)) || '08:00';
    const rawDateTime = `${dateVal} ${normTime}`;
    const isoDateTime = parseDateTimeToISO(rawDateTime);
    if (isNaN(new Date(isoDateTime).getTime())) {
      triggerToast(
        'Thời điểm cấp không hợp lệ. Vui lòng kiểm tra lại ngày (DD/MM/YYYY) và giờ (HH:mm)',
        'error'
      );
      return;
    }

    const isCustom = dispatchForm.productId === 'custom' || activeProducts.length === 0;
    let selectedProduct = activeProducts.find((p) => p.id === dispatchForm.productId);

    if (isCustom) {
      if (!dispatchForm.customProductName.trim()) {
        triggerToast('Vui lòng nhập tên loại băng vệ sinh tự nhập', 'error');
        return;
      }
    } else if (!selectedProduct) {
      triggerToast('Vui lòng chọn loại sản phẩm hợp lệ hoặc chọn tự nhập', 'error');
      return;
    }

    if (!isCustom && selectedProduct && selectedProduct.stockQuantity < qty) {
      triggerToast(
        `Không đủ tồn kho để cấp! Hiện chỉ còn ${selectedProduct.stockQuantity} miếng ${selectedProduct.name}`,
        'error'
      );
      return;
    }

    const finalClass = dispatchForm.className === 'custom'
      ? dispatchForm.customClass.trim() || 'Chưa rõ'
      : dispatchForm.className;

    setIsDispatchSubmitting(true);
    try {
      const payload: any = {
        dateTime: isoDateTime,
        productId: isCustom ? 'custom' : selectedProduct!.id,
        productName: isCustom ? dispatchForm.customProductName.trim() : selectedProduct!.name,
        quantity: qty,
        className: finalClass,
        isAnonymous: true, // Bảo mật danh tính học sinh 100%
        dispenserName: dispatchForm.dispenserName.trim() || currentUser?.fullName || 'Cán bộ Y tế',
        notes: dispatchForm.notes.trim(),
      };

      if (isCustom) {
        payload.customProductName = dispatchForm.customProductName.trim();
        payload.customProductBrand = dispatchForm.customProductBrand.trim();
        payload.initialStock = Math.max(qty, Number(dispatchForm.customInitialStock) || 30);
      }

      const res = db.addSanitaryDispatch(payload);

      if (res.success && res.dispatch) {
        triggerToast(
          `Cấp phát thành công phiếu ${res.dispatch.dispatchCode} (${qty} miếng cho lớp ${finalClass})! Đã tự động trừ kho và bảo mật 100% danh tính học sinh.`,
          'success'
        );
        setIsDispatchModalOpen(false);
        setIsDispatchDateCalendarOpen(false);
        // Reset form for next quick action
        const now = new Date();
        const dVN = formatDateVN(now.toISOString());
        const t24 = formatTime24H(now);
        setDispatchDate(dVN);
        setDispatchTime(t24);
        setDispatchForm({
          dateTime: `${dVN} ${t24}`,
          productId: activeProducts[0]?.id || 'custom',
          customProductName: '',
          customProductBrand: '',
          customInitialStock: 30,
          quantity: 1,
          className: classesList[0]?.name || '6A1',
          customClass: '',
          dispenserName: currentUser?.fullName || 'Đoàn Thị Minh Trang',
          notes: '',
        });
      } else {
        triggerToast(res.error || 'Có lỗi xảy ra khi lưu phiếu cấp phát', 'error');
      }
    } catch (err: any) {
      triggerToast(`Lỗi: ${err.message || 'Không thể lưu'}`, 'error');
    } finally {
      setIsDispatchSubmitting(false);
    }
  };

  // =========================================================================
  // IMPORT FORM STATE (NHẬP KHO) - CHUẨN 24 GIỜ & GÕ TAY TỰ DO
  // =========================================================================
  const [importDateInputMode, setImportDateInputMode] = useState<'separate' | 'combined'>('separate');
  const [isImportDatePickerOpen, setIsImportDatePickerOpen] = useState(false);
  const [isImportTimePickerOpen, setIsImportTimePickerOpen] = useState(false);
  const [isImportCombinedPickerOpen, setIsImportCombinedPickerOpen] = useState(false);

  const [importForm, setImportForm] = useState({
    importDate: formatDateVN(new Date().toISOString()),
    importTime: formatTime24H(new Date()),
    importDateTimeCombined: formatDateTime24H(new Date()),
    productId: activeProducts[0]?.id || 'custom',
    customProductName: '',
    customProductBrand: '',
    packagingType: 'pack' as 'pack' | 'piece',
    packCount: 10,
    piecesPerPack: 8,
    totalPieces: 80,
    sourceOrSponsor: 'Ngân sách y tế học đường',
    customSource: '',
    receiverName: currentUser?.fullName || 'Đoàn Thị Minh Trang',
    notes: '',
  });
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);

  // Sync selected product if list changed
  useEffect(() => {
    if ((!importForm.productId || importForm.productId === 'custom') && activeProducts.length > 0) {
      setImportForm((prev) => ({ ...prev, productId: activeProducts[0].id }));
    } else if (activeProducts.length === 0) {
      setImportForm((prev) => ({ ...prev, productId: 'custom' }));
    }
  }, [activeProducts]);

  // Recalculate total pieces when pack or piecesPerPack changes
  const computedTotalPieces = useMemo(() => {
    if (importForm.packagingType === 'pack') {
      return (Number(importForm.packCount) || 0) * (Number(importForm.piecesPerPack) || 0);
    }
    return Number(importForm.totalPieces) || 0;
  }, [importForm.packagingType, importForm.packCount, importForm.piecesPerPack, importForm.totalPieces]);

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isImportSubmitting) return;

    if (computedTotalPieces <= 0) {
      triggerToast('Tổng số miếng nhập kho phải là số nguyên dương lớn hơn 0', 'error');
      return;
    }

    // Chuẩn hóa và xác thực ngày giờ nhập kho
    let dateStr = importForm.importDate.trim();
    let timeStr = importForm.importTime.trim();

    if (importDateInputMode === 'combined') {
      const combined = importForm.importDateTimeCombined.trim();
      if (!combined) {
        triggerToast('Vui lòng nhập thời điểm nhập kho', 'error');
        return;
      }
      const parts = combined.split(/\s+/);
      dateStr = parts[0] || '';
      timeStr = parts[1] || '08:00';
    }

    const isoDate = normalizeDateToISO(dateStr);
    if (!isoDate || isoDate.length < 10) {
      triggerToast('Ngày nhập kho không hợp lệ. Vui lòng nhập đúng định dạng DD/MM/YYYY (Ví dụ: 03/11/2026)', 'error');
      return;
    }

    const normTime = formatTime24H(normalizeManualTime24H(timeStr)) || '08:00';

    const isCustom = importForm.productId === 'custom' || activeProducts.length === 0;
    const selectedProduct = activeProducts.find((p) => p.id === importForm.productId);

    if (isCustom) {
      if (!importForm.customProductName.trim()) {
        triggerToast('Vui lòng nhập tên loại sản phẩm tự nhập', 'error');
        return;
      }
    } else if (!selectedProduct) {
      triggerToast('Vui lòng chọn loại sản phẩm', 'error');
      return;
    }

    const finalSource = importForm.sourceOrSponsor === 'custom'
      ? importForm.customSource.trim() || 'Nhà tài trợ'
      : importForm.sourceOrSponsor;

    setIsImportSubmitting(true);
    try {
      const payload: any = {
        importDate: isoDate,
        importTime: normTime,
        productId: isCustom ? 'custom' : selectedProduct!.id,
        productName: isCustom ? importForm.customProductName.trim() : selectedProduct!.name,
        packagingType: importForm.packagingType,
        packCount: importForm.packagingType === 'pack' ? Number(importForm.packCount) : undefined,
        piecesPerPack: importForm.packagingType === 'pack' ? Number(importForm.piecesPerPack) : undefined,
        totalPieces: computedTotalPieces,
        sourceOrSponsor: finalSource,
        receiverName: importForm.receiverName.trim() || currentUser?.fullName || 'Cán bộ Y tế',
        notes: importForm.notes.trim(),
      };

      if (isCustom) {
        payload.customProductName = importForm.customProductName.trim();
        payload.customProductBrand = importForm.customProductBrand.trim();
      }

      const res = db.addSanitaryImport(payload);

      if (res.success && res.importRecord) {
        triggerToast(
          `Nhập kho thành công phiếu ${res.importRecord.importCode} (+${computedTotalPieces} miếng vào tồn kho)!`,
          'success'
        );
        // Automatically select the imported product in dispatch form
        if (res.importRecord.productId) {
          setDispatchForm((prev) => ({
            ...prev,
            productId: res.importRecord!.productId,
            customProductName: '',
            customProductBrand: '',
          }));
        }
        setIsImportModalOpen(false);
        setIsImportDatePickerOpen(false);
        setIsImportTimePickerOpen(false);
        setIsImportCombinedPickerOpen(false);
        // Reset form
        setImportForm({
          importDate: formatDateVN(new Date().toISOString()),
          importTime: formatTime24H(new Date()),
          importDateTimeCombined: formatDateTime24H(new Date()),
          productId: activeProducts[0]?.id || 'custom',
          customProductName: '',
          customProductBrand: '',
          packagingType: 'pack',
          packCount: 10,
          piecesPerPack: 8,
          totalPieces: 80,
          sourceOrSponsor: 'Ngân sách y tế học đường',
          customSource: '',
          receiverName: currentUser?.fullName || 'Đoàn Thị Minh Trang',
          notes: '',
        });
      } else {
        triggerToast(res.error || 'Có lỗi khi nhập kho', 'error');
      }
    } catch (err: any) {
      triggerToast(`Lỗi: ${err.message || 'Không thể nhập'}`, 'error');
    } finally {
      setIsImportSubmitting(false);
    }
  };

  // =========================================================================
  // CANCEL TRANSACTION HANDLER (HỦY PHIẾU CÓ XÁC NHẬN)
  // =========================================================================
  const handleConfirmCancel = () => {
    if (!cancellingItem) return;
    if (cancellingItem.type === 'dispatch') {
      const res = db.cancelSanitaryDispatch(
        cancellingItem.id,
        cancelReason.trim() || 'Hủy theo yêu cầu cán bộ y tế',
        currentUser?.fullName
      );
      if (res.success) {
        triggerToast(
          `Đã hủy phiếu cấp phát ${cancellingItem.code} và hoàn trả ${cancellingItem.quantity} miếng về kho!`,
          'success'
        );
      } else {
        triggerToast(res.error || 'Không thể hủy phiếu', 'error');
      }
    } else {
      const res = db.cancelSanitaryImport(
        cancellingItem.id,
        cancelReason.trim() || 'Hủy theo yêu cầu',
        currentUser?.fullName
      );
      if (res.success) {
        triggerToast(
          `Đã hủy phiếu nhập kho ${cancellingItem.code} và cập nhật trừ lại ${cancellingItem.quantity} miếng!`,
          'success'
        );
      } else {
        triggerToast(res.error || 'Không thể hủy phiếu', 'error');
      }
    }
    setCancellingItem(null);
    setCancelReason('');
  };

  // =========================================================================
  // HISTORY FILTERING STATE
  // =========================================================================
  const [historyType, setHistoryType] = useState<'all' | 'dispatch' | 'import'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const dispatchesList = useMemo(() => {
    return db.getSanitaryDispatches({
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      className: filterClass !== 'all' ? filterClass : undefined,
      productId: filterProduct !== 'all' ? filterProduct : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    });
  }, [filterStartDate, filterEndDate, filterClass, filterProduct, filterStatus, dbTick]);

  const importsList = useMemo(() => {
    return db.getSanitaryImports({
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      productId: filterProduct !== 'all' ? filterProduct : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
    });
  }, [filterStartDate, filterEndDate, filterProduct, filterStatus, dbTick]);

  // Combined timeline items
  const combinedHistory = useMemo(() => {
    const list: Array<
      | ({ kind: 'dispatch' } & SanitaryNapkinDispatch)
      | ({ kind: 'import' } & SanitaryNapkinImport)
    > = [];

    if (historyType === 'all' || historyType === 'dispatch') {
      for (const d of dispatchesList) {
        list.push({ kind: 'dispatch', ...d });
      }
    }
    if (historyType === 'all' || historyType === 'import') {
      for (const i of importsList) {
        list.push({ kind: 'import', ...i });
      }
    }

    let filtered = list;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.kind === 'dispatch') {
          return (
            item.dispatchCode.toLowerCase().includes(kw) ||
            item.productName.toLowerCase().includes(kw) ||
            item.className.toLowerCase().includes(kw) ||
            item.dispenserName.toLowerCase().includes(kw) ||
            (item.notes && item.notes.toLowerCase().includes(kw))
          );
        } else {
          return (
            item.importCode.toLowerCase().includes(kw) ||
            item.productName.toLowerCase().includes(kw) ||
            item.sourceOrSponsor.toLowerCase().includes(kw) ||
            item.receiverName.toLowerCase().includes(kw) ||
            (item.notes && item.notes.toLowerCase().includes(kw))
          );
        }
      });
    }

    return filtered.sort((a, b) => {
      const timeA = a.kind === 'dispatch' ? a.dateTime : `${a.importDate}T${a.importTime || '00:00'}`;
      const timeB = b.kind === 'dispatch' ? b.dateTime : `${b.importDate}T${b.importTime || '00:00'}`;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  }, [dispatchesList, importsList, historyType, searchKeyword]);

  // Quick preset filter
  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'week') {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFilterStartDate(monday.toISOString().split('T')[0]);
      setFilterEndDate(sunday.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      setFilterStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
      const lastDay = new Date(y, m, 0).getDate();
      setFilterEndDate(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // =========================================================================
  // REPORT STATE
  // =========================================================================
  const [reportRangeType, setReportRangeType] = useState<
    'week' | 'month' | 'semester1' | 'semester2' | 'year' | 'custom'
  >('month');
  const [reportCustomStart, setReportCustomStart] = useState('');
  const [reportCustomEnd, setReportCustomEnd] = useState('');

  const reportData = useMemo(() => {
    return db.getSanitaryReport({
      type: reportRangeType,
      startDate: reportCustomStart || undefined,
      endDate: reportCustomEnd || undefined,
    });
  }, [reportRangeType, reportCustomStart, reportCustomEnd, dbTick]);

  // Product Form for Add/Edit
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    stockQuantity: 50,
    minAlertThreshold: 30,
    notes: '',
  });

  const handleOpenAddProduct = () => {
    setSelectedProductToEdit(null);
    setProductForm({
      name: '',
      brand: 'Diana / Kotex',
      stockQuantity: 30,
      minAlertThreshold: 20,
      notes: '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: SanitaryNapkinProduct) => {
    setSelectedProductToEdit(prod);
    setProductForm({
      name: prod.name,
      brand: prod.brand || '',
      stockQuantity: prod.stockQuantity,
      minAlertThreshold: prod.minAlertThreshold,
      notes: prod.notes || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      triggerToast('Vui lòng nhập tên loại sản phẩm', 'error');
      return;
    }

    if (selectedProductToEdit) {
      db.updateSanitaryProduct(selectedProductToEdit.id, {
        name: productForm.name.trim(),
        brand: productForm.brand.trim(),
        stockQuantity: Number(productForm.stockQuantity) || 0,
        minAlertThreshold: Number(productForm.minAlertThreshold) || 20,
        notes: productForm.notes.trim(),
      });
      triggerToast(`Đã cập nhật sản phẩm "${productForm.name}" thành công!`, 'success');
    } else {
      db.addSanitaryProduct({
        name: productForm.name.trim(),
        brand: productForm.brand.trim(),
        unit: 'miếng',
        stockQuantity: Number(productForm.stockQuantity) || 0,
        minAlertThreshold: Number(productForm.minAlertThreshold) || 20,
        notes: productForm.notes.trim(),
        isActive: true,
      });
      triggerToast(`Đã thêm loại sản phẩm "${productForm.name}" vào danh mục!`, 'success');
    }
    setIsProductModalOpen(false);
  };

  return (
    <div className={`space-y-6 transition-all duration-300 ${activeCuteTheme.bgPage} p-3.5 sm:p-5 rounded-3xl border ${activeCuteTheme.cardBorder} shadow-sm`}>
      {/* Toast Alert */}
      {localToast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-xs sm:text-sm font-semibold max-w-md animate-in fade-in slide-in-from-top-4 duration-200 ${
            localToast.type === 'error'
              ? 'bg-rose-800 text-white border-rose-700'
              : 'bg-emerald-800 text-white border-emerald-700'
          }`}
        >
          {localToast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-300" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
          )}
          <span>{localToast.message}</span>
        </div>
      )}

      {/* TOP BANNER / HEADER VỚI TONE MÀU DỄ THƯƠNG & BỘ CHỌN MÀU */}
      <div className={`${activeCuteTheme.headerBg} border ${activeCuteTheme.headerBorder} rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all duration-300`}>
        {/* Cute decorative watermarks */}
        <div className="absolute right-4 top-2 opacity-10 pointer-events-none text-pink-900 select-none">
          <Heart className="w-56 h-56" />
        </div>
        <div className="absolute right-32 -bottom-8 opacity-15 pointer-events-none text-rose-800 select-none">
          <Sparkles className="w-36 h-36" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${activeCuteTheme.floatingPill}`}>
                <span>{activeCuteTheme.icon}</span>
                <span>Góc Chăm Sóc Nữ Sinh Thân Thiện • Dịu Dàng & Tế Nhị</span>
                <Heart className="w-3 h-3 fill-current inline text-pink-500" />
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 border border-pink-200/80 text-pink-700 text-2xs font-semibold shadow-2xs">
                <span>💕 100% Ẩn Danh Quyền Riêng Tư</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-2.5 pt-1">
              <span>{activeCuteTheme.icon} Cấp Phát Băng Vệ Sinh Nữ Sinh</span>
              <span className="text-xs sm:text-sm font-bold text-pink-700 bg-white/90 border border-pink-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1">
                <span>THCS Đông Thạnh</span>
                <span>🌸</span>
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Hỗ trợ học sinh nữ trong các tình huống khẩn cấp tại trường học với tình yêu thương, sự thấu hiểu và bảo mật riêng tư tuyệt đối. Mặc định cấp ẩn danh, thao tác nhẹ nhàng, nhanh gọn trên mọi thiết bị.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            {/* Cute Theme Color Palette Switcher */}
            <div className="p-1.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-pink-200/90 shadow-xs flex flex-wrap items-center gap-1">
              <span className="text-[11px] font-bold text-slate-600 pl-2 pr-1 flex items-center gap-1">
                <span>Màu dễ thương:</span>
              </span>
              {(Object.keys(CUTE_THEMES) as CuteThemeKey[]).map((key) => {
                const th = CUTE_THEMES[key];
                const isSel = cuteTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectCuteTheme(key)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isSel
                        ? `${th.btnPrimary} scale-105 ring-2 ring-white shadow-xs`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
                    }`}
                    title={`Đổi màu dễ thương: ${th.name}`}
                  >
                    <span>{th.icon}</span>
                    <span className="text-2xs font-semibold">{th.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Status Pill & Guide */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${
                  syncStatus.state === 'saved' || syncStatus.state === 'idle'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{syncStatus.state === 'saved' ? 'Đã đồng bộ CSDL' : 'Dùng thử / Cục bộ'}</span>
              </div>

              <button
                onClick={() => setIsGuideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-pink-200 text-slate-700 hover:bg-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-pink-500" />
                <span>Hướng dẫn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OVERVIEW STATS CARDS VỚI MÀU PASTEL DỄ THƯƠNG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock */}
        <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Tồn Kho Sẵn Sàng</span>
                <span className="text-2xs">🌸</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {metrics.totalStock}{' '}
                <span className="text-sm font-semibold text-pink-600">miếng</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100 shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-pink-100/80 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-pink-700">{metrics.activeProductsCount} loại sản phẩm chu đáo</span>
            <button
              onClick={() => setActiveTab('products')}
              className="text-pink-600 hover:text-pink-700 font-bold inline-flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              Chi tiết kho →
            </button>
          </div>
        </div>

        {/* Card 2: Dispatched this month */}
        <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                  Đã Cấp {metrics.currentMonthLabel}
                </span>
                <span className="text-2xs">💕</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-pink-600 mt-1">
                {metrics.totalDispatchedThisMonth}{' '}
                <span className="text-sm font-semibold text-slate-500">miếng</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-pink-100/80 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-medium text-slate-600">{metrics.dispatchCountThisMonth} lượt cấp trong tháng</span>
            <span className="text-pink-600 font-semibold">Tất cả: {metrics.totalDispatchedAllTime} m</span>
          </div>
        </div>

        {/* Card 3: Total Dispatches Count */}
        <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Số Lượt Cấp Hỗ Trợ</span>
                <span className="text-2xs">✨</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-1">
                {metrics.totalDispatchCountAllTime}{' '}
                <span className="text-sm font-semibold text-slate-500">lượt</span>
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100/80 text-xs text-slate-500 flex items-center justify-between">
            <span className="text-purple-700 font-semibold">Kịp thời & Ấm áp</span>
            <span className="text-slate-400">100% Ẩn danh</span>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div
          className={`border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
            metrics.hasLowStockAlert
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-100'
              : `bg-white/95 ${activeCuteTheme.cardBorder} hover:shadow-md`
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Tình Trạng Dự Trữ</span>
                <span className="text-2xs">🌷</span>
              </div>
              <h3
                className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                  metrics.hasLowStockAlert ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {metrics.hasLowStockAlert ? `${metrics.lowStockProducts.length} loại sắp hết` : 'Kho an toàn đầy đủ 🌸'}
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                metrics.hasLowStockAlert
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}
            >
              {metrics.hasLowStockAlert ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {metrics.hasLowStockAlert ? (
              <button
                onClick={() => {
                  const now = new Date();
                  setImportForm((prev) => ({
                    ...prev,
                    importDate: formatDateVN(now.toISOString()),
                    importTime: formatTime24H(now),
                    importDateTimeCombined: formatDateTime24H(now),
                  }));
                  setIsImportDatePickerOpen(false);
                  setIsImportTimePickerOpen(false);
                  setIsImportCombinedPickerOpen(false);
                  setIsImportModalOpen(true);
                }}
                className="text-amber-800 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                Nhập bổ sung ngay +
              </button>
            ) : (
              <span className="text-emerald-700 font-medium">Sẵn sàng chăm sóc học đường</span>
            )}
            <button
              onClick={() => setActiveTab('products')}
              className="text-pink-600 hover:text-pink-800 underline font-semibold cursor-pointer"
            >
              Cài ngưỡng
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & NAV TABS BAR VỚI THIẾT KẾ DỄ THƯƠNG */}
      <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5`}>
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? activeCuteTheme.tabActive
                : 'text-slate-600 hover:bg-pink-50/70 border border-transparent'
            }`}
          >
            <span>🌸</span>
            <span>Tổng quan kho</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? activeCuteTheme.tabActive
                : 'text-slate-600 hover:bg-pink-50/70 border border-transparent'
            }`}
          >
            <span>📋</span>
            <span>Lịch sử cấp & Nhập ({combinedHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'report'
                ? activeCuteTheme.tabActive
                : 'text-slate-600 hover:bg-pink-50/70 border border-transparent'
            }`}
          >
            <span>📊</span>
            <span>Báo cáo tổng hợp A4</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'products'
                ? activeCuteTheme.tabActive
                : 'text-slate-600 hover:bg-pink-50/70 border border-transparent'
            }`}
          >
            <span>⚙️</span>
            <span>Quản lý danh mục BVS</span>
          </button>
        </div>

        {/* Big Action Buttons - Cấp phát siêu dễ thương */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              const now = new Date();
              const dVN = formatDateVN(now.toISOString());
              const t24 = formatTime24H(now);
              setDispatchDate(dVN);
              setDispatchTime(t24);
              setIsDispatchDateCalendarOpen(false);
              setDispatchForm((prev) => ({
                ...prev,
                dateTime: `${dVN} ${t24}`,
                quantity: 1,
                notes: '',
              }));
              setIsDispatchModalOpen(true);
            }}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl ${activeCuteTheme.btnPrimary} active:scale-98 font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer group`}
          >
            <Heart className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" />
            <span>🌸 + Cấp phát cho nữ sinh 💕</span>
          </button>

          <button
            onClick={() => {
              const now = new Date();
              setImportForm((prev) => ({
                ...prev,
                importDate: formatDateVN(now.toISOString()),
                importTime: formatTime24H(now),
                importDateTimeCombined: formatDateTime24H(now),
                notes: '',
              }));
              setIsImportDatePickerOpen(false);
              setIsImportTimePickerOpen(false);
              setIsImportCombinedPickerOpen(false);
              setIsImportModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>📦 + Nhập bổ sung kho</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: TỔNG QUAN KHO & DANH MỤC HIỆN TẠI
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Low Stock Banner if any */}
          {metrics.hasLowStockAlert && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-amber-900">
                  Cảnh báo: Có {metrics.lowStockProducts.length} loại sản phẩm đang dưới ngưỡng dự trữ tối thiểu!
                </p>
                <p className="text-amber-800 mt-0.5">
                  Các mặt hàng:{' '}
                  {metrics.lowStockProducts.map((p) => `${p.name} (còn ${p.stockQuantity} m)`).join(', ')}. Hãy nhấn nút
                  "Nhập kho" để bổ sung đảm bảo công tác y tế học đường không bị gián đoạn.
                </p>
              </div>
            </div>
          )}

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeProducts.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white/90 border-2 border-dashed border-pink-300 rounded-3xl shadow-xs space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-100 flex items-center justify-center text-2xl">
                  🌸
                </div>
                <h4 className="text-base font-extrabold text-slate-800">Kho BVS chưa có danh mục sản phẩm</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hiện tại danh mục sản phẩm đang trống. Bạn có thể nạp nhanh danh mục tiêu chuẩn của trường (Diana, Kotex, Laurier) hoặc tự nhập loại mới.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      db.restoreDefaultSanitaryProducts();
                      triggerToast('Đã khôi phục danh mục BVS chuẩn (Diana, Kotex, Laurier)!', 'success');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>🌸 Nạp danh mục chuẩn (Laurier, Diana, Kotex)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>📦 Nhập kho loại mới</span>
                  </button>
                </div>
              </div>
            )}
            {activeProducts.map((prod) => {
              const isLow = prod.stockQuantity <= prod.minAlertThreshold;
              return (
                <div
                  key={prod.id}
                  className={`border rounded-2xl p-5 bg-white/95 shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${
                    isLow ? 'border-amber-300 ring-2 ring-amber-100' : activeCuteTheme.cardBorder
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-pink-50 text-pink-700 text-2xs font-bold uppercase border border-pink-200/70">
                        🌸 {prod.brand || 'Băng Vệ Sinh'}
                      </span>
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Cần nhập thêm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sẵn sàng 💕
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2 line-clamp-2">
                      {prod.name}
                    </h4>
                    {prod.notes && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.notes}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-pink-100/80">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Tồn kho hiện có:</span>
                      <div className="text-right">
                        <span className={`text-xl font-extrabold ${isLow ? 'text-amber-700' : 'text-pink-600'}`}>
                          {prod.stockQuantity}
                        </span>{' '}
                        <span className="text-xs font-semibold text-slate-500">miếng</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-400 mt-1.5">
                      <span>Ngưỡng báo: {prod.minAlertThreshold} m</span>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const dVN = formatDateVN(now.toISOString());
                          const t24 = formatTime24H(now);
                          setDispatchDate(dVN);
                          setDispatchTime(t24);
                          setIsDispatchDateCalendarOpen(false);
                          setDispatchForm((prev) => ({
                            ...prev,
                            productId: prod.id,
                            quantity: 1,
                            dateTime: `${dVN} ${t24}`,
                          }));
                          setIsDispatchModalOpen(true);
                        }}
                        disabled={prod.stockQuantity <= 0}
                        className="text-pink-600 hover:text-pink-700 font-extrabold hover:underline disabled:text-slate-300 disabled:no-underline cursor-pointer flex items-center gap-0.5"
                      >
                        <span>🌸 Cấp loại này +</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Dispatches Summary List */}
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl shadow-xs overflow-hidden`}>
            <div className="px-5 py-4 border-b border-pink-100/90 bg-pink-50/40 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <span>🌸 Lượt cấp phát yêu thương gần đây</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Hỗ trợ các em nữ sinh mới nhất (100% ẩn danh bảo mật quyền riêng tư)</p>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Xem tất cả lịch sử</span>
                <span>💕 →</span>
              </button>
            </div>

            <div className="divide-y divide-pink-100/60">
              {dispatchesList.slice(0, 5).map((d) => (
                <div key={d.id} className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-pink-50/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 border border-pink-100 shadow-2xs">
                      <Heart className="w-5 h-5 fill-pink-400 text-pink-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{d.productName}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-pink-100 text-pink-800 text-2xs font-bold border border-pink-200">
                          Lớp {d.className}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-2xs font-bold border border-emerald-200">
                          Bảo mật danh tính 💕
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-2xs text-slate-400">{d.dispatchCode}</span>
                        <span>•</span>
                        <span>{formatDateTimeVN(d.dateTime)}</span>
                        <span>•</span>
                        <span>Cán bộ cấp: {d.dispenserName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-extrabold text-pink-600">
                      {d.quantity} miếng
                    </span>
                    <div className="text-2xs text-slate-400">
                      {d.status === 'completed' ? 'Hoàn tất 🌸' : 'Đã hủy'}
                    </div>
                  </div>
                </div>
              ))}

              {dispatchesList.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                  Chưa có giao dịch cấp phát nào trong kỳ này.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: LỊCH SỬ GIAO DỊCH (HISTORY & AUDIT)
         ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-4 shadow-xs space-y-3`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Type Switcher */}
              <div className="flex items-center gap-1 bg-pink-50/70 p-1 rounded-xl w-fit border border-pink-100">
                <button
                  onClick={() => setHistoryType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({combinedHistory.length})
                </button>
                <button
                  onClick={() => setHistoryType('dispatch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyType === 'dispatch' ? 'bg-white text-pink-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cấp phát ({dispatchesList.length})
                </button>
                <button
                  onClick={() => setHistoryType('import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyType === 'import' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nhập kho ({importsList.length})
                </button>
              </div>

              {/* Date Presets & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 mr-1 hidden sm:inline">Lọc nhanh:</span>
                  <button
                    onClick={() => applyDatePreset('today')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => applyDatePreset('week')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Tuần này
                  </button>
                  <button
                    onClick={() => applyDatePreset('month')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Tháng này
                  </button>
                  <button
                    onClick={() => applyDatePreset('all')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Tất cả
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const res = db.clearAllStudentNamesFromDispatches();
                      triggerToast(`Đã rà soát & xóa sạch tên học sinh trong sổ cấp phát (${res.clearedCount} lượt)!`, 'success');
                    }}
                    title="Rà soát và xóa sạch toàn bộ tên/mã học sinh trong toàn bộ giao dịch cấp phát"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-2xs sm:text-xs transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Xóa hết tên học sinh (Bảo mật 100%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Xóa toàn bộ sổ cấp phát BVS?',
                        message: 'Thầy/Cô có chắc chắn muốn xóa toàn bộ lịch sử cấp phát BVS hiện tại không? Toàn bộ các dòng cấp phát sẽ được xóa sạch để bắt đầu ghi chép mới. Tồn kho sản phẩm được bảo lưu nguyên vẹn.',
                        confirmText: 'Xóa sạch sổ cấp phát',
                        confirmColor: 'rose',
                        onConfirm: () => {
                          const res = db.clearAllSanitaryDispatches();
                          triggerToast(`Đã xóa sạch toàn bộ ${res.count} lượt cấp phát BVS!`, 'success');
                        },
                      });
                    }}
                    title="Xóa toàn bộ các lượt cấp phát đã ghi để làm sạch dữ liệu"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-2xs sm:text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xóa sạch sổ cấp phát</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã, lớp, người cấp..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="all">Tất cả lớp học</option>
                  {classesList.map((c) => (
                    <option key={c.id} value={c.name}>
                      Lớp {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Filter */}
              <div>
                <select
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="all">Tất cả loại sản phẩm</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  placeholder="Từ ngày"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                />
              </div>

              {/* End Date */}
              <div>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  placeholder="Đến ngày"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl shadow-xs overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className={`${activeCuteTheme.tableHead} font-bold border-b border-pink-200 uppercase text-2xs tracking-wider`}>
                  <tr>
                    <th className="py-3 px-4">Loại & Mã Phiếu</th>
                    <th className="py-3 px-4">Ngày Giờ</th>
                    <th className="py-3 px-4">Sản Phẩm & ĐVT</th>
                    <th className="py-3 px-4 text-center">Lớp & Đối Tượng Nhận</th>
                    <th className="py-3 px-4 text-right">Số Lượng</th>
                    <th className="py-3 px-4">Cán Bộ Y Tế Phụ Trách</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedHistory.map((item) => {
                    const isDispatch = item.kind === 'dispatch';
                    const isCancelled = item.status === 'cancelled';
                    return (
                      <tr
                        key={`${item.kind}-${item.id}`}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isCancelled ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isDispatch ? 'bg-pink-100 text-pink-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isDispatch ? (
                                <HeartHandshake className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 font-mono text-xs">
                                {isDispatch ? item.dispatchCode : item.importCode}
                              </span>
                              <div className="text-2xs text-slate-400">
                                {isDispatch ? 'Cấp phát học sinh' : 'Nhập kho'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {isDispatch ? formatDateTimeVN(item.dateTime) : formatDateVN(item.importDate)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          {item.notes && (
                            <div className="text-2xs text-slate-500 italic mt-0.5 max-w-xs truncate">
                              "{item.notes}"
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isDispatch ? (
                            <div>
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200">
                                Lớp {item.className}
                              </span>
                              <div className="text-2xs text-emerald-700 font-semibold mt-0.5 flex items-center justify-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0 inline" />
                                <span>Nữ sinh (Bảo mật 100%)</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-2xs border border-emerald-200">
                                {item.sourceOrSponsor}
                              </span>
                              <div className="text-2xs text-slate-400 mt-0.5 font-medium">
                                Nhập vào Kho Y tế
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-extrabold text-sm ${
                              isDispatch ? 'text-pink-600' : 'text-emerald-700'
                            }`}
                          >
                            {isDispatch ? `-${item.quantity}` : `+${item.totalPieces}`}
                          </span>{' '}
                          <span className="text-xs text-slate-500">miếng</span>
                          {!isDispatch && item.packagingType === 'pack' && (
                            <div className="text-2xs text-slate-400">
                              ({item.packCount} gói x {item.piecesPerPack} m)
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isDispatch ? item.dispenserName : item.receiverName}</span>
                          </div>
                          <div className="text-2xs text-slate-400 font-medium pl-5">
                            {isDispatch ? 'CBYT thực hiện cấp phát' : 'CBYT tiếp nhận kho'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isCancelled ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-2xs font-semibold">
                              Đã hủy
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-2xs font-semibold">
                              Hoàn tất
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isDispatch && (
                              <button
                                onClick={() => setViewingDispatch(item as SanitaryNapkinDispatch)}
                                title="Xem chi tiết phiếu"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {!isCancelled && (
                              <button
                                onClick={() => {
                                  setCancellingItem({
                                    type: isDispatch ? 'dispatch' : 'import',
                                    id: item.id,
                                    code: isDispatch ? item.dispatchCode : item.importCode,
                                    name: item.productName,
                                    quantity: isDispatch ? item.quantity : item.totalPieces,
                                  });
                                  setCancelReason('');
                                }}
                                title="Hủy phiếu (Hoàn trả tồn kho)"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Nút Xóa vĩnh viễn phiếu */}
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: `Xóa vĩnh viễn phiếu ${isDispatch ? item.dispatchCode : item.importCode}?`,
                                  message: `Bạn có chắc chắn muốn xóa vĩnh viễn phiếu ${isDispatch ? item.dispatchCode : item.importCode} (${isDispatch ? `Cấp ${item.quantity} miếng cho lớp ${item.className}` : `Nhập ${item.totalPieces} miếng`}) khỏi hệ thống không? Dữ liệu phiếu sẽ bị xóa hoàn toàn.`,
                                  confirmText: 'Xóa vĩnh viễn',
                                  confirmColor: 'rose',
                                  onConfirm: () => {
                                    if (isDispatch) {
                                      db.deleteSanitaryDispatch(item.id, !isCancelled);
                                    } else {
                                      db.deleteSanitaryImport(item.id, !isCancelled);
                                    }
                                    triggerToast(`Đã xóa vĩnh viễn phiếu ${isDispatch ? item.dispatchCode : item.importCode}`, 'success');
                                  },
                                });
                              }}
                              title="Xóa vĩnh viễn phiếu này khỏi hệ thống"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {combinedHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                        Không có giao dịch nào khớp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: BÁO CÁO TỔNG HỢP & IN / XUẤT EXCEL
         ========================================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Report Control Toolbar */}
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Kỳ báo cáo:</span>
              <button
                onClick={() => setReportRangeType('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportRangeType === 'week' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Tuần này
              </button>
              <button
                onClick={() => setReportRangeType('month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportRangeType === 'month' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Tháng này
              </button>
              <button
                onClick={() => setReportRangeType('semester1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportRangeType === 'semester1' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Học kỳ 1
              </button>
              <button
                onClick={() => setReportRangeType('semester2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportRangeType === 'semester2' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Học kỳ 2
              </button>
              <button
                onClick={() => setReportRangeType('year')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  reportRangeType === 'year' ? 'bg-pink-100 text-pink-800 border border-pink-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Cả năm học
              </button>
            </div>

            {/* Action buttons: Export & Print */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => exportSanitaryNapkinReportExcel(reportData, 'TRƯỜNG THCS ĐÔNG THẠNH')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel (.xlsx)</span>
              </button>

              <button
                onClick={() =>
                  printSanitaryNapkinReportA4(reportData, 'TRƯỜNG THCS ĐÔNG THẠNH', {
                    name1: reportSignerMedic,
                    name2: reportSignerPrincipal,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Báo Cáo A4</span>
              </button>
            </div>
          </div>

          {/* Signers Configuration Banner for Report */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  Người ký trên bản in A4:
                </span>
                <span className="text-xs text-slate-600">
                  CBYT: <strong className="text-pink-700 font-bold">{reportSignerMedic}</strong> • Phê duyệt:{' '}
                  <strong className="text-slate-800 font-bold">{reportSignerPrincipal}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingSigners(!isEditingSigners)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer w-fit"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingSigners ? 'Đóng' : 'Đổi người ký báo cáo'}</span>
              </button>
            </div>

            {isEditingSigners && (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cán bộ y tế ký báo cáo (Bên trái): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportSignerMedic}
                    onChange={(e) => setReportSignerMedic(e.target.value)}
                    placeholder="VD: Cô Đoàn Thị Minh Trang"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hiệu trưởng / Ban Giám Hiệu ký duyệt (Bên phải): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportSignerPrincipal}
                    onChange={(e) => setReportSignerPrincipal(e.target.value)}
                    placeholder="VD: Ban Giám Hiệu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = templateConfigService.getConfig();
                      templateConfigService.saveConfig({
                        ...cur,
                        signatory1Name: reportSignerMedic.trim(),
                        signatory2Name: reportSignerPrincipal.trim(),
                      });
                      triggerToast('Đã lưu thông tin người ký báo cáo thành công!', 'success');
                      setIsEditingSigners(false);
                    }}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu & Áp Dụng Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note Banner (Mandatory Requirement) */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-sky-900 shadow-2xs">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Nguyên tắc bảo vệ quyền riêng tư & chuẩn mực y tế học đường:</p>
              <p className="mt-0.5 text-sky-800 leading-relaxed">
                {reportData.privacyNote} Báo cáo tổng hợp mặc định không hiển thị danh tính học sinh. Dữ liệu chỉ phục
                vụ công tác thống kê dự trù kinh phí, cân đối vật tư và đánh giá nhu cầu chăm sóc sức khỏe vị thành
                niên tại trường.
              </p>
            </div>
          </div>

          {/* Summary Figures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Kỳ Đang Xem</span>
              <p className="text-base font-bold text-slate-800 mt-1">{reportData.periodLabel}</p>
              <p className="text-2xs text-slate-400 mt-0.5">
                {formatDateVN(reportData.startDate)} - {formatDateVN(reportData.endDate)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Số Lượt Cấp Hỗ Trợ</span>
              <p className="text-2xl font-extrabold text-pink-600 mt-1">{reportData.totalDispatchCount} lượt</p>
              <p className="text-2xs text-slate-400 mt-0.5">
                (Trong đó: {reportData.anonymousCount} lượt ẩn danh)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tổng Số Miếng Đã Cấp</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">
                {reportData.totalDispatchedPieces} miếng
              </p>
              <p className="text-2xs text-slate-400 mt-0.5">Tiêu hao thực tế</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Nhập Kho Trong Kỳ</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {reportData.totalImportedPieces} miếng
              </p>
              <p className="text-2xs text-slate-400 mt-0.5">Tồn hiện tại: {reportData.totalCurrentStock} m</p>
            </div>
          </div>

          {/* Table Breakdown by Product */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                1. Phân bổ cấp phát theo từng loại sản phẩm
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-2xs">
                  <tr>
                    <th className="py-3 px-4">Tên loại sản phẩm</th>
                    <th className="py-3 px-4">Thương hiệu</th>
                    <th className="py-3 px-4 text-center">ĐVT</th>
                    <th className="py-3 px-4 text-right">Tồn kho hiện tại</th>
                    <th className="py-3 px-4 text-right">Số lượt cấp</th>
                    <th className="py-3 px-4 text-right">Tổng miếng cấp</th>
                    <th className="py-3 px-4 text-center">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.byProduct.map((item) => {
                    const isLow = item.product.stockQuantity <= item.product.minAlertThreshold;
                    return (
                      <tr key={item.product.id}>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item.product.name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{item.product.brand || '---'}</td>
                        <td className="py-3.5 px-4 text-center text-slate-500">miếng</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                          {item.product.stockQuantity}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600">{item.count} lượt</td>
                        <td className="py-3.5 px-4 text-right font-bold text-pink-600">{item.pieces} m</td>
                        <td className="py-3.5 px-4 text-center">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-2xs">
                              ⚠️ Dưới ngưỡng
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium text-2xs">
                              Đảm bảo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Breakdown by Class */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                2. Phân bổ cấp phát theo từng lớp học (Không lưu danh tính cá nhân)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-2xs">
                  <tr>
                    <th className="py-3 px-4">Lớp tiếp nhận</th>
                    <th className="py-3 px-4 text-right">Số lượt hỗ trợ</th>
                    <th className="py-3 px-4 text-right">Tổng số miếng đã nhận</th>
                    <th className="py-3 px-4">Tỷ lệ trong kỳ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.byClass.map((c) => {
                    const percent = reportData.totalDispatchedPieces > 0
                      ? Math.round((c.pieces / reportData.totalDispatchedPieces) * 100)
                      : 0;
                    return (
                      <tr key={c.className}>
                        <td className="py-3 px-4 font-bold text-slate-900">Lớp {c.className}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{c.count} lượt</td>
                        <td className="py-3 px-4 text-right font-bold text-pink-600">{c.pieces} miếng</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                            <span className="text-2xs text-slate-500">{percent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reportData.byClass.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu cấp phát trong khoảng thời gian này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: QUẢN LÝ DANH MỤC & CÀI ĐẶT NGƯỠNG TỒN
         ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                  <span>🌸 Danh mục Băng Vệ Sinh & Định mức dự trữ</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold text-2xs border border-pink-200">
                  Tự do thêm bớt
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tự do tạo mới, chỉnh sửa, xóa các loại BVS theo nhu cầu thực tế của nhà trường.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const res = db.clearAllStudentNamesFromDispatches();
                  triggerToast(`Đã rà soát & xóa sạch tên học sinh trong sổ cấp phát (${res.clearedCount} lượt)!`, 'success');
                }}
                title="Rà soát và xóa sạch toàn bộ tên/mã học sinh trong toàn bộ giao dịch cấp phát"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Xóa hết tên học sinh (Bảo mật)</span>
              </button>

              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Làm trống toàn bộ danh mục BVS?',
                    message: 'Bạn có chắc chắn muốn làm trống toàn bộ danh mục BVS để tự nhập các loại sản phẩm thực tế trường đang có từ đầu không?',
                    confirmText: 'Làm trống danh mục',
                    confirmColor: 'rose',
                    onConfirm: () => {
                      db.clearAllSanitaryProducts();
                      triggerToast('Đã làm trống danh mục. Thầy/Cô có thể tự nhập loại sản phẩm mới!', 'info');
                    },
                  });
                }}
                title="Làm trống toàn bộ sản phẩm để tự nhập các loại thực tế của trường"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Làm trống để tự nhập</span>
              </button>

              <button
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Khôi phục danh mục BVS mẫu chuẩn?',
                    message: 'Khôi phục lại danh mục các loại BVS chuẩn học đường (Diana ban ngày, Kotex ban đêm, v.v.)?',
                    confirmText: 'Khôi phục mẫu',
                    confirmColor: 'emerald',
                    onConfirm: () => {
                      db.restoreDefaultSanitaryProducts();
                      triggerToast('Đã khôi phục danh mục sản phẩm mẫu chuẩn!', 'success');
                    },
                  });
                }}
                title="Khôi phục danh mục sản phẩm mẫu chuẩn"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu</span>
              </button>

              <button
                onClick={handleOpenAddProduct}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl ${activeCuteTheme.btnPrimary} font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer`}
              >
                <Plus className="w-4 h-4" />
                <span>🌸 + Tự nhập loại BVS mới</span>
              </button>
            </div>
          </div>

          {/* Products List Table */}
          <div className={`bg-white/95 border ${activeCuteTheme.cardBorder} rounded-2xl shadow-xs overflow-hidden`}>
            {products.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-200">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Danh mục BVS hiện đang trống</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Thầy/Cô có thể bấm nút <strong>"+ Tự nhập loại BVS mới"</strong> bên trên để nhập các sản phẩm thực tế trường đang có, hoặc bấm <strong>"Khôi phục mẫu"</strong> để dùng danh mục chuẩn học đường.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + Tự nhập loại BVS ngay
                  </button>
                  <button
                    onClick={() => {
                      db.restoreDefaultSanitaryProducts();
                      triggerToast('Đã khôi phục danh mục sản phẩm mẫu!', 'success');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Khôi phục danh mục mẫu
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className={`${activeCuteTheme.tableHead} font-bold border-b border-pink-200 uppercase text-2xs`}>
                    <tr>
                      <th className="py-3 px-4">Tên loại sản phẩm</th>
                      <th className="py-3 px-4">Thương hiệu</th>
                      <th className="py-3 px-4 text-center">ĐVT</th>
                      <th className="py-3 px-4 text-right">Tồn kho (miếng)</th>
                      <th className="py-3 px-4 text-right">Ngưỡng cảnh báo</th>
                      <th className="py-3 px-4">Ghi chú mục đích</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const isLow = p.stockQuantity <= p.minAlertThreshold;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3.5 px-4 text-slate-600">{p.brand || '---'}</td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-medium">miếng</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`font-extrabold text-sm ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                              {p.stockQuantity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600 font-semibold">
                            ≤ {p.minAlertThreshold} miếng
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate">
                            {p.notes || '---'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.isActive ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-2xs font-semibold">
                                Đang dùng
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-2xs">
                                Đã ngưng
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                title="Sửa thông tin / Ngưỡng"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: `Xóa loại "${p.name}"?`,
                                    message: `Bạn có chắc chắn muốn xóa sản phẩm "${p.name}" (${p.brand || 'Chung'}) khỏi danh mục BVS của trường không?`,
                                    confirmText: 'Xóa loại này',
                                    confirmColor: 'rose',
                                    onConfirm: () => {
                                      db.deleteSanitaryProduct(p.id);
                                      triggerToast(`Đã xóa loại "${p.name}" khỏi danh mục`, 'info');
                                    },
                                  });
                                }}
                                title="Xóa loại này khỏi danh mục"
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CẤP PHÁT BĂNG VỆ SINH CHO HỌC SINH NỮ (MÀU DỄ THƯƠNG)
         ========================================================================= */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-pink-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Cute Header */}
            <div className={`px-6 py-4 bg-gradient-to-r ${activeCuteTheme.headerGradient} text-white flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-2xs">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-1.5">
                    <span>{activeCuteTheme.icon} Cấp Phát BVS Cho Nữ Sinh</span>
                    <span>💕</span>
                  </h3>
                  <p className="text-2xs sm:text-xs text-white/90">Kín đáo • Tế nhị • Dễ thương • Bảo mật 100% riêng tư</p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDispatchSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {/* Cute Privacy & Emotional Care Callout */}
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 border border-pink-200/90 rounded-2xl p-3.5 flex items-start gap-2.5 text-pink-950 text-xs shadow-2xs">
                <Heart className="w-4 h-4 text-pink-500 fill-pink-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-pink-900">🌸 Lời nhắn gửi yêu thương:</strong> Phòng y tế luôn là điểm tựa an toàn, ấm áp và chu đáo. Nữ sinh không cần e ngại, mọi thông tin đều được bảo mật 100% (Ẩn danh hoàn toàn, không lưu tên học sinh).
                </div>
              </div>

              {/* Box Thời Điểm Cấp: Rõ ràng, Dễ hiểu, Cực kỳ Dễ dùng */}
              <div className="bg-pink-50/70 border border-pink-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                {/* Header row with current time status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-pink-200/80">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                        Thời điểm cấp phát <span className="text-rose-500">*</span>
                      </h4>
                      <p className="text-2xs text-slate-500">
                        Chuẩn 24 giờ • Nhập tay trực tiếp hoặc chọn nhanh 1 chạm
                      </p>
                    </div>
                  </div>

                  {/* Nút bấm nhanh "Lấy giờ hiện tại" */}
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const dVN = formatDateVN(now.toISOString());
                      const t24 = formatTime24H(now);
                      setDispatchDate(dVN);
                      setDispatchTime(t24);
                      setDispatchForm((prev) => ({ ...prev, dateTime: `${dVN} ${t24}` }));
                      triggerToast('Đã điền thời gian hiện tại chuẩn 24h', 'info');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-2xs sm:text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lấy giờ hiện tại (Bây giờ)</span>
                  </button>
                </div>

                {/* 2 ô nhập rõ ràng: Ngày cấp & Giờ cấp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ô 1: Ngày cấp (DD/MM/YYYY) */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        📅 Ngày cấp (Ngày/Tháng/Năm)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const todayVN = formatDateVN(new Date().toISOString());
                          setDispatchDate(todayVN);
                          setDispatchForm((prev) => ({ ...prev, dateTime: `${todayVN} ${dispatchTime}` }));
                        }}
                        className="text-2xs font-bold text-pink-600 hover:underline cursor-pointer"
                      >
                        Hôm nay
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={dispatchDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDispatchDate(val);
                          setDispatchForm((prev) => ({ ...prev, dateTime: `${val} ${dispatchTime}` }));
                        }}
                        onBlur={() => {
                          if (dispatchDate.trim()) {
                            const iso = normalizeDateToISO(dispatchDate.trim());
                            if (iso) {
                              const norm = formatDateVN(iso);
                              setDispatchDate(norm);
                              setDispatchForm((prev) => ({ ...prev, dateTime: `${norm} ${dispatchTime}` }));
                            }
                          }
                        }}
                        placeholder="DD/MM/YYYY (VD: 03/11/2026)"
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-pink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setIsDispatchDateCalendarOpen(!isDispatchDateCalendarOpen)}
                        className="absolute right-1.5 p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 cursor-pointer transition-colors"
                        title="Bấm để chọn ngày trên lịch"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-2xs text-slate-500 mt-1 flex items-center justify-between px-0.5">
                      <span>Ví dụ: <strong>03/11/2026</strong></span>
                      <span className="text-emerald-700 font-medium">Gõ phím tự do</span>
                    </div>

                    {/* Popover chọn lịch */}
                    {isDispatchDateCalendarOpen && (
                      <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white border-2 border-pink-200 rounded-2xl shadow-xl p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-pink-100">
                          <span className="font-bold text-slate-700">Chọn ngày trực quan:</span>
                          <button
                            type="button"
                            onClick={() => setIsDispatchDateCalendarOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="date"
                          value={(() => {
                            try {
                              return normalizeDateToISO(dispatchDate) || '';
                            } catch {
                              return '';
                            }
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const norm = formatDateVN(val);
                              setDispatchDate(norm);
                              setDispatchForm((prev) => ({ ...prev, dateTime: `${norm} ${dispatchTime}` }));
                              setIsDispatchDateCalendarOpen(false);
                            }
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Ô 2: Giờ cấp (Chuẩn 24 giờ HH:mm) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        🕒 Giờ cấp (Chuẩn 24h, không AM/PM)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nowT = formatTime24H(new Date());
                          setDispatchTime(nowT);
                          setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${nowT}` }));
                        }}
                        className="text-2xs font-bold text-pink-600 hover:underline cursor-pointer"
                      >
                        Giờ này
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={dispatchTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDispatchTime(val);
                          setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${val}` }));
                        }}
                        onBlur={() => {
                          if (dispatchTime.trim()) {
                            const norm = normalizeManualTime24H(dispatchTime.trim());
                            if (norm) {
                              setDispatchTime(norm);
                              setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${norm}` }));
                            }
                          }
                        }}
                        placeholder="HH:mm (VD: 14:30)"
                        className="w-full pl-3 pr-24 py-2.5 bg-white border border-pink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs"
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        <select
                          value={dispatchTime.split(':')[0] || '14'}
                          onChange={(e) => {
                            const h = e.target.value.padStart(2, '0');
                            const m = dispatchTime.split(':')[1] || '00';
                            const newT = `${h}:${m}`;
                            setDispatchTime(newT);
                            setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${newT}` }));
                          }}
                          className="px-1 py-1 bg-pink-50 border border-pink-200 rounded-md text-2xs font-bold text-pink-700 cursor-pointer"
                          title="Chọn nhanh giờ 24h"
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const val = String(i).padStart(2, '0');
                            return (
                              <option key={val} value={val}>
                                {val}h
                              </option>
                            );
                          })}
                        </select>
                        <span className="text-xs font-bold text-slate-400">:</span>
                        <select
                          value={dispatchTime.split(':')[1] || '00'}
                          onChange={(e) => {
                            const m = e.target.value.padStart(2, '0');
                            const h = dispatchTime.split(':')[0] || '14';
                            const newT = `${h}:${m}`;
                            setDispatchTime(newT);
                            setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${newT}` }));
                          }}
                          className="px-1 py-1 bg-pink-50 border border-pink-200 rounded-md text-2xs font-bold text-pink-700 cursor-pointer"
                          title="Chọn nhanh phút"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((min) => (
                            <option key={min} value={min}>
                              {min}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-2xs text-slate-500 mt-1 flex items-center justify-between px-0.5">
                      <span>Chuẩn 24h: <strong>00:00 - 23:59</strong></span>
                      <span className="text-pink-600 font-medium">Không có AM/PM</span>
                    </div>
                  </div>
                </div>

                {/* Gợi ý mốc thời gian học đường bấm 1 chạm */}
                <div>
                  <div className="text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>⚡ Bấm 1 chạm chọn mốc giờ học đường:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const dVN = formatDateVN(now.toISOString());
                        const t24 = formatTime24H(now);
                        setDispatchDate(dVN);
                        setDispatchTime(t24);
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dVN} ${t24}` }));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-pink-100/90 hover:bg-pink-200 text-pink-800 font-extrabold text-2xs border border-pink-200 transition-colors cursor-pointer"
                    >
                      🌸 Bây giờ ({formatTime24H(new Date())})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() - 15 * 60 * 1000);
                        const t24 = formatTime24H(d);
                        setDispatchTime(t24);
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} ${t24}` }));
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                    >
                      ⏱️ 15 phút trước
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchTime('07:30');
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} 07:30` }));
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                    >
                      ☀️ 07:30 (Đầu giờ sáng)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchTime('09:15');
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} 09:15` }));
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                    >
                      🔔 09:15 (Ra chơi sáng)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchTime('13:30');
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} 13:30` }));
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                    >
                      🌤️ 13:30 (Đầu giờ chiều)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDispatchTime('15:00');
                        setDispatchForm((prev) => ({ ...prev, dateTime: `${dispatchDate} 15:00` }));
                      }}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                    >
                      🔔 15:00 (Ra chơi chiều)
                    </button>
                  </div>
                </div>

                {/* Banner kết quả thời gian đang chọn */}
                <div className="bg-white/95 border border-pink-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-pink-600 font-bold">✨ Thời điểm sẽ lưu:</span>
                    <strong className="text-pink-900 font-extrabold text-sm">
                      {dispatchTime} - Ngày {dispatchDate}
                    </strong>
                  </div>
                  <span className="text-2xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    ✓ Chuẩn 24h
                  </span>
                </div>
              </div>

              {/* Lớp tiếp nhận (Độc lập, rộng rãi, dễ thao tác) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp tiếp nhận <span className="text-rose-500">*</span>
                </label>
                <select
                  value={dispatchForm.className}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, className: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-pink-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs sm:text-sm font-semibold"
                >
                  {classesList.map((c) => (
                    <option key={c.id} value={c.name}>
                      Lớp {c.name}
                    </option>
                  ))}
                  <option value="custom">+ Lớp khác (Tự nhập)...</option>
                </select>
                {dispatchForm.className === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nhập tên lớp..."
                    required
                    value={dispatchForm.customClass}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, customClass: e.target.value })}
                    className="w-full mt-2 px-3.5 py-2 bg-white border border-pink-300 rounded-xl text-xs font-semibold"
                  />
                )}
              </div>

              {/* Product Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Loại sản phẩm BVS <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-2xs text-pink-600 font-bold flex items-center gap-1">
                    <span>🌸 Tự nhập được loại mới</span>
                  </span>
                </div>
                {activeProducts.length === 0 && (
                  <div className="mb-2.5 p-2.5 bg-pink-50 border border-pink-200 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-2xs text-pink-800 font-medium">Kho chưa có sẵn loại BVS nào.</span>
                    <button
                      type="button"
                      onClick={() => {
                        db.restoreDefaultSanitaryProducts();
                        triggerToast('Đã khôi phục danh mục BVS chuẩn (Diana, Kotex, Laurier)!', 'success');
                      }}
                      className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold text-2xs rounded-lg cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      🌸 Nạp danh mục chuẩn
                    </button>
                  </div>
                )}
                <select
                  value={dispatchForm.productId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-pink-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400 text-xs sm:text-sm font-medium"
                >
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                      {p.name} {p.brand ? `(${p.brand})` : ''} • Còn {p.stockQuantity} miếng{' '}
                      {p.stockQuantity <= 0 ? '(HẾT HÀNG)' : ''}
                    </option>
                  ))}
                  <option value="custom">➕ Tự nhập loại BVS mới (không có trong danh mục)...</option>
                </select>

                {/* Self-entered product inputs */}
                {(dispatchForm.productId === 'custom' || activeProducts.length === 0) && (
                  <div className="mt-2.5 p-3.5 bg-pink-50/70 border border-pink-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-2xs font-bold text-pink-700 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Thông tin loại Băng Vệ Sinh tự nhập:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          Tên loại BVS <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Kotex Siêu Mềm Siêu Mỏng 23cm..."
                          value={dispatchForm.customProductName}
                          onChange={(e) => setDispatchForm({ ...dispatchForm, customProductName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-pink-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          Thương hiệu (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Kotex, Diana, Laurier..."
                          value={dispatchForm.customProductBrand}
                          onChange={(e) => setDispatchForm({ ...dispatchForm, customProductBrand: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-pink-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">
                        Tồn kho ban đầu của loại này:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={dispatchForm.customInitialStock}
                          onChange={(e) =>
                            setDispatchForm({
                              ...dispatchForm,
                              customInitialStock: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-24 px-3 py-1.5 bg-white border border-pink-300 rounded-xl text-xs font-bold text-center focus:outline-none"
                        />
                        <span className="text-2xs text-slate-600">
                          miếng (Hệ thống sẽ lưu danh mục và trừ đi số miếng cấp)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity: with cute quick picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số lượng cấp (Đơn vị: miếng) <span className="text-rose-500">*</span>
                </label>
                
                {/* Cute quick selection pills */}
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  {[
                    { q: 1, label: '1 miếng (Khẩn cấp)', icon: '🌸' },
                    { q: 2, label: '2 miếng (Kèm dự phòng)', icon: '💕' },
                    { q: 3, label: '3 miếng (Cả ngày dài)', icon: '🌷' },
                  ].map((preset) => (
                    <button
                      key={preset.q}
                      type="button"
                      onClick={() => setDispatchForm((prev) => ({ ...prev, quantity: preset.q }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        dispatchForm.quantity === preset.q
                          ? `${activeCuteTheme.btnPrimary} scale-102 ring-2 ring-white shadow-xs`
                          : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-pink-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          quantity: Math.max(1, prev.quantity - 1),
                        }))
                      }
                      className="px-3.5 py-2 text-slate-600 hover:bg-pink-100 hover:text-pink-700 font-extrabold text-base cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      required
                      value={dispatchForm.quantity}
                      onChange={(e) =>
                        setDispatchForm({
                          ...dispatchForm,
                          quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-16 text-center font-extrabold text-base bg-white py-2 focus:outline-none text-pink-700"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          quantity: prev.quantity + 1,
                        }))
                      }
                      className="px-3.5 py-2 text-slate-600 hover:bg-pink-100 hover:text-pink-700 font-extrabold text-base cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    Mặc định: <strong>1 miếng</strong> (ấm áp, kín đáo và chu đáo)
                  </span>
                </div>
              </div>

              {/* Bảo mật danh tính học sinh 100% - Không ghi tên học sinh */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-pink-50 border border-emerald-200/90 rounded-2xl flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Bảo mật 100% danh tính học sinh nữ
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-2xs font-bold">
                      Ẩn danh tuyệt đối
                    </span>
                  </div>
                  <p className="text-2xs text-slate-600 mt-1 leading-relaxed">
                    Hệ thống không thu thập hay lưu trữ họ tên, mã số học sinh nhằm bảo vệ quyền riêng tư, tâm lý tế nhị và tạo sự an tâm, tự nhiên nhất cho các em nữ sinh trong nhà trường.
                  </p>
                </div>
              </div>

              {/* Dispenser & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cán bộ y tế cấp phát</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.dispenserName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, dispenserName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="VD: Giờ thể dục, Đau bụng kinh..."
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isDispatchSubmitting}
                  className={`px-6 py-2.5 rounded-xl ${activeCuteTheme.btnPrimary} active:scale-98 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer group`}
                >
                  {isDispatchSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" />
                      <span>🌸 Xác nhận cấp phát cho nữ sinh 💕</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: NHẬP KHO & TIẾP NHẬN TÀI TRỢ
         ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Nhập Kho / Tiếp Nhận Tài Trợ</h3>
                  <p className="text-2xs sm:text-xs text-emerald-100">Tự động quy đổi gói sang miếng và cộng tồn kho</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
              {/* Ngày nhập & Giờ nhập - Chuẩn 24 giờ & Cho phép gõ tay tự do + Chọn nhanh */}
              <div className="space-y-2.5 p-3.5 bg-emerald-50/50 border border-emerald-200/90 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Thời gian nhập kho (Chuẩn 24h)</span>
                  </span>

                  {/* Mode switcher: Tách riêng ngày & giờ HOẶC Nhập chung 1 ô */}
                  <div className="inline-flex p-0.5 bg-emerald-100/70 rounded-lg text-2xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setImportDateInputMode('separate');
                        setIsImportCombinedPickerOpen(false);
                      }}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        importDateInputMode === 'separate'
                          ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      Tách Ngày & Giờ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportDateInputMode('combined');
                        setIsImportDatePickerOpen(false);
                        setIsImportTimePickerOpen(false);
                        // Sync combined
                        setImportForm((prev) => ({
                          ...prev,
                          importDateTimeCombined: `${prev.importDate} ${prev.importTime}`,
                        }));
                      }}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        importDateInputMode === 'combined'
                          ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      1 Ô Chung (24h)
                    </button>
                  </div>
                </div>

                {/* Chế độ 1: Tách riêng Ngày & Giờ */}
                {importDateInputMode === 'separate' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Ngày nhập kho */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Ngày nhập kho <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const todayVN = formatDateVN(new Date().toISOString());
                            setImportForm((prev) => ({
                              ...prev,
                              importDate: todayVN,
                              importDateTimeCombined: `${todayVN} ${prev.importTime}`,
                            }));
                          }}
                          className="text-2xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        >
                          Hôm nay
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="text"
                          required
                          value={importForm.importDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImportForm((prev) => ({
                              ...prev,
                              importDate: val,
                              importDateTimeCombined: `${val} ${prev.importTime}`,
                            }));
                          }}
                          onBlur={() => {
                            if (importForm.importDate?.trim()) {
                              const iso = normalizeDateToISO(importForm.importDate.trim());
                              if (iso) {
                                const formatted = formatDateVN(iso);
                                setImportForm((prev) => ({
                                  ...prev,
                                  importDate: formatted,
                                  importDateTimeCombined: `${formatted} ${prev.importTime}`,
                                }));
                              }
                            }
                          }}
                          placeholder="DD/MM/YYYY (VD: 03/11/2026)"
                          className="w-full pl-3 pr-10 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportDatePickerOpen(!isImportDatePickerOpen);
                            setIsImportTimePickerOpen(false);
                          }}
                          className={`absolute right-1.5 p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isImportDatePickerOpen
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Chọn ngày qua lịch"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-2xs text-slate-500 mt-1 flex items-center justify-between px-1">
                        <span>Định dạng: <strong>DD/MM/YYYY</strong></span>
                        <span className="text-emerald-600 font-medium">Gõ tay tự do</span>
                      </div>

                      {/* Popover chọn ngày */}
                      {isImportDatePickerOpen && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white border-2 border-emerald-200 rounded-2xl shadow-xl p-3 text-xs space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Chọn nhanh ngày nhập kho</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsImportDatePickerOpen(false)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const todayVN = formatDateVN(new Date().toISOString());
                                setImportForm((prev) => ({
                                  ...prev,
                                  importDate: todayVN,
                                  importDateTimeCombined: `${todayVN} ${prev.importTime}`,
                                }));
                                setIsImportDatePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-2xs border border-emerald-200 transition-colors cursor-pointer"
                            >
                              📅 Hôm nay ({formatDateVN(new Date().toISOString())})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                                const yesterdayVN = formatDateVN(yesterday.toISOString());
                                setImportForm((prev) => ({
                                  ...prev,
                                  importDate: yesterdayVN,
                                  importDateTimeCombined: `${yesterdayVN} ${prev.importTime}`,
                                }));
                                setIsImportDatePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                            >
                              ⏱️ Hôm qua
                            </button>
                          </div>

                          <div>
                            <label className="block text-2xs text-slate-600 mb-1">Chọn trên lịch:</label>
                            <input
                              type="date"
                              value={(() => {
                                try {
                                  return normalizeDateToISO(importForm.importDate) || '';
                                } catch {
                                  return '';
                                }
                              })()}
                              onChange={(e) => {
                                const ymd = e.target.value;
                                if (!ymd) return;
                                const vn = formatDateVN(ymd);
                                setImportForm((prev) => ({
                                  ...prev,
                                  importDate: vn,
                                  importDateTimeCombined: `${vn} ${prev.importTime}`,
                                }));
                                setIsImportDatePickerOpen(false);
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Giờ nhập kho (Chuẩn 24h) */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Giờ nhập (Chuẩn 24h) <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nowTime = formatTime24H(new Date());
                            setImportForm((prev) => ({
                              ...prev,
                              importTime: nowTime,
                              importDateTimeCombined: `${prev.importDate} ${nowTime}`,
                            }));
                          }}
                          className="text-2xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        >
                          Bây giờ
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="text"
                          required
                          value={importForm.importTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImportForm((prev) => ({
                              ...prev,
                              importTime: val,
                              importDateTimeCombined: `${prev.importDate} ${val}`,
                            }));
                          }}
                          onBlur={() => {
                            if (importForm.importTime?.trim()) {
                              const norm = normalizeManualTime24H(importForm.importTime.trim());
                              if (norm) {
                                setImportForm((prev) => ({
                                  ...prev,
                                  importTime: norm,
                                  importDateTimeCombined: `${prev.importDate} ${norm}`,
                                }));
                              }
                            }
                          }}
                          placeholder="HH:mm (VD: 14:30)"
                          className="w-full pl-3 pr-10 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsImportTimePickerOpen(!isImportTimePickerOpen);
                            setIsImportDatePickerOpen(false);
                          }}
                          className={`absolute right-1.5 p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isImportTimePickerOpen
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Chọn nhanh giờ 24h"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-2xs text-slate-500 mt-1 flex items-center justify-between px-1">
                        <span>Chuẩn 24h: <strong>00:00 - 23:59</strong></span>
                        <span className="text-emerald-600 font-medium">Không AM/PM</span>
                      </div>

                      {/* Popover chọn giờ 24h */}
                      {isImportTimePickerOpen && (
                        <div className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-white border-2 border-emerald-200 rounded-2xl shadow-xl p-3 text-xs space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Chọn nhanh giờ nhập (Chuẩn 24h)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsImportTimePickerOpen(false)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nowTime = formatTime24H(new Date());
                                setImportForm((prev) => ({
                                  ...prev,
                                  importTime: nowTime,
                                  importDateTimeCombined: `${prev.importDate} ${nowTime}`,
                                }));
                                setIsImportTimePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-2xs border border-emerald-200 transition-colors cursor-pointer"
                            >
                              🌸 Bây giờ ({formatTime24H(new Date())})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImportForm((prev) => ({
                                  ...prev,
                                  importTime: '07:30',
                                  importDateTimeCombined: `${prev.importDate} 07:30`,
                                }));
                                setIsImportTimePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                            >
                              ☀️ Đầu giờ sáng (07:30)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImportForm((prev) => ({
                                  ...prev,
                                  importTime: '09:15',
                                  importDateTimeCombined: `${prev.importDate} 09:15`,
                                }));
                                setIsImportTimePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                            >
                              🔔 Ra chơi sáng (09:15)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImportForm((prev) => ({
                                  ...prev,
                                  importTime: '13:30',
                                  importDateTimeCombined: `${prev.importDate} 13:30`,
                                }));
                                setIsImportTimePickerOpen(false);
                              }}
                              className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                            >
                              🌤️ Đầu giờ chiều (13:30)
                            </button>
                          </div>

                          <div className="pt-2 border-t border-emerald-100">
                            <label className="block text-2xs text-slate-600 mb-1">Chọn giờ và phút:</label>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={importForm.importTime?.split(':')[0] || '08'}
                                onChange={(e) => {
                                  const h = e.target.value.padStart(2, '0');
                                  const m = importForm.importTime?.split(':')[1] || '00';
                                  const newTime = `${h}:${m}`;
                                  setImportForm((prev) => ({
                                    ...prev,
                                    importTime: newTime,
                                    importDateTimeCombined: `${prev.importDate} ${newTime}`,
                                  }));
                                }}
                                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              >
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const val = String(i).padStart(2, '0');
                                  return (
                                    <option key={val} value={val}>
                                      {val}h
                                    </option>
                                  );
                                })}
                              </select>
                              <span className="font-bold text-slate-400">:</span>
                              <select
                                value={importForm.importTime?.split(':')[1] || '00'}
                                onChange={(e) => {
                                  const m = e.target.value.padStart(2, '0');
                                  const h = importForm.importTime?.split(':')[0] || '08';
                                  const newTime = `${h}:${m}`;
                                  setImportForm((prev) => ({
                                    ...prev,
                                    importTime: newTime,
                                    importDateTimeCombined: `${prev.importDate} ${newTime}`,
                                  }));
                                }}
                                className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              >
                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((min) => (
                                  <option key={min} value={min}>
                                    {min}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Chế độ 2: 1 Ô chung DD/MM/YYYY HH:mm */
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Thời điểm nhập kho (Chuẩn 24h) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nowStr = formatDateTime24H(new Date());
                          setImportForm((prev) => ({
                            ...prev,
                            importDateTimeCombined: nowStr,
                            importDate: nowStr.split(' ')[0],
                            importTime: nowStr.split(' ')[1],
                          }));
                        }}
                        className="text-2xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>Bây giờ</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={importForm.importDateTimeCombined}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parts = val.trim().split(/\s+/);
                          setImportForm((prev) => ({
                            ...prev,
                            importDateTimeCombined: val,
                            importDate: parts[0] || prev.importDate,
                            importTime: parts[1] || prev.importTime,
                          }));
                        }}
                        onBlur={() => {
                          if (importForm.importDateTimeCombined?.trim()) {
                            const norm = formatDateTime24H(importForm.importDateTimeCombined.trim());
                            if (norm && isValidDateTime24H(norm)) {
                              setImportForm((prev) => ({
                                ...prev,
                                importDateTimeCombined: norm,
                                importDate: norm.split(' ')[0],
                                importTime: norm.split(' ')[1],
                              }));
                            }
                          }
                        }}
                        placeholder="DD/MM/YYYY HH:mm (VD: 03/11/2026 14:30)"
                        className="w-full pl-3.5 pr-20 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400"
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsImportCombinedPickerOpen(!isImportCombinedPickerOpen)}
                          className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                            isImportCombinedPickerOpen
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title="Mở bảng chọn nhanh ngày và giờ"
                        >
                          <Calendar className="w-4 h-4" />
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-2xs text-slate-500 mt-1 px-1">
                      <span>Định dạng 24h: <strong>DD/MM/YYYY HH:mm</strong></span>
                      {isValidDateTime24H(importForm.importDateTimeCombined) ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">VD: 03/11/2026 14:30</span>
                      )}
                    </div>

                    {/* Popover cho 1 ô chung */}
                    {isImportCombinedPickerOpen && (
                      <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-96 bg-white border-2 border-emerald-200 rounded-2xl shadow-xl p-3.5 text-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>Chọn nhanh thời điểm nhập kho (Chuẩn 24h)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsImportCombinedPickerOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const nowStr = formatDateTime24H(new Date());
                              setImportForm((prev) => ({
                                ...prev,
                                importDateTimeCombined: nowStr,
                                importDate: nowStr.split(' ')[0],
                                importTime: nowStr.split(' ')[1],
                              }));
                            }}
                            className="px-2 py-1.5 text-left rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-2xs border border-emerald-200 transition-colors cursor-pointer"
                          >
                            🌸 Bây giờ ({formatTime24H(new Date())})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
                              const dtStr = formatDateTime24H(d);
                              setImportForm((prev) => ({
                                ...prev,
                                importDateTimeCombined: dtStr,
                                importDate: dtStr.split(' ')[0],
                                importTime: dtStr.split(' ')[1],
                              }));
                            }}
                            className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                          >
                            ⏱️ Hôm qua
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 30);
                              const dtStr = formatDateTime24H(d);
                              setImportForm((prev) => ({
                                ...prev,
                                importDateTimeCombined: dtStr,
                                importDate: dtStr.split(' ')[0],
                                importTime: '07:30',
                              }));
                            }}
                            className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                          >
                            ☀️ Đầu giờ sáng (07:30)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30);
                              const dtStr = formatDateTime24H(d);
                              setImportForm((prev) => ({
                                ...prev,
                                importDateTimeCombined: dtStr,
                                importDate: dtStr.split(' ')[0],
                                importTime: '13:30',
                              }));
                            }}
                            className="px-2 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-2xs border border-slate-200 transition-colors cursor-pointer"
                          >
                            🌤️ Đầu giờ chiều (13:30)
                          </button>
                        </div>

                        <div className="pt-2 border-t border-emerald-100 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-2xs text-slate-600 mb-1">Chọn ngày:</label>
                              <input
                                type="date"
                                value={(() => {
                                  try {
                                    return normalizeDateToISO(importForm.importDate) || '';
                                  } catch {
                                    return '';
                                  }
                                })()}
                                onChange={(e) => {
                                  const selectedDate = e.target.value;
                                  if (!selectedDate) return;
                                  const [y, m, d] = selectedDate.split('-');
                                  const currentTime = importForm.importTime || formatTime24H(new Date());
                                  const comb = `${d}/${m}/${y} ${currentTime}`;
                                  setImportForm((prev) => ({
                                    ...prev,
                                    importDate: `${d}/${m}/${y}`,
                                    importDateTimeCombined: comb,
                                  }));
                                }}
                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-2xs text-slate-600 mb-1">Giờ (00 - 23h):</label>
                              <div className="flex items-center gap-1">
                                <select
                                  value={importForm.importTime?.split(':')[0] || '08'}
                                  onChange={(e) => {
                                    const h = e.target.value.padStart(2, '0');
                                    const m = importForm.importTime?.split(':')[1] || '00';
                                    const newTime = `${h}:${m}`;
                                    setImportForm((prev) => ({
                                      ...prev,
                                      importTime: newTime,
                                      importDateTimeCombined: `${prev.importDate} ${newTime}`,
                                    }));
                                  }}
                                  className="w-1/2 px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                >
                                  {Array.from({ length: 24 }).map((_, i) => {
                                    const val = String(i).padStart(2, '0');
                                    return (
                                      <option key={val} value={val}>
                                        {val}h
                                      </option>
                                    );
                                  })}
                                </select>
                                <span>:</span>
                                <select
                                  value={importForm.importTime?.split(':')[1] || '00'}
                                  onChange={(e) => {
                                    const m = e.target.value.padStart(2, '0');
                                    const h = importForm.importTime?.split(':')[0] || '08';
                                    const newTime = `${h}:${m}`;
                                    setImportForm((prev) => ({
                                      ...prev,
                                      importTime: newTime,
                                      importDateTimeCombined: `${prev.importDate} ${newTime}`,
                                    }));
                                  }}
                                  className="w-1/2 px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                >
                                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((min) => (
                                    <option key={min} value={min}>
                                      {min}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                          <span className="text-2xs text-slate-500">
                            Kết quả: <strong className="text-emerald-700">{importForm.importDateTimeCombined}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsImportCombinedPickerOpen(false)}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                          >
                            Xong
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Loại sản phẩm BVS <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-2xs text-emerald-700 font-medium">Hỗ trợ tự nhập loại mới</span>
                </div>
                {activeProducts.length === 0 && (
                  <div className="mb-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-2xs text-emerald-800 font-medium">Kho chưa có sẵn loại BVS nào.</span>
                    <button
                      type="button"
                      onClick={() => {
                        db.restoreDefaultSanitaryProducts();
                        triggerToast('Đã khôi phục danh mục BVS chuẩn (Diana, Kotex, Laurier)!', 'success');
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-2xs rounded-lg cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                    >
                      🌸 Nạp danh mục chuẩn
                    </button>
                  </div>
                )}
                <select
                  value={importForm.productId}
                  onChange={(e) => setImportForm({ ...importForm, productId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                >
                  {activeProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.brand ? `(${p.brand})` : ''} • Hiện tồn: {p.stockQuantity} miếng
                    </option>
                  ))}
                  <option value="custom">➕ Tự nhập loại BVS mới để nhập kho...</option>
                </select>

                {/* Custom product inputs if custom selected or no active products */}
                {(importForm.productId === 'custom' || activeProducts.length === 0) && (
                  <div className="mt-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-2xs font-bold text-emerald-800 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Thông tin loại BVS tự nhập:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          Tên loại BVS <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Diana Sensi Cool Fresh 23cm..."
                          value={importForm.customProductName}
                          onChange={(e) => setImportForm({ ...importForm, customProductName: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 mb-1">
                          Thương hiệu (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Diana, Kotex, Sofy..."
                          value={importForm.customProductBrand}
                          onChange={(e) => setImportForm({ ...importForm, customProductBrand: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Packaging type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức đóng gói</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportForm({ ...importForm, packagingType: 'pack' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      importForm.packagingType === 'pack'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    📦 Nhập theo gói (Quy đổi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportForm({ ...importForm, packagingType: 'piece' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      importForm.packagingType === 'piece'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    🏷️ Nhập theo miếng rời
                  </button>
                </div>
              </div>

              {/* Quantity fields based on packaging */}
              {importForm.packagingType === 'pack' ? (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số gói</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={importForm.packCount}
                      onChange={(e) =>
                        setImportForm({ ...importForm, packCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số miếng / gói</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={importForm.piecesPerPack}
                      onChange={(e) =>
                        setImportForm({
                          ...importForm,
                          piecesPerPack: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tự động quy đổi tồn kho:</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      = {computedTotalPieces} miếng
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tổng số miếng nhập</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={importForm.totalPieces}
                    onChange={(e) =>
                      setImportForm({ ...importForm, totalPieces: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-base"
                  />
                </div>
              )}

              {/* Source or Sponsor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nguồn cung cấp / Đơn vị tài trợ</label>
                <select
                  value={importForm.sourceOrSponsor}
                  onChange={(e) => setImportForm({ ...importForm, sourceOrSponsor: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                >
                  <option value="Ngân sách y tế học đường">Ngân sách y tế học đường năm học 2026-2027</option>
                  <option value="Hội Cha Mẹ Học Sinh tài trợ">Hội Cha Mẹ Học Sinh (CMHS) tài trợ</option>
                  <option value="Chương trình Kotex/Diana học đường tài trợ">
                    Chương trình Giáo dục giới tính Kotex / Diana tài trợ
                  </option>
                  <option value="Hội Chữ thập đỏ nhà trường ủng hộ">Hội Chữ thập đỏ nhà trường ủng hộ</option>
                  <option value="Tập thể Giáo viên & Nhân viên quyên góp">Tập thể Giáo viên & Nhân viên quyên góp</option>
                  <option value="custom">+ Nguồn tài trợ khác...</option>
                </select>
                {importForm.sourceOrSponsor === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nhập tên nguồn tài trợ..."
                    required
                    value={importForm.customSource}
                    onChange={(e) => setImportForm({ ...importForm, customSource: e.target.value })}
                    className="w-full mt-2 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs"
                  />
                )}
              </div>

              {/* Receiver & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cán bộ y tế tiếp nhận</label>
                  <input
                    type="text"
                    required
                    value={importForm.receiverName}
                    onChange={(e) => setImportForm({ ...importForm, receiverName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú phiếu nhập</label>
                  <input
                    type="text"
                    placeholder="Ghi chú đợt nhập..."
                    value={importForm.notes}
                    onChange={(e) => setImportForm({ ...importForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isImportSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isImportSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Xác nhận nhập kho (+{computedTotalPieces} miếng)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: XÁC NHẬN HỦY GIAO DỊCH (VỚI HOÀN TRẢ TỒN KHO)
         ========================================================================= */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Xác nhận hủy phiếu {cancellingItem.code}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hành động này sẽ cập nhật lại số lượng tồn kho chính xác ({cancellingItem.type === 'dispatch' ? `hoàn trả +${cancellingItem.quantity}` : `trừ lại -${cancellingItem.quantity}`} miếng {cancellingItem.name}) và ghi vào nhật ký kiểm toán.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do hủy giao dịch <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Nhập lý do hủy (nhập nhầm số lượng, thao tác lặp lại...)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Xác nhận hủy phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: XEM CHI TIẾT PHIẾU CẤP PHÁT
         ========================================================================= */}
      {viewingDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-800">
                  Phiếu Cấp Phát
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-1">{viewingDispatch.dispatchCode}</h3>
              </div>
              <button
                onClick={() => setViewingDispatch(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Thời điểm cấp:</span>
                <span className="font-semibold text-slate-800">{formatDateTimeVN(viewingDispatch.dateTime)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Lớp tiếp nhận:</span>
                <span className="font-bold text-pink-700">Lớp {viewingDispatch.className}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Sản phẩm:</span>
                <span className="font-semibold text-slate-800">{viewingDispatch.productName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Số lượng:</span>
                <span className="font-extrabold text-pink-600 text-sm">{viewingDispatch.quantity} miếng</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Đối tượng nhận:</span>
                <span className="font-semibold text-emerald-700">
                  Học sinh nữ (Ẩn danh bảo mật 100%)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Cán bộ y tế cấp:</span>
                <span className="font-semibold text-slate-800">{viewingDispatch.dispenserName}</span>
              </div>
              {viewingDispatch.notes && (
                <div className="py-1">
                  <span className="text-slate-500">Ghi chú:</span>
                  <p className="mt-1 p-2 bg-slate-50 rounded-lg text-slate-700 italic">{viewingDispatch.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const dispId = viewingDispatch.id;
                  const dispCode = viewingDispatch.dispatchCode;
                  setViewingDispatch(null);
                  setConfirmModal({
                    isOpen: true,
                    title: `Xóa vĩnh viễn phiếu ${dispCode}?`,
                    message: `Bạn có chắc chắn muốn xóa vĩnh viễn phiếu ${dispCode} khỏi hệ thống không? Dữ liệu cấp phát này sẽ bị xóa hoàn toàn.`,
                    confirmText: 'Xóa vĩnh viễn',
                    confirmColor: 'rose',
                    onConfirm: () => {
                      db.deleteSanitaryDispatch(dispId, viewingDispatch.status === 'completed');
                      triggerToast(`Đã xóa vĩnh viễn phiếu ${dispCode}`, 'success');
                    },
                  });
                }}
                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa phiếu này</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingDispatch(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: THÊM / SỬA LOẠI SẢN PHẨM BVS
         ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {selectedProductToEdit ? 'Chỉnh sửa loại BVS' : 'Thêm loại sản phẩm BVS mới'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: BVS ban ngày có cánh (23cm)..."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thương hiệu / Nhãn hiệu</label>
                <input
                  type="text"
                  placeholder="VD: Diana Sensi, Kotex, Laurier..."
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tồn kho ban đầu (miếng)</label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stockQuantity}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stockQuantity: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngưỡng cảnh báo (miếng)</label>
                  <input
                    type="number"
                    min={1}
                    value={productForm.minAlertThreshold}
                    onChange={(e) =>
                      setProductForm({ ...productForm, minAlertThreshold: parseInt(e.target.value, 10) || 20 })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mục đích dùng</label>
                <input
                  type="text"
                  placeholder="VD: Dùng cho hoạt động thể dục, cấp khẩn cấp..."
                  value={productForm.notes}
                  onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {selectedProductToEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prodId = selectedProductToEdit.id;
                      const prodName = selectedProductToEdit.name;
                      setIsProductModalOpen(false);
                      setConfirmModal({
                        isOpen: true,
                        title: `Xóa loại "${prodName}"?`,
                        message: `Bạn có chắc chắn muốn xóa sản phẩm "${prodName}" khỏi danh mục BVS của trường không?`,
                        confirmText: 'Xóa loại này',
                        confirmColor: 'rose',
                        onConfirm: () => {
                          db.deleteSanitaryProduct(prodId);
                          triggerToast(`Đã xóa loại "${prodName}" khỏi danh mục`, 'info');
                        },
                      });
                    }}
                    className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa loại này</span>
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                  >
                    Lưu sản phẩm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: HƯỚNG DẪN SỬ DỤNG & KẾT NỐI CƠ SỞ DỮ LIỆU
         ========================================================================= */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-5 text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Hướng Dẫn Sử Dụng & Kết Nối Cơ Sở Dữ Liệu
                  </h3>
                  <p className="text-2xs text-slate-500">Phân hệ cấp phát BVS nữ sinh - Y tế học đường</p>
                </div>
              </div>
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-slate-700 leading-relaxed">
              <section className="bg-pink-50/70 p-4 rounded-2xl border border-pink-100">
                <h4 className="font-bold text-pink-900 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                  <HeartHandshake className="w-4 h-4 text-pink-600" />
                  1. Cách sử dụng phân hệ hàng ngày:
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-pink-950">
                  <li>
                    <strong>Cấp phát nhanh:</strong> Bấm nút <code>+ Cấp phát nhanh</code>. Hệ thống tự động điền giờ
                    hiện tại và mặc định 1 miếng. Chọn lớp của học sinh. Mặc định cấp ẩn danh để giữ kín đáo tối đa.
                  </li>
                  <li>
                    <strong>Nhập kho / Tiếp nhận tài trợ:</strong> Bấm <code>+ Nhập kho</code>. Nếu nhà tài trợ gửi
                    theo gói (ví dụ 10 gói x 8 miếng/gói), hệ thống tự động quy đổi thành 80 miếng và cộng vào tồn kho.
                  </li>
                  <li>
                    <strong>Hủy giao dịch:</strong> Nếu lỡ nhập sai, vào tab <em>Lịch sử</em> bấm icon thùng rác. Hệ
                    thống sẽ tự động hoàn trả (hoặc trừ lại) tồn kho chính xác và lưu lý do hủy.
                  </li>
                  <li>
                    <strong>Báo cáo & In ấn:</strong> Vào tab <em>Báo cáo tổng hợp</em>, chọn kỳ (Tuần, Tháng, Học kỳ)
                    và xuất file Excel <code>.xlsx</code> hoặc in trực tiếp mẫu A4 có chữ ký Ban Giám Hiệu.
                  </li>
                </ul>
              </section>

              <section className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Database className="w-4 h-4 text-emerald-600" />
                  2. Trạng thái kết nối Cơ sở dữ liệu:
                </h4>
                <div className="space-y-2 text-xs">
                  <p>
                    Hệ thống hiện tại tích hợp <strong>kiến trúc lưu trữ 3 tầng</strong>:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                    <li>
                      <strong>Tầng 1 (Bộ nhớ cục bộ LocalStorage & IndexedDB):</strong> Lưu tức thì trên trình duyệt máy
                      tính/điện thoại, đảm bảo không bao giờ gián đoạn kể cả khi mất kết nối Internet.
                    </li>
                    <li>
                      <strong>Tầng 2 (Máy chủ trường học Node.js Express <code>/api/school-state</code>):</strong> Tự
                      động đồng bộ trạng thái giữa các máy tính trong phòng y tế, văn phòng BGH và kế toán.
                    </li>
                    <li>
                      <strong>Tầng 3 (Cơ sở dữ liệu đám mây Google Cloud Firestore):</strong> Lưu trữ bền vững dữ liệu
                      y tế học đường theo thời gian thực.
                    </li>
                  </ol>
                  <p className="mt-2 text-emerald-700 font-semibold">
                    ✓ Nếu chưa kết nối Cloud Firestore, hệ thống tự động chạy ở <em>"Chế độ dùng thử / Lưu trữ thiết bị"</em>,
                    vẫn bảo lưu 100% dữ liệu nhập kho và cấp phát trên máy hiện tại mà không bị mất.
                  </p>
                </div>
              </section>

              <section className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
                <h4 className="font-bold text-amber-900 mb-1 flex items-center gap-1.5 text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  3. Phần còn cần cấu hình thêm khi triển khai thực tế:
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-amber-950">
                  <li>
                    <strong>Kiểm kê tồn kho thực tế ban đầu:</strong> Cán bộ y tế đếm số lượng băng vệ sinh thực tế
                    đang có trong tủ thuốc và cập nhật lại tại tab <em>Quản lý danh mục</em>.
                  </li>
                  <li>
                    <strong>Cài đặt ngưỡng cảnh báo:</strong> Thiết lập ngưỡng phù hợp với quy mô nữ sinh trường THCS
                    Đông Thạnh (ví dụ: tối thiểu 30-50 miếng).
                  </li>
                  <li>
                    <strong>Tài khoản cán bộ:</strong> Đăng nhập với quyền Cán bộ Y tế hoặc Quản trị viên để có đầy đủ
                    thẩm quyền xem và xuất báo cáo.
                  </li>
                </ul>
              </section>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsGuideModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 7: HỘP THOẠI XÁC NHẬN AN TOÀN TRONG APP (THAY THẾ HOÀN TOÀN WINDOW.CONFIRM)
         ========================================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                confirmModal.confirmColor === 'emerald'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  : confirmModal.confirmColor === 'amber'
                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  cb();
                }}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                  confirmModal.confirmColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmModal.confirmColor === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmModal.confirmText || 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
