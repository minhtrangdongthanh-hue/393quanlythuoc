import React, { useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Pill,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Boxes,
  ClockAlert,
  AlertTriangle,
  BriefcaseMedical,
  Truck,
  BarChart3,
  Settings,
  X,
  ShieldCheck,
  ClipboardCheck,
  Stethoscope,
  Users,
  Activity,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  HeartPulse,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db, getRoleLabel } from '../services/db';

export type NavTab =
  | 'dashboard'
  | 'clinic_reception'
  | 'staff_dispense'
  | 'clinic_visits'
  | 'students'
  | 'school_health'
  | 'medicines'
  | 'import'
  | 'import_medicine'
  | 'export'
  | 'export_medicine'
  | 'stock_balance'
  | 'inventory_check'
  | 'usage_book'
  | 'stock'
  | 'stock_report'
  | 'expiry_tracking'
  | 'low_stock'
  | 'supplies'
  | 'suppliers'
  | 'reports'
  | 'comprehensive_reports'
  | 'medication_usage'
  | 'supply_usage'
  | 'print_templates'
  | 'audit_logs'
  | 'settings';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: any) => void;
  isOpen?: boolean;
  isOpenMobile?: boolean;
  onClose?: () => void;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  metrics?: {
    expiredCount: number;
    expiringSoonCount: number;
    lowStockCount: number;
    totalMedicineTypes: number;
  };
}

