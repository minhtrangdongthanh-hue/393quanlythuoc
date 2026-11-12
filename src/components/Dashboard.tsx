import React, { useState } from 'react';
import {
  Pill,
  Boxes,
  BriefcaseMedical,
  AlertTriangle,
  ClockAlert,
  Flame,
  Activity,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ExternalLink,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Stethoscope,
  Users,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { db, formatDateVN, getDaysRemaining, maskStudentName } from '../services/db';
import { NavTab } from './Sidebar';
import { MedicineBatch, Medicine } from '../types';

interface DashboardProps {
  onNavigate: (tab: any, filter?: string) => void;
  onQuickAction?: (action: 'add_medicine' | 'import' | 'export' | 'stock' | 'print') => void;
  onOpenAddMedicine?: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onViewAlertDetails?: (type: 'expired' | 'expiring_soon' | 'low_stock') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onQuickAction,
  onOpenAddMedicine,
  onOpenImport,
  onOpenExport,
  onViewAlertDetails,
}) => {
  const [, setDbTick] = useState(0);
  React.useEffect(() => {
    const unsub = db.subscribe(() => setDbTick((t) => t + 1));
    return () => unsub();
  }, []);

  const canManageClinicVisits = db.hasPermission('canManageClinicVisits');
  const canManageStudents = db.hasPermission('canManageStudents');
  const canManageMedicine = db.hasPermission('canManageMedicine');
  const canManageTransactions = db.hasPermission('canManageTransactions');
  const canManageInventoryCheck = db.hasPermission('canManageInventoryCheck');
  const canViewReports = db.hasPermission('canViewReports');

  const metrics = db.getDashboardMetrics();
  const medicines = db.getMedicines();
  const recentTransactions = db.getTransactions().slice(0, 5);
  const todayVisits = db.getTodayClinicVisits();

  // Detail Modal for Alert Cards
  const [activeAlertModal, setActiveAlertModal] = useState<
    'expired' | 'expiring_soon' | 'low_stock' | null
  >(null);

  // Quick Guide for first-time teachers and medical staff
  const [showQuickGuide, setShowQuickGuide] = useState(() => {
    return localStorage.getItem('hide_school_health_guide') !== 'true';
  });

  // Expired batches with medicine name
  const expiredItems = metrics.expiredBatches.map((batch) => {
    const med = medicines.find((m) => m.id === batch.medicineId);
    return {
      batch,
      medicine: med,
      days: getDaysRemaining(batch.expDate),
    };
  });

  // Expiring soon batches
  const expiringSoonItems = metrics.expiringSoonBatches.map((batch) => {
    const med = medicines.find((m) => m.id === batch.medicineId);
    return {
      batch,
      medicine: med,
      days: getDaysRemaining(batch.expDate),
    };
  });

  // Low stock items
  const lowStockItems = metrics.lowStockMedicines;

  // Chart data (strictly from real transactions in database)
  const monthlyTrendsData = metrics.monthlyTrends || [];

  const expiryPieData = [
    { name: 'Bình thường (>30 ngày)', value: metrics.expiryBreakdown?.safe || Math.max(0, metrics.totalBatches - metrics.expiredCount - metrics.expiringSoonCount), color: '#15803D' },
    { name: 'Sắp hết hạn (≤30 ngày)', value: metrics.expiringSoonCount, color: '#B45309' },
    { name: 'Đã hết hạn', value: metrics.expiredCount, color: '#B91C1C' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions Banner */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#147D80] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#147D80]"></span>
            <span>Phòng Y Tế • Trường THCS Đông Thạnh</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-bold text-[#17324D] tracking-tight">
            Quản Lý Thuốc & Y Tế Học Sinh
          </h2>
          <p className="text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Hệ thống quản lý nghiệp vụ y tế trường học: Theo dõi kho thuốc, vật tư theo số lô, hạn dùng FEFO và hồ sơ chăm sóc sức khỏe học sinh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManageTransactions && (
            <>
              <button
                id="btn-dash-import"
                type="button"
                onClick={() => onNavigate('import_medicine')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#147D80] text-white text-xs sm:text-sm font-semibold hover:bg-[#106366] transition-colors cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4 shrink-0" />
                <span>Nhập thuốc mới</span>
              </button>
              <button
                id="btn-dash-export"
                type="button"
                onClick={() => onNavigate('export_medicine')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#17324D] text-white text-xs sm:text-sm font-semibold hover:bg-[#0F2336] transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>Xuất cấp phát</span>
              </button>
              <button
                id="btn-dash-stock-balance"
                type="button"
                onClick={() => onNavigate('stock_balance')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1E293B] text-xs sm:text-sm font-semibold hover:bg-[#F5F7FA] border border-[#E2E8F0] transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-[#147D80]" />
                <span>Sổ Nhập - Xuất - Tồn</span>
              </button>
            </>
          )}
          {canManageInventoryCheck && (
            <button
              id="btn-dash-inventory-check"
              type="button"
              onClick={() => onNavigate('inventory_check')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1E293B] text-xs sm:text-sm font-semibold hover:bg-[#F5F7FA] border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0 text-[#17324D]" />
              <span>Kiểm kê kho</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Question User Guide / Quy trình sử dụng cho người mới */}
      {showQuickGuide ? (
        <div className="bg-[#EAF5F4] border border-[#B2D8D6] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#147D80] text-white flex items-center justify-center text-xs font-bold">
                ?
              </span>
              <h3 className="font-bold text-[#17324D] text-sm">
                Hướng Dẫn Nghiệp Vụ Nhanh • Dành Cho Cán Bộ Y Tế & Giáo Viên
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowQuickGuide(false);
                localStorage.setItem('hide_school_health_guide', 'true');
              }}
              className="text-xs text-[#64748B] hover:text-[#17324D] font-medium px-2.5 py-1 rounded-lg hover:bg-white/70 transition-colors cursor-pointer"
            >
              Đã hiểu, thu gọn
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. App dùng để làm gì? */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#17324D] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF5F4] text-[#147D80] flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                <span>Mục đích hệ thống</span>
              </div>
              <p className="text-[#64748B] text-xs leading-relaxed">
                Quản lý học sinh đến khám/sơ cứu, theo dõi tồn kho thuốc theo số lô và hạn dùng (FEFO), tự động xuất sổ sách, mẫu in A4 chuẩn Bộ GD&ĐT & BYT.
              </p>
            </div>

            {/* 2. Cần nhập gì? */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#17324D] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF5F4] text-[#147D80] flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                <span>Dữ liệu cập nhật</span>
              </div>
              <p className="text-[#64748B] text-xs leading-relaxed">
                • <strong>Hằng ngày:</strong> Nhập ca khám học sinh (triệu chứng, xử trí, cấp thuốc).<br/>
                • <strong>Định kỳ:</strong> Nhập thuốc & vật tư mới vào tủ y tế.
              </p>
            </div>

            {/* 3. Phải bấm ở đâu? */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#17324D] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF5F4] text-[#147D80] flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                <span>Thao tác chính</span>
              </div>
              <p className="text-[#64748B] text-xs leading-relaxed">
                • Chọn <strong>"Tiếp nhận y tế"</strong> bên dưới để tạo ca khám (trừ kho FEFO).<br/>
                • Chọn <strong>"Nhập thuốc mới"</strong> góc phải để bổ sung cơ số kho.
              </p>
            </div>

            {/* 4. Kết quả xem ở đâu? */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1">
              <div className="font-bold text-[#17324D] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#EAF5F4] text-[#147D80] flex items-center justify-center text-[11px] font-bold shrink-0">4</span>
                <span>Tra cứu & Báo cáo</span>
              </div>
              <p className="text-[#64748B] text-xs leading-relaxed">
                Vào <strong>"Sổ phòng y tế"</strong> xem lịch sử ca khám; vào <strong>"Sổ Nhập - Xuất - Tồn"</strong> & <strong>"Mẫu in sổ A4"</strong> để in hoặc xuất file Word/Excel.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setShowQuickGuide(true);
              localStorage.removeItem('hide_school_health_guide');
            }}
            className="text-xs text-[#147D80] hover:text-[#17324D] bg-white hover:bg-[#EAF5F4] border border-[#E2E8F0] px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Xem hướng dẫn sử dụng nhanh</span>
          </button>
        </div>
      )}

      {/* STUDENT HEALTH CLINIC HUB */}
      {(canManageClinicVisits || canManageStudents || canViewReports) && (
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#17324D] text-white flex items-center justify-center font-semibold shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#147D80]">
                  Nghiệp vụ thường trực
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#17324D]">
                  Tiếp Nhận Sơ Cứu & Chăm Sóc Sức Khỏe Học Sinh
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#64748B] font-medium">
              Liên thông đồng bộ: Hồ sơ học sinh • Tiếp nhận khám • Cấp phát trừ kho FEFO
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {canManageClinicVisits && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('clinic_reception')}
                  className="p-4 bg-[#EAF5F4] hover:bg-[#D5EBEA] rounded-xl text-left border border-[#B2D8D6] transition-colors flex flex-col justify-between group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#147D80] uppercase tracking-wide">Tiếp nhận y tế</span>
                    <Stethoscope className="w-4 h-4 text-[#147D80]" />
                  </div>
                  <p className="text-sm font-bold text-[#17324D] mt-2">Sơ cứu & Cấp thuốc</p>
                  <span className="text-xs text-[#147D80] mt-1 font-medium">Tạo lượt khám mới →</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('clinic_visits')}
                  className="p-4 bg-[#F5F7FA] hover:bg-[#EAF5F4] rounded-xl text-left border border-[#E2E8F0] hover:border-[#B2D8D6] transition-colors flex flex-col justify-between group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Sổ phòng y tế</span>
                    <BookOpen className="w-4 h-4 text-[#17324D]" />
                  </div>
                  <p className="text-sm font-bold text-[#17324D] mt-2">Sổ theo dõi tiếp nhận</p>
                  <span className="text-xs text-[#64748B] group-hover:text-[#147D80] mt-1 font-medium">Tra cứu ca sơ cứu →</span>
                </button>
              </>
            )}

            {canManageStudents && (
              <button
                type="button"
                onClick={() => onNavigate('students')}
                className="p-4 bg-[#F5F7FA] hover:bg-[#EAF5F4] rounded-xl text-left border border-[#E2E8F0] hover:border-[#B2D8D6] transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Hồ sơ học sinh</span>
                  <Users className="w-4 h-4 text-[#17324D]" />
                </div>
                <p className="text-sm font-bold text-[#17324D] mt-2">Tiền sử & Dị ứng</p>
                <span className="text-xs text-[#64748B] group-hover:text-[#147D80] mt-1 font-medium">Tra cứu danh sách →</span>
              </button>
            )}

            {canViewReports && (
              <button
                type="button"
                onClick={() => onNavigate('comprehensive_reports')}
                className="p-4 bg-[#F5F7FA] hover:bg-[#EAF5F4] rounded-xl text-left border border-[#E2E8F0] hover:border-[#B2D8D6] transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Báo cáo y tế</span>
                  <BarChart3 className="w-4 h-4 text-[#17324D]" />
                </div>
                <p className="text-sm font-bold text-[#17324D] mt-2">Báo cáo & Thống kê</p>
                <span className="text-xs text-[#64748B] group-hover:text-[#147D80] mt-1 font-medium">Xuất mẫu A4 & Excel →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3 Prominent High-Priority Alert Banners */}
      {canManageMedicine && (
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-[#17324D]" />
          <span>Trạng Thái Cảnh Báo Kho Dược & Hạn Dùng (Nhấn vào thẻ để xem chi tiết)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ĐÃ HẾT HẠN (#B91C1C on #FEF2F2) */}
          <div
            id="alert-box-expired"
            onClick={() => setActiveAlertModal('expired')}
            className={`p-5 rounded-xl border transition-colors cursor-pointer ${
              metrics.expiredCount > 0
                ? 'bg-[#FEF2F2] border-[#FECACA] hover:border-[#B91C1C]'
                : 'bg-white border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    metrics.expiredCount > 0
                      ? 'bg-[#B91C1C] text-white'
                      : 'bg-[#F0FDF4] text-[#15803D]'
                  }`}
                >
                  {metrics.expiredCount > 0 ? <Flame className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${metrics.expiredCount > 0 ? 'text-[#B91C1C]' : 'text-[#17324D]'}`}>
                    Thuốc Đã Hết Hạn
                  </h4>
                  <p className={`text-xs mt-0.5 ${metrics.expiredCount > 0 ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>
                    Cách ly & lập biên bản hủy
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold tabular-nums ${
                  metrics.expiredCount > 0
                    ? 'bg-[#B91C1C] text-white'
                    : 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                }`}
              >
                {metrics.expiredCount} lô
              </span>
            </div>
            <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${metrics.expiredCount > 0 ? 'border-[#FECACA]' : 'border-[#E2E8F0]'}`}>
              <span className={metrics.expiredCount > 0 ? 'text-[#B91C1C] font-semibold' : 'text-[#15803D] font-medium'}>
                {metrics.expiredCount > 0
                  ? 'Cần xử lý niêm phong ngay'
                  : 'An toàn, không có lô quá hạn'}
              </span>
              <span className={`inline-flex items-center gap-1 font-semibold hover:underline ${metrics.expiredCount > 0 ? 'text-[#B91C1C]' : 'text-[#147D80]'}`}>
                <span>Chi tiết</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* SẮP HẾT HẠN (#B45309 on #FFFBEB) */}
          <div
            id="alert-box-expiring"
            onClick={() => setActiveAlertModal('expiring_soon')}
            className={`p-5 rounded-xl border transition-colors cursor-pointer ${
              metrics.expiringSoonCount > 0
                ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#B45309]'
                : 'bg-white border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    metrics.expiringSoonCount > 0
                      ? 'bg-[#B45309] text-white'
                      : 'bg-[#F0FDF4] text-[#15803D]'
                  }`}
                >
                  {metrics.expiringSoonCount > 0 ? <ClockAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${metrics.expiringSoonCount > 0 ? 'text-[#B45309]' : 'text-[#17324D]'}`}>
                    Thuốc Sắp Hết Hạn
                  </h4>
                  <p className={`text-xs mt-0.5 ${metrics.expiringSoonCount > 0 ? 'text-[#B45309]' : 'text-[#64748B]'}`}>
                    Hạn dùng dưới 30 ngày
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold tabular-nums ${
                  metrics.expiringSoonCount > 0
                    ? 'bg-[#B45309] text-white'
                    : 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                }`}
              >
                {metrics.expiringSoonCount} lô
              </span>
            </div>
            <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${metrics.expiringSoonCount > 0 ? 'border-[#FDE68A]' : 'border-[#E2E8F0]'}`}>
              <span className={metrics.expiringSoonCount > 0 ? 'text-[#B45309] font-semibold' : 'text-[#15803D] font-medium'}>
                {metrics.expiringSoonCount > 0
                  ? 'Ưu tiên xuất dùng trước (FEFO)'
                  : 'Hạn sử dụng đều trên 30 ngày'}
              </span>
              <span className={`inline-flex items-center gap-1 font-semibold hover:underline ${metrics.expiringSoonCount > 0 ? 'text-[#B45309]' : 'text-[#147D80]'}`}>
                <span>Chi tiết</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* DƯỚI ĐỊNH MỨC TỒN (#B45309 on #FFFBEB) */}
          <div
            id="alert-box-lowstock"
            onClick={() => setActiveAlertModal('low_stock')}
            className={`p-5 rounded-xl border transition-colors cursor-pointer ${
              metrics.lowStockCount > 0
                ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#B45309]'
                : 'bg-white border-[#E2E8F0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    metrics.lowStockCount > 0
                      ? 'bg-[#B45309] text-white'
                      : 'bg-[#F0FDF4] text-[#15803D]'
                  }`}
                >
                  {metrics.lowStockCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${metrics.lowStockCount > 0 ? 'text-[#B45309]' : 'text-[#17324D]'}`}>
                    Thuốc Dưới Mức Dự Trữ
                  </h4>
                  <p className={`text-xs mt-0.5 ${metrics.lowStockCount > 0 ? 'text-[#B45309]' : 'text-[#64748B]'}`}>
                    Dưới mức tồn an toàn
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold tabular-nums ${
                  metrics.lowStockCount > 0
                    ? 'bg-[#B45309] text-white'
                    : 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                }`}
              >
                {metrics.lowStockCount} loại
              </span>
            </div>
            <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${metrics.lowStockCount > 0 ? 'border-[#FDE68A]' : 'border-[#E2E8F0]'}`}>
              <span className={metrics.lowStockCount > 0 ? 'text-[#B45309] font-semibold' : 'text-[#15803D] font-medium'}>
                {metrics.lowStockCount > 0
                  ? 'Cần lập dự trù nhập bổ sung'
                  : 'Tồn kho đảm bảo mức tối thiểu'}
              </span>
              <span className={`inline-flex items-center gap-1 font-semibold hover:underline ${metrics.lowStockCount > 0 ? 'text-[#B45309]' : 'text-[#147D80]'}`}>
                <span>Chi tiết</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 8 Statistics Cards */}
      {(canManageMedicine || canViewReports) && (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canManageMedicine && (
          <>
        {/* 1. Tổng số loại thuốc */}
        <div
          onClick={() => onNavigate('medicines')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#147D80] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Danh mục thuốc & vật tư</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF5F4] text-[#147D80] flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#17324D] tabular-nums">
              {metrics.totalMedicineTypes}
            </span>
            <span className="text-xs text-[#64748B]">mặt hàng</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Thuốc & vật tư thiết yếu</p>
        </div>

        {/* 2. Tổng số lượng thuốc hiện có */}
        <div
          onClick={() => onNavigate('stock')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#147D80] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Lượng tồn khả dụng</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#17324D] tabular-nums">
              {metrics.totalMedicineStock.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">đơn vị</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Còn hạn sử dụng an toàn</p>
        </div>
          </>
        )}

        {/* 3. Tổng số vật tư y tế */}
        {canViewReports && (
        <div
          onClick={() => onNavigate('supplies')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#147D80] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Vật tư y tế sơ cứu</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF5F4] text-[#147D80] flex items-center justify-center">
              <BriefcaseMedical className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#17324D] tabular-nums">
              {metrics.totalSuppliesCount}
            </span>
            <span className="text-xs text-[#64748B] tabular-nums">loại ({metrics.totalMedicalSupplies} ĐV)</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Bông, băng, gạc, sát khuẩn</p>
        </div>
        )}

        {canManageMedicine && (
          <>
        {/* 4. Tổng số lượng tồn kho */}
        <div
          onClick={() => onNavigate('stock')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#147D80] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Tổng tồn thực tế</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#17324D] tabular-nums">
              {db.getBatches().reduce((s, b) => s + (b.quantity || 0), 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">đơn vị</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Trên toàn bộ {metrics.totalBatches} lô kho</p>
        </div>

        {/* 5. Thuốc sắp hết */}
        <div
          onClick={() => onNavigate('low_stock')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#B45309] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Dưới mức dự trữ</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${metrics.lowStockCount > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
              {metrics.lowStockCount}
            </span>
            <span className="text-xs text-[#64748B]">loại cần bổ sung</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">≤ Định mức tồn tối thiểu</p>
        </div>

        {/* 6. Thuốc sắp hết hạn */}
        <div
          onClick={() => onNavigate('expiry_tracking')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#B45309] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Sắp hết hạn</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${metrics.expiringSoonCount > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
              {metrics.expiringSoonCount}
            </span>
            <span className="text-xs text-[#64748B]">lô (≤ 30 ngày)</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Ưu tiên xuất theo FEFO</p>
        </div>

        {/* 7. Thuốc đã hết hạn */}
        <div
          onClick={() => onNavigate('expiry_tracking')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#B91C1C] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Đã hết hạn</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tabular-nums ${metrics.expiredCount > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
              {metrics.expiredCount}
            </span>
            <span className="text-xs text-[#64748B]">lô quá hạn</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Cách ly, không cấp phát</p>
        </div>
          </>
        )}

        {/* 8. Lượt cấp phát trong tháng */}
        {canViewReports && (
        <div
          onClick={() => onNavigate('usage_book')}
          className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#147D80] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">Lượt cấp phát tháng này</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#17324D] tabular-nums">
              {metrics.monthlyUsageCount}
            </span>
            <span className="text-xs text-[#64748B]">lượt HS / GV</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Ghi nhận vào sổ sử dụng</p>
        </div>
        )}
      </div>
      )}

      {/* Danh Sách Ca Bệnh Trong Ngày Tại Phòng Y Tế */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="p-4 sm:px-5 bg-[#F5F7FA] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#17324D] text-white flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#17324D]">
                  Ca Khám Trong Ngày Tại Phòng Y Tế
                </h3>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#EAF5F4] text-[#147D80] border border-[#B2D8D6] tabular-nums">
                  {todayVisits.length} ca thực tế
                </span>
                {todayVisits.length > 0 && (
                  <span className="text-xs font-medium text-[#64748B] tabular-nums">
                    • Ngày {formatDateVN(todayVisits[0].visitDate)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Đồng bộ trực tiếp theo thời gian thực trên hệ thống
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManageClinicVisits && (
              <button
                type="button"
                onClick={() => onNavigate('clinic_reception')}
                className="px-3.5 py-2 rounded-lg bg-[#147D80] hover:bg-[#106366] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                + Tiếp nhận ca mới
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('clinic_visits')}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#EAF5F4] text-[#17324D] border border-[#E2E8F0] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#147D80]" />
              <span>Mở Sổ phòng y tế</span>
            </button>
          </div>
        </div>

        {todayVisits.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748B]">
            Chưa có ca khám nào được ghi nhận trong ngày. Nhấn <strong>&ldquo;+ Tiếp nhận ca mới&rdquo;</strong> để ghi nhận học sinh đến phòng y tế.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F5F7FA] text-[#64748B] font-semibold uppercase text-[11px] tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-4">Mã ca / Thời gian</th>
                  <th className="py-2.5 px-4">Họ và tên học sinh</th>
                  <th className="py-2.5 px-4">Lớp</th>
                  <th className="py-2.5 px-4">Lý do & Tình trạng</th>
                  <th className="py-2.5 px-4">Xử trí & Thuốc cấp</th>
                  <th className="py-2.5 px-4">Kết quả & Bàn giao</th>
                  <th className="py-2.5 px-4">Cán bộ Y tế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {todayVisits.map((v) => {
                  const meds = v.medicinesUsed || v.medicinesDispensed || [];
                  const reasonText =
                    (v.reasons && v.reasons.length > 0 ? v.reasons.join(', ') : v.customReason) ||
                    v.reason ||
                    'Khám y tế';
                  return (
                    <tr
                      key={v.id}
                      onClick={() => onNavigate('clinic_visits')}
                      className="hover:bg-[#F5F7FA] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <span className="font-mono font-semibold text-[#17324D] block">{v.visitCode}</span>
                        <span className="text-[11px] text-[#64748B]">
                          {v.timeIn || '08:00'}
                          {v.timeOut ? ` - ${v.timeOut}` : ''} • {formatDateVN(v.visitDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="font-semibold text-[#1E293B] block"
                          title={db.isPrivacyModeEnabled() ? 'Đang bật bảo mật ẩn tên' : v.studentName}
                        >
                          {maskStudentName(v.studentName, db.isPrivacyModeEnabled())}
                        </span>
                        {v.studentCode && (
                          <span className="text-[11px] font-mono text-[#64748B]">Mã HS: {v.studentCode}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#17324D] whitespace-nowrap">
                        Lớp {v.className}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#1E293B] block">{reasonText}</span>
                        {v.initialCondition && (
                          <span className="text-[11px] text-[#64748B] block">{v.initialCondition}</span>
                        )}
                        <span className="text-[11px] text-[#64748B] tabular-nums">
                          {v.vitals?.temperature ? `Nhiệt độ: ${v.vitals.temperature}°C` : ''}
                          {v.vitals?.weight ? ` • Cân nặng: ${v.vitals.weight}kg` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#1E293B] block">
                          {v.treatmentDetails || v.treatmentType || v.treatment || 'Nghỉ ngơi, theo dõi'}
                        </span>
                        {meds.length > 0 ? (
                          <span className="text-[11px] font-semibold text-[#147D80] block mt-0.5 tabular-nums">
                            Thuốc: {meds.map((m) => `${m.medicineName} (${m.quantity} ${m.unit})`).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#64748B]">Không cấp thuốc</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                          {v.outcome || 'Đã ổn định'}
                        </span>
                        {v.parentContacted && (
                          <span className="block text-[11px] text-[#1D4ED8] font-medium mt-0.5">
                            ✓ Đã báo phụ huynh
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] font-medium whitespace-nowrap">
                        {v.performer || 'Nhân viên Y tế'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recharts Visual Analytics Section */}
      {(canManageTransactions || canManageMedicine || canManageInventoryCheck) && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Trend Bar Chart */}
        {canManageTransactions && (
        <div className={`${canManageMedicine || canManageInventoryCheck ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white rounded-xl p-5 border border-[#E2E8F0] flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#EAF5F4] text-[#147D80] rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17324D]">
                    Biến Động Xuất – Nhập Thuốc Qua Các Tháng
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Theo dõi số lượt giao dịch thực tế phát sinh trong năm học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('stock_balance')}
                className="text-xs text-[#147D80] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Mở Sổ Nhập - Xuất - Tồn</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => [
                      `${val} lượt`,
                      name === 'imports' ? 'Lượt nhập kho' : 'Lượt xuất cấp phát',
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    formatter={(val) => (
                      <span className="text-xs text-[#64748B] font-medium">
                        {val === 'imports' ? 'Nhập kho (+)' : 'Xuất dùng (-)'}
                      </span>
                    )}
                  />
                  <Bar dataKey="imports" name="imports" fill="#17324D" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="exports" name="exports" fill="#147D80" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="pt-3 mt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span>Dữ liệu thực tế đối chiếu từ Sổ Nhập - Xuất - Tồn</span>
            <span className="text-[#147D80] font-medium">Tự động đồng bộ</span>
          </div>
        </div>
        )}

        {/* Right: Expiry Structure Pie Chart */}
        {(canManageMedicine || canManageInventoryCheck) && (
        <div className={`${canManageTransactions ? 'lg:col-span-4' : 'lg:col-span-12'} bg-white rounded-xl p-5 border border-[#E2E8F0] flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-[#EAF5F4] text-[#147D80] rounded-lg">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#17324D]">
                  Cơ Cấu Tình Trạng Hạn Dùng
                </h3>
                <p className="text-xs text-[#64748B]">
                  Phân loại an toàn trên {metrics.totalBatches} lô
                </p>
              </div>
            </div>

            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expiryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expiryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} lô`, 'Số lượng']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900">{metrics.totalBatches}</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase">Tổng lô</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              {expiryPieData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{entry.value} lô</span>
                </div>
              ))}
            </div>
          </div>

          {canManageInventoryCheck && (
            <div className="pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onNavigate('inventory_check')}
                className="text-[#147D80] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Biên bản kiểm kê kho →</span>
              </button>
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Tables Section: FEFO Priority Queue & Recent Transactions */}
      {(canManageMedicine || canManageTransactions) && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: FEFO Dispensing Priority Queue */}
        {canManageMedicine && (
        <div className={`${canManageTransactions ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white rounded-xl p-5 border border-[#E2E8F0]`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                <ClockAlert className="w-4 h-4 text-[#147D80]" />
                <span>Hàng Đợi Xuất Thuốc Theo Nguyên Tắc FEFO</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Lô có hạn sử dụng gần nhất được hệ thống đề xuất xuất trước
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('medicines')}
              className="text-xs text-[#147D80] font-semibold hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F5F7FA] text-[#64748B] font-semibold uppercase text-[11px] tracking-wider border-y border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Tên thuốc / Vật tư</th>
                  <th className="py-2.5 px-3">Số lô</th>
                  <th className="py-2.5 px-3">Hạn sử dụng</th>
                  <th className="py-2.5 px-3 text-right">Lượng tồn</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {db
                  .getBatches()
                  .filter((b) => b.quantity > 0)
                  .sort((a, b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime())
                  .slice(0, 6)
                  .map((b) => {
                    const med = medicines.find((m) => m.id === b.medicineId);
                    const daysLeft = getDaysRemaining(b.expDate);
                    return (
                      <tr key={b.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#1E293B]">
                          {med?.name || '---'}
                          <span className="block text-[11px] font-normal text-[#64748B]">
                            {med?.dosageForm} ({med?.strength})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-[#1E293B] tabular-nums">
                          {b.batchNumber}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap tabular-nums">
                          <span className="font-semibold text-[#1E293B]">
                            {formatDateVN(b.expDate)}
                          </span>
                          <span
                            className={`block text-[11px] font-semibold ${
                              daysLeft < 0
                                ? 'text-[#B91C1C]'
                                : daysLeft <= 30
                                ? 'text-[#B45309]'
                                : 'text-[#15803D]'
                            }`}
                          >
                            {daysLeft < 0
                              ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                              : `Còn ${daysLeft} ngày`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#17324D] tabular-nums">
                          {b.quantity} <span className="text-[11px] font-normal text-[#64748B]">{med?.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {daysLeft < 0 ? (
                            <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] text-[11px] font-semibold">
                              Đã hết hạn
                            </span>
                          ) : daysLeft <= 30 ? (
                            <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[11px] font-semibold">
                              Sắp hết hạn
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] text-[11px] font-semibold">
                              Bình thường
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
        )}

        {/* Right: Recent Transactions */}
        {canManageTransactions && (
        <div className={`${canManageMedicine ? 'lg:col-span-5' : 'lg:col-span-12'} bg-white rounded-xl p-5 border border-[#E2E8F0] flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#17324D] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#147D80]" />
                  <span>Giao Dịch Nhập - Xuất Gần Đây</span>
                </h3>
                <p className="text-xs text-[#64748B]">Lịch sử phiếu đã lưu vào cơ sở dữ liệu</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('stock')}
                className="text-xs text-[#147D80] font-semibold hover:underline cursor-pointer"
              >
                Chi tiết tồn
              </button>
            </div>

            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  Chưa có giao dịch nào được tạo.
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const isImport = tx.type === 'import';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isImport
                              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                              : 'bg-[#EAF5F4] text-[#147D80]'
                          }`}
                        >
                          {isImport ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#17324D]">
                              {tx.transactionCode}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isImport
                                  ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                  : 'bg-[#EAF5F4] text-[#147D80] border border-[#B2D8D6]'
                              }`}
                            >
                              {isImport ? 'Nhập kho' : 'Xuất dùng'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#1E293B] mt-0.5">
                            {isImport
                              ? `Nguồn: ${tx.source || 'Nhà cung cấp'}`
                              : `Cấp cho: ${tx.recipientName} (${tx.recipientClass || tx.recipientType})`}
                          </p>
                          <p className="text-[11px] text-[#64748B] tabular-nums">
                            Ngày: {formatDateVN(tx.date)} • {tx.items.length} mặt hàng
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <span className="font-bold text-[#17324D]">
                          {tx.items.reduce((s, i) => s + (i.quantity || 0), 0).toLocaleString()} {tx.items[0]?.unit || 'đơn vị'}
                        </span>
                        <span className="block text-[11px] text-[#15803D] font-medium">
                          Đã lưu
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span>Phụ trách: Nhân viên Y tế</span>
            {canViewReports && (
              <button
                type="button"
                onClick={() => onNavigate('usage_book')}
                className="text-[#147D80] font-semibold hover:underline cursor-pointer"
              >
                Mở Sổ theo dõi sử dụng →
              </button>
            )}
          </div>
        </div>
        )}
      </div>
      )}

      {/* Alert Detail Modal */}
      {activeAlertModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl border border-[#E2E8F0]">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F5F7FA]">
              <div className="flex items-center gap-2">
                {activeAlertModal === 'expired' && (
                  <>
                    <Flame className="w-5 h-5 text-[#B91C1C]" />
                    <h3 className="font-bold text-[#B91C1C] text-sm">
                      DANH SÁCH THUỐC ĐÃ HẾT HẠN (CẦN CÁCH LY & TIÊU HỦY)
                    </h3>
                  </>
                )}
                {activeAlertModal === 'expiring_soon' && (
                  <>
                    <ClockAlert className="w-5 h-5 text-[#B45309]" />
                    <h3 className="font-bold text-[#B45309] text-sm">
                      DANH SÁCH THUỐC SẮP HẾT HẠN (CÒN DƯỚI 30 NGÀY)
                    </h3>
                  </>
                )}
                {activeAlertModal === 'low_stock' && (
                  <>
                    <AlertTriangle className="w-5 h-5 text-[#B45309]" />
                    <h3 className="font-bold text-[#B45309] text-sm">
                      DANH SÁCH THUỐC DƯỚI MỨC DỰ TRỮ (CẦN BỔ SUNG KHO)
                    </h3>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveAlertModal(null)}
                className="text-[#64748B] hover:text-[#1E293B] text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-white cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              {activeAlertModal === 'expired' && (
                <>
                  <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] rounded-lg border border-[#FECACA]">
                    <p className="font-bold">Quy định y tế học đường:</p>
                    <p>
                      Tuyệt đối không cấp phát thuốc đã hết hạn sử dụng cho học sinh, giáo viên.
                      Phải di chuyển vào ngăn cách ly và lập biên bản kiểm kê, tiêu hủy theo quy định.
                    </p>
                  </div>
                  {expiredItems.length === 0 ? (
                    <p className="text-center py-6 text-[#64748B]">
                      Không có thuốc nào bị hết hạn.
                    </p>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-[#F5F7FA] text-[#64748B] font-semibold border-y border-[#E2E8F0]">
                        <tr>
                          <th className="p-2.5">Tên thuốc</th>
                          <th className="p-2.5">Số lô</th>
                          <th className="p-2.5">Hạn sử dụng</th>
                          <th className="p-2.5 text-right">Số lượng tồn</th>
                          <th className="p-2.5">Vị trí lưu trữ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {expiredItems.map(({ batch, medicine, days }) => (
                          <tr key={batch.id} className="hover:bg-[#F5F7FA]">
                            <td className="p-2.5 font-semibold text-[#1E293B]">{medicine?.name}</td>
                            <td className="p-2.5 font-mono">{batch.batchNumber}</td>
                            <td className="p-2.5 text-[#B91C1C] font-semibold tabular-nums">
                              {formatDateVN(batch.expDate)} (Quá {Math.abs(days)} ngày)
                            </td>
                            <td className="p-2.5 text-right font-bold text-[#B91C1C] tabular-nums">
                              {batch.quantity} {medicine?.unit}
                            </td>
                            <td className="p-2.5 text-[#64748B]">{batch.storageLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {activeAlertModal === 'expiring_soon' && (
                <>
                  <div className="p-3 bg-[#FFFBEB] text-[#B45309] rounded-lg border border-[#FDE68A]">
                    <p className="font-bold">Đề xuất xử lý:</p>
                    <p>
                      Ưu tiên xuất dùng các lô thuốc này trước theo nguyên tắc FEFO. Nếu dự kiến
                      không dùng hết trước khi hết hạn, báo cáo y tế để điều phối hoặc dự trù.
                    </p>
                  </div>
                  {expiringSoonItems.length === 0 ? (
                    <p className="text-center py-6 text-[#64748B]">
                      Tất cả thuốc đều còn hạn an toàn trên 30 ngày.
                    </p>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-[#F5F7FA] text-[#64748B] font-semibold border-y border-[#E2E8F0]">
                        <tr>
                          <th className="p-2.5">Tên thuốc</th>
                          <th className="p-2.5">Số lô</th>
                          <th className="p-2.5">Hạn dùng</th>
                          <th className="p-2.5">Còn lại</th>
                          <th className="p-2.5 text-right">Lượng tồn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {expiringSoonItems.map(({ batch, medicine, days }) => (
                          <tr key={batch.id} className="hover:bg-[#F5F7FA]">
                            <td className="p-2.5 font-semibold text-[#1E293B]">{medicine?.name}</td>
                            <td className="p-2.5 font-mono">{batch.batchNumber}</td>
                            <td className="p-2.5 font-semibold tabular-nums">{formatDateVN(batch.expDate)}</td>
                            <td className="p-2.5 text-[#B45309] font-semibold tabular-nums">Còn {days} ngày</td>
                            <td className="p-2.5 text-right font-bold tabular-nums">
                              {batch.quantity} {medicine?.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {activeAlertModal === 'low_stock' && (
                <>
                  <div className="p-3 bg-[#FFFBEB] text-[#B45309] rounded-lg border border-[#FDE68A]">
                    <p className="font-bold">Cảnh báo tồn kho an toàn:</p>
                    <p>
                      Các loại thuốc dưới đây đã chạm hoặc nhỏ hơn mức tồn tối thiểu cần thiết để
                      đáp ứng sơ cứu khẩn cấp cho học sinh trong trường.
                    </p>
                  </div>
                  {lowStockItems.length === 0 ? (
                    <p className="text-center py-6 text-[#64748B]">
                      Tất cả các thuốc đều đạt định mức tồn tối thiểu.
                    </p>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-[#F5F7FA] text-[#64748B] font-semibold border-y border-[#E2E8F0]">
                        <tr>
                          <th className="p-2.5">Mã thuốc</th>
                          <th className="p-2.5">Tên thuốc</th>
                          <th className="p-2.5 text-right">Tồn hiện tại</th>
                          <th className="p-2.5 text-right">Tồn tối thiểu</th>
                          <th className="p-2.5 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {lowStockItems.map((med) => (
                          <tr key={med.id} className="hover:bg-[#F5F7FA]">
                            <td className="p-2.5 font-mono">{med.code}</td>
                            <td className="p-2.5 font-semibold text-[#1E293B]">{med.name}</td>
                            <td className="p-2.5 text-right font-bold text-[#B45309] tabular-nums">
                              {med.totalStock} {med.unit}
                            </td>
                            <td className="p-2.5 text-right text-[#64748B] tabular-nums">
                              {med.minStock} {med.unit}
                            </td>
                            <td className="p-2.5 text-center">
                              {canManageTransactions && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAlertModal(null);
                                    onNavigate('import');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#147D80] text-white font-semibold text-[11px] hover:bg-[#106366] cursor-pointer"
                                >
                                  + Nhập bổ sung
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>

            <div className="p-3 border-t border-[#E2E8F0] bg-[#F5F7FA] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveAlertModal(null)}
                className="px-4 py-2 bg-[#17324D] text-white font-semibold rounded-lg text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
