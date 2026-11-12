import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Menu,
  LogOut,
  GraduationCap,
  Stethoscope,
  ChevronDown,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Laptop,
  Copy,
  Check,
  X,
  Share2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { db, getRoleLabel } from '../services/db';
import { logout } from '../services/firebase';

interface HeaderProps {
  currentUser?: User;
  onRoleSwitch?: (role: UserRole) => void;
  onQuickAction?: (action: 'add_medicine' | 'import' | 'export' | 'stock' | 'print') => void;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  onToggleSidebar?: () => void;
  onOpenAddMedicine?: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onLogout?: () => void;
  schoolName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser: propUser,
  onRoleSwitch: propRoleSwitch,
  onQuickAction: propQuickAction,
  setIsSidebarOpen,
  onToggleSidebar,
  onOpenAddMedicine,
  onOpenImport,
  onOpenExport,
  onLogout,
  schoolName: propSchoolName,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'offline'>(
    () => db.getSyncStatus().state
  );
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => db.isPrivacyModeEnabled());
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [counts, setCounts] = useState(() => ({
    visits: db.getClinicVisits().length,
    todayVisits: db.getTodayClinicVisits().length,
    medicines: db.getMedicines().length,
    batches: db.getBatches().length,
    students: db.getStudents().length,
    classes: db.getSchoolClasses().length,
  }));

  const currentUser: User = propUser || db.getCurrentUser() || {
    id: 'role-medic',
    username: 'nhanvien_yte',
    fullName: 'Nhân viên Y tế',
    role: 'medic',
  };

  // Compute the public shared URL (converting ais-dev- to ais-pre- so it works on other computers)
  const sharedAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin.includes('ais-dev-')
        ? window.location.origin.replace('ais-dev-', 'ais-pre-')
        : window.location.origin
      : 'https://ais-pre-ikza6y7upnzkeaur4x2eyz-940744077607.asia-east1.run.app';

  const isUsingDevUrl =
    typeof window !== 'undefined' && window.location.origin.includes('ais-dev-');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const unsubDb = db.subscribe(() => {
      setSyncStatus(db.getSyncStatus().state);
      setPrivacyMode(db.isPrivacyModeEnabled());
      setCounts({
        visits: db.getClinicVisits().length,
        todayVisits: db.getTodayClinicVisits().length,
        medicines: db.getMedicines().length,
        batches: db.getBatches().length,
        students: db.getStudents().length,
        classes: db.getSchoolClasses().length,
      });
    });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      unsubDb();
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      // 1. Push local changes immediately so newly saved dispatches/records are preserved on the server
      await db.pushStateToServer();
      // 2. Pull and merge any changes from server and other machines
      await db.pullFromServerAndMerge(true);
      // 3. Confirm merged state is saved
      await db.pushStateToServer();
      await db.syncAllToCloud();
      setCounts({
        visits: db.getClinicVisits().length,
        todayVisits: db.getTodayClinicVisits().length,
        medicines: db.getMedicines().length,
        batches: db.getBatches().length,
        students: db.getStudents().length,
        classes: db.getSchoolClasses().length,
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopySharedLink = async () => {
    try {
      await navigator.clipboard.writeText(sharedAppUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = sharedAppUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleToggleSidebar = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (setIsSidebarOpen) {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  const handleRoleSwitch = (role: UserRole) => {
    if (propRoleSwitch) {
      propRoleSwitch(role);
    } else {
      db.setCurrentUserRole(role);
    }
    setRoleMenuOpen(false);
  };

  const handleQuickAction = (action: 'add_medicine' | 'import' | 'export' | 'stock' | 'print') => {
    if (propQuickAction) {
      propQuickAction(action);
    } else if (action === 'add_medicine' && onOpenAddMedicine) {
      onOpenAddMedicine();
    } else if (action === 'import' && onOpenImport) {
      onOpenImport();
    } else if (action === 'export' && onOpenExport) {
      onOpenExport();
    }
  };

  const schoolName = propSchoolName || db.getSettings()?.schoolName || 'TRƯỜNG THCS ĐÔNG THẠNH';

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'bgh':
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-[#17324D]" />;
      case 'medic':
      default:
        return <Stethoscope className="w-4 h-4 text-[#147D80]" />;
    }
  };

  const getRoleBadgeClasses = (role?: UserRole) => {
    switch (role) {
      case 'bgh':
      case 'admin':
        return 'bg-[#F5F7FA] text-[#17324D] border-[#E2E8F0] hover:bg-slate-100';
      case 'medic':
      default:
        return 'bg-[#EAF5F4] text-[#17324D] border-[#B2D8D6] hover:bg-[#D5EBEA]';
    }
  };

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
      {/* Utility Top Bar - School Identity & Live Multi-Computer Sync Status */}
      <div className="bg-[#F5F7FA] border-b border-[#E2E8F0] px-4 sm:px-6 py-1.5 text-xs text-[#64748B] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 font-medium min-w-0">
          <span className="flex items-center gap-1.5 font-semibold text-[#17324D] text-[11px] uppercase tracking-wider shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#147D80]"></span>
            Hệ Thống Y Tế Học Đường
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden="true">|</span>
          <span className="truncate text-[11px] text-[#64748B]">
            {syncStatus === 'saving' || isManualSyncing ? (
              <span className="text-[#147D80] font-semibold inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Đang lưu & đồng bộ máy chủ...
              </span>
            ) : syncStatus === 'loading' ? (
              <span className="text-[#147D80] font-semibold inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Đang tải dữ liệu từ máy chủ...
              </span>
            ) : syncStatus === 'error' ? (
              <span className="text-[#15803D] font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#15803D]" /> Đã lưu an toàn trên Máy chủ & Bộ nhớ máy ({counts.todayVisits} ca khám thực tế trong ngày • tổng {counts.visits} ca)
              </span>
            ) : (
              <span className="text-[#64748B]">
                Đã lưu bền vững: <strong className="text-[#17324D] tabular-nums">{counts.todayVisits} ca thực tế trong ngày</strong> <span className="text-[#64748B] font-medium tabular-nums">({counts.visits} ca toàn hệ thống)</span> •{' '}
                <strong className="text-[#17324D] tabular-nums">{counts.classes} lớp & GVCN</strong> •{' '}
                <strong className="text-[#1E293B]">
                  {privacyMode ? 'Đã ẩn tên (Bảo mật)' : (currentUser?.fullName || currentUser?.username)}
                </strong>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = db.togglePrivacyMode();
              setPrivacyMode(next);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              privacyMode
                ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                : 'bg-white text-[#1E293B] hover:bg-[#F5F7FA] border-[#E2E8F0]'
            }`}
            title={privacyMode ? 'Đang bật chế độ ẩn tên học sinh. Bấm để hiển thị tên.' : 'Bấm để ẩn tên học sinh và bảo mật thông tin trên màn hình'}
          >
            {privacyMode ? <EyeOff className="w-3 h-3 text-[#B45309]" /> : <Eye className="w-3 h-3 text-[#64748B]" />}
            <span>{privacyMode ? 'Đang ẩn tên HS' : 'Ẩn tên HS'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleManualSync();
              setShareModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#17324D] text-white hover:bg-[#0F2336] transition-colors cursor-pointer"
            title="Lấy link chuẩn để mở và sử dụng trên máy tính khác"
          >
            <Share2 className="w-3 h-3" />
            <span>Dùng trên máy tính khác</span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-[#17324D] border border-[#E2E8F0] hover:border-[#147D80] hover:bg-[#EAF5F4] transition-colors cursor-pointer disabled:opacity-50"
            title="Đồng bộ ngay dữ liệu giữa các máy tính"
          >
            <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-[#147D80]' : 'text-[#147D80]'}`} />
            <span className="hidden sm:inline">{isManualSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
          </button>

          <span className="hidden lg:inline-block text-[#64748B] font-semibold text-[11px]">
            {schoolName}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & School info */}
          <div className="flex items-center gap-3">
            <button
              id="btn-toggle-sidebar"
              type="button"
              onClick={handleToggleSidebar}
              className="p-2 rounded-lg text-[#64748B] hover:bg-[#F5F7FA] hover:text-[#17324D] cursor-pointer"
              title="Ẩn / Hiện thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#17324D] text-white flex items-center justify-center font-semibold text-lg shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] leading-none mb-1">
                  {schoolName}
                </p>
                <h1 className="text-base sm:text-lg font-bold text-[#17324D] leading-tight tracking-tight whitespace-nowrap">
                  Quản Lý Thuốc & Y Tế Học Đường
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Actions & Role switch */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {db.hasPermission('canManageMedicine') && (
                <button
                  id="btn-quick-add-medicine"
                  type="button"
                  onClick={() => handleQuickAction('add_medicine')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white text-[#1E293B] hover:bg-[#F5F7FA] border border-[#E2E8F0] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#147D80]" />
                  <span>Thêm thuốc</span>
                </button>
              )}

              {db.hasPermission('canManageTransactions') && (
                <>
                  <button
                    id="btn-quick-import"
                    type="button"
                    onClick={() => handleQuickAction('import')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#EAF5F4] text-[#147D80] hover:bg-[#D5EBEA] border border-[#B2D8D6] transition-colors cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4 text-[#147D80]" />
                    <span>Nhập kho</span>
                  </button>

                  <button
                    id="btn-quick-export"
                    type="button"
                    onClick={() => handleQuickAction('export')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#147D80] text-white hover:bg-[#106366] transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Xuất cấp phát</span>
                  </button>
                </>
              )}
            </div>

            {/* Privacy Mode Toggle Button */}
            <button
              id="btn-header-privacy-mode"
              type="button"
              onClick={() => {
                const next = db.togglePrivacyMode();
                setPrivacyMode(next);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                privacyMode
                  ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                  : 'bg-white text-[#1E293B] hover:bg-[#F5F7FA] border-[#E2E8F0]'
              }`}
              title={
                privacyMode
                  ? 'Đang bật chế độ ẩn tên học sinh. Nhấn để hiển thị họ tên đầy đủ.'
                  : 'Nhấn để ẩn tên học sinh (Chế độ bảo mật khi trình chiếu, chia sẻ màn hình)'
              }
            >
              {privacyMode ? (
                <>
                  <EyeOff className="w-4 h-4 text-[#B45309]" />
                  <span>Ẩn tên (Bật)</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-[#64748B]" />
                  <span className="hidden md:inline">Ẩn tên HS</span>
                </>
              )}
            </button>

            {/* Member Account Profile & Security Menu */}
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${getRoleBadgeClasses(
                  currentUser?.role
                )}`}
                title="Thông tin tài khoản & Đổi mật khẩu"
              >
                {getRoleIcon(currentUser?.role)}
                <div className="text-left">
                  <span className="block text-[10px] uppercase tracking-wider font-semibold text-[#64748B]">
                    {getRoleLabel(currentUser?.role || 'medic')}
                  </span>
                  <span className="hidden sm:inline font-semibold text-[#1E293B] truncate max-w-[140px]">
                    {currentUser?.fullName || currentUser?.username}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B] ml-0.5" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-3 z-50 text-xs space-y-2">
                  <div className="pb-2.5 border-b border-[#E2E8F0]">
                    <p className="font-bold text-[#17324D] text-xs">{currentUser?.fullName}</p>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      TK: {currentUser?.username} {currentUser?.email ? `• ${currentUser.email}` : ''}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#EAF5F4] text-[#147D80] font-semibold text-[10px] border border-[#B2D8D6]">
                      Vai trò: {getRoleLabel(currentUser?.role || 'medic')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRoleMenuOpen(false);
                      setCurrentPwd('');
                      setNewPwd('');
                      setConfirmPwd('');
                      setPwdError(null);
                      setPwdSuccess(null);
                      setChangePwdOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F5F7FA] text-[#1E293B] font-semibold transition-colors text-left cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-[#147D80] shrink-0" />
                    <span>Đổi mật khẩu cá nhân</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoleMenuOpen(false);
                      if (onLogout) {
                        onLogout();
                      } else {
                        logout();
                      }
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#B91C1C] font-semibold transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Đăng xuất khỏi hệ thống</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  logout();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] bg-white hover:bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg transition-colors cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4 text-[#64748B]" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Hướng dẫn & Link Sử dụng trên Máy tính khác */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EAF5F4] text-[#147D80] flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#17324D]">
                    Sử Dụng Ứng Dụng Trên Máy Tính Khác
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Đồng bộ trực tiếp Ca khám, Tồn kho thuốc & Danh sách học sinh giữa các máy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded-lg hover:bg-[#F5F7FA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isUsingDevUrl && (
              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#B45309] space-y-1">
                <p className="font-bold text-[#B45309]">
                  Lưu ý quan trọng khi mở trên máy tính khác:
                </p>
                <p className="leading-relaxed text-[#92400E]">
                  Đường dẫn có chữ <code className="font-mono font-bold bg-amber-100 px-1 rounded">ais-dev-...</code> chỉ dành riêng cho tài khoản đang mở trình thiết kế nên máy tính khác sẽ bị chặn. Để mở trên máy tính khác, Quý Thầy/Cô vui lòng sử dụng <strong>Link Chia Sẻ (<code className="font-mono">ais-pre-...</code>)</strong> bên dưới:
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Link chuẩn dùng để mở trên máy tính / điện thoại khác:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={sharedAppUrl}
                  className="flex-1 px-3 py-2.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-xl text-indigo-900 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopySharedLink}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Server Sync Summary */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dữ liệu đang lưu trên Máy chủ Trường học:
                </span>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                  <div className="text-base font-black text-emerald-700">{counts.todayVisits}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Ca thực tế hôm nay ({counts.visits} tổng)</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                  <div className="text-base font-black text-indigo-700">{counts.batches}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Lô thuốc tồn kho</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                  <div className="text-base font-black text-teal-700">{counts.classes}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Lớp & GVCN</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                  <div className="text-base font-black text-purple-700">{counts.students}</div>
                  <div className="text-[11px] text-slate-600 font-medium">Học sinh</div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                ✓ Khi máy tính khác mở Link trên, chỉ cần nhập Email (ví dụ: <code className="font-mono font-bold">doanthiminhtrang3990@gmail.com</code>) hoặc bấm chọn vai trò là toàn bộ ca khám, thuốc đã trừ kho và danh sách học sinh sẽ tự động hiển thị đầy đủ.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Đổi mật khẩu cá nhân */}
      {changePwdOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Đổi Mật Khẩu Cá Nhân</h3>
                  <p className="text-slate-500">
                    Tài khoản: <strong>{currentUser?.fullName}</strong> (
                    <code className="font-mono">{currentUser?.username}</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePwdOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                {pwdSuccess}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPwdError(null);
                setPwdSuccess(null);
                if (newPwd.length < 8) {
                  setPwdError('Mật khẩu mới phải có ít nhất 8 ký tự.');
                  return;
                }
                if (newPwd !== confirmPwd) {
                  setPwdError('Mật khẩu xác nhận không khớp.');
                  return;
                }
                setPwdLoading(true);
                try {
                  const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: db.getAuthHeaders(),
                    body: JSON.stringify({
                      currentPassword: currentPwd,
                      newPassword: newPwd,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.ok) {
                    setPwdError(data.error || 'Không thể đổi mật khẩu.');
                    return;
                  }
                  if (data.user) {
                    db.setCurrentUser(data.user);
                  }
                  setPwdSuccess('Đã cập nhật mật khẩu mới thành công!');
                  setTimeout(() => setChangePwdOpen(false), 1500);
                } catch {
                  setPwdError('Lỗi kết nối máy chủ.');
                } finally {
                  setPwdLoading(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mật khẩu mới (Tối thiểu 8 ký tự, gồm chữ và số)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePwdOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {pwdLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