const SidebarComponent: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  isOpen,
  isOpenMobile,
  onClose,
  onCloseMobile,
  onLogout,
  metrics: propsMetrics,
}) => {
  const current = activeTab || currentTab || 'dashboard';
  const open = isOpenMobile ?? isOpen ?? false;
  const handleClose = onCloseMobile || onClose || (() => {});

  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const unsub = db.subscribe(() => {
      setDbTick((t) => t + 1);
    });
    return () => unsub();
  }, []);

  const metrics = useMemo(() => propsMetrics || db.getDashboardMetrics(), [propsMetrics, dbTick]);
  const pendingChecks = useMemo(() => db.getInventoryChecks().filter((c) => c.status === 'draft').length, [dbTick]);
  const studentsCount = useMemo(() => db.getStudents().length, [dbTick]);
  const visitsToday = useMemo(() => {
    return db.getTodayClinicVisits().length;
  }, [dbTick]);

  const currentUser = useMemo(() => db.getCurrentUser(), [dbTick]);
  const rolePermissions = useMemo(() => db.getCurrentRolePermissions(), [dbTick]);

  // Desktop sidebar collapse state (allows shrinking sidebar so content is never squished or hidden)
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(() => {
    try {
      return localStorage.getItem('thcs_sidebar_collapsed_desktop') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDesktopCollapse = () => {
    setIsCollapsedDesktop((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('thcs_sidebar_collapsed_desktop', String(next));
      } catch {}
      return next;
    });
  };

  const rawSections = [
    {
      title: 'KHÁM & SỨC KHỎE HỌC SINH',
      items: [
        {
          id: 'dashboard',
          label: 'Trang chủ tổng quan',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'clinic_reception',
          label: 'Tiếp nhận khám sơ cứu',
          icon: Stethoscope,
          badge: visitsToday > 0 ? `${visitsToday} ca` : null,
          badgeColor: 'bg-[#EAF5F4] text-[#147D80] border border-[#B2D8D6]',
        },
        {
          id: 'staff_dispense',
          label: 'Cho thuốc Giáo viên & CNV',
          icon: BriefcaseMedical,
          badge: 'GV & NV',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'clinic_visits',
          label: 'Sổ theo dõi phòng y tế',
          icon: BookOpen,
          badge: visitsToday > 0 ? `${visitsToday} ca hôm nay` : null,
          badgeColor: 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
        },
        {
          id: 'students',
          label: 'Hồ sơ sức khỏe học sinh',
          icon: Users,
          badge: `${studentsCount} HS`,
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
      ],
    },
    {
      title: 'QUẢN LÝ THUỐC & KHO DƯỢC',
      items: [
        {
          id: 'medicines',
          label: 'Quản lý thuốc & vật tư',
          icon: Pill,
          badge: `${metrics.totalMedicineTypes} mục`,
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'import_medicine',
          label: 'Nhập thuốc vào tủ y tế',
          icon: ArrowDownLeft,
          badge: null,
        },
        {
          id: 'export_medicine',
          label: 'Xuất cấp phát (Hạn gần)',
          icon: ArrowUpRight,
          badge: 'FEFO',
          badgeColor: 'bg-[#EAF5F4] text-[#147D80] border border-[#B2D8D6]',
        },
        {
          id: 'stock_balance',
          label: 'Sổ nhập - xuất - tồn kho',
          icon: BookOpen,
          badge: 'Mẫu A4',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'inventory_check',
          label: 'Kiểm kê kho định kỳ',
          icon: ClipboardCheck,
          badge: pendingChecks > 0 ? `${pendingChecks} chờ duyệt` : null,
          badgeColor: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
        },
        {
          id: 'stock_report',
          label: 'Tồn kho theo hạn dùng',
          icon: Boxes,
          badge: null,
        },
        {
          id: 'expiry_tracking',
          label: 'Theo dõi thuốc hết hạn',
          icon: ClockAlert,
          badge: metrics.expiredCount > 0 ? `${metrics.expiredCount} hết hạn` : null,
          badgeColor: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
        },
        {
          id: 'low_stock',
          label: 'Thuốc dưới mức dự trữ',
          icon: AlertTriangle,
          badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} loại` : null,
          badgeColor: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
        },
        {
          id: 'supply_usage',
          label: 'Vật tư tiêu hao sơ cứu',
          icon: BriefcaseMedical,
          badge: null,
        },
      ],
    },
    {
      title: 'BÁO CÁO, MẪU IN & HỆ THỐNG',
      items: [
        {
          id: 'comprehensive_reports',
          label: 'Báo cáo công tác y tế',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'medication_usage',
          label: 'Truy xuất thuốc - Học sinh',
          icon: FileSpreadsheet,
          badge: 'FEFO',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'print_templates',
          label: 'Mẫu in sổ A4 chuẩn Bộ',
          icon: Printer,
          badge: 'A4',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'audit_logs',
          label: 'Bảo mật & Phân quyền',
          icon: ShieldCheck,
          badge: 'Quản trị',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
        {
          id: 'settings',
          label: 'Cài đặt & Sao lưu dữ liệu',
          icon: Settings,
          badge: 'Quản trị',
          badgeColor: 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]',
        },
      ],
    },
  ];

  // Chỉ hiển thị các phần được cấp quyền trên ứng dụng
  const sections = useMemo(() => {
    void rolePermissions;
    return rawSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => db.canAccessTab(item.id)),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [dbTick, rolePermissions, metrics, pendingChecks, studentsCount, visitsToday]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isCollapsedDesktop ? 'lg:w-20' : 'lg:w-72'
        } ${open ? 'translate-x-0 w-72' : '-translate-x-full w-72'}`}
      >
        {/* School branding header */}
        <div className={`px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white ${isCollapsedDesktop ? 'lg:flex-col lg:gap-2 lg:py-3' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#17324D] text-white flex items-center justify-center font-semibold text-sm shrink-0">
              <HeartPulse className="w-4 h-4" />
            </div>
            {!isCollapsedDesktop && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#17324D] uppercase tracking-wide truncate">
                  Y Tế Học Đường
                </p>
                <p className="text-[11px] text-[#64748B] font-medium truncate">THCS Đông Thạnh</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggleDesktopCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[#64748B] hover:text-[#17324D] hover:bg-[#F5F7FA] cursor-pointer"
              title={isCollapsedDesktop ? 'Mở rộng thanh menu' : 'Thu nhỏ thanh menu (tiết kiệm màn hình)'}
            >
              {isCollapsedDesktop ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={handleClose}
              className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-[#17324D] hover:bg-[#F5F7FA]"
              title="Đóng thanh điều hướng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Health Summary Bar */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('clinic_reception');
            if (open) handleClose();
          }}
          className={`mx-3 my-2.5 p-2 bg-[#F5F7FA] hover:bg-[#EAF5F4] border border-[#E2E8F0] rounded-lg flex items-center transition-colors cursor-pointer text-left group ${
            isCollapsedDesktop ? 'lg:justify-center lg:mx-2 lg:p-2' : 'justify-between px-3 py-2'
          }`}
          title={`Xem các ca tiếp nhận thực tế hôm nay (${visitsToday} ca)`}
        >
          {isCollapsedDesktop ? (
            <div className="relative">
              <HeartPulse className="w-4 h-4 text-[#147D80]" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#15803D] ring-2 ring-white"></span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
                <span className="font-semibold text-[#17324D] text-xs">
                  Phòng Y Tế
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#147D80] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] tabular-nums">
                {visitsToday} ca hôm nay
              </span>
            </>
          )}
        </button>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsedDesktop && (
                <p className="px-2.5 py-1 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  {sec.title}
                </p>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  current === item.id ||
                  (item.id === 'import_medicine' && current === 'import') ||
                  (item.id === 'export_medicine' && current === 'export') ||
                  (item.id === 'stock_report' && current === 'stock') ||
                  (item.id === 'comprehensive_reports' && current === 'reports');

                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      handleClose();
                    }}
                    title={item.label}
                    className={`w-full flex items-center rounded-lg text-[13px] transition-colors duration-150 cursor-pointer ${
                      isCollapsedDesktop
                        ? 'lg:justify-center lg:p-2.5 px-3 py-2 justify-between'
                        : 'justify-between px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[#EAF5F4] text-[#17324D] font-semibold border-l-[3px] border-[#147D80]'
                        : 'text-[#1E293B] font-medium hover:bg-[#F5F7FA] hover:text-[#17324D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#147D80]' : 'text-[#64748B]'
                        }`}
                      />
                      {!isCollapsedDesktop && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsedDesktop && item.badge && (
                      <span
                        className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded shrink-0 whitespace-nowrap tabular-nums ${
                          isActive
                            ? 'bg-white text-[#147D80] border border-[#B2D8D6]'
                            : item.badgeColor || 'bg-[#F5F7FA] text-[#64748B] border border-[#E2E8F0]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile & safety advice footer */}
        <div className={`p-3 border-t border-[#E2E8F0] bg-[#F5F7FA] space-y-2 ${isCollapsedDesktop ? 'lg:p-2' : ''}`}>
          <div className={`flex items-center ${isCollapsedDesktop ? 'lg:justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-[#17324D] text-white font-semibold flex items-center justify-center text-xs shrink-0"
                title={currentUser?.fullName}
              >
                {currentUser?.fullName?.charAt(0) || 'Y'}
              </div>
              {!isCollapsedDesktop && (
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-[#1E293B] truncate max-w-[125px]">
                    {currentUser?.fullName?.split('(')[0]?.trim() || 'Cán bộ Y tế'}
                  </p>
                  <p className="text-[11px] text-[#64748B] font-medium">
                    {getRoleLabel(currentUser?.role || 'medic')}
                  </p>
                </div>
              )}
            </div>
            {!isCollapsedDesktop && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]"></span>
                Trực tuyến
              </span>
            )}
          </div>

          {!isCollapsedDesktop && (
            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#64748B] truncate">
                Kiểm tra dị ứng trước khi cấp
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-[#E2E8F0] transition-colors shrink-0 cursor-pointer"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export const Sidebar = React.memo(SidebarComponent);
