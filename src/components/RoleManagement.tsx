import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Check,
  X,
  Info,
  Sliders,
  UserPlus,
  KeyRound,
  Edit3,
  Trash2,
  Copy,
  Mail,
  User as UserIcon,
  Clock,
  Link2,
  ShieldAlert,
} from 'lucide-react';
import { db, getRoleLabel } from '../services/db';
import { User as UserType, UserRole, UserPermission } from '../types';

export interface PermissionConfigItem {
  key: keyof UserPermission;
  shortLabel: string;
  label: string;
  description: string;
  group: 'Chuyên môn Y tế & Dược học đường' | 'Quản trị, Phê duyệt & Bảo mật hệ thống';
  adminDefault: boolean;
  medicDefault: boolean;
}

const PERMISSION_CONFIG: PermissionConfigItem[] = [
  {
    key: 'canManageClinicVisits',
    shortLabel: 'Tiếp nhận & Cấp thuốc',
    label: '1. Tiếp nhận khám sơ cứu, đo cân nặng & cấp phát thuốc',
    description:
      'Ghi nhận ca khám tại Phòng Y tế, nhập cân nặng học sinh, tự động cân đối liều lượng thuốc theo kg và trừ tồn kho FEFO.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canManageStudents',
    shortLabel: 'Hồ sơ sức khỏe HS',
    label: '2. Quản lý Hồ sơ sức khỏe học sinh, Tai nạn & Khám định kỳ',
    description:
      'Quản lý danh sách học sinh toàn trường, tiền sử dị ứng, bệnh nền, chiều cao - cân nặng - BMI và đợt khám sức khỏe định kỳ.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canManageMedicine',
    shortLabel: 'Danh mục thuốc & Vật tư',
    label: '3. Quản lý Danh mục Thuốc & Vật tư y tế thiết yếu',
    description:
      'Quản lý danh mục thuốc/vật tư chuẩn, quy cách đóng gói, nồng độ/hàm lượng, định mức tồn tối thiểu và vị trí tủ thuốc.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canManageTransactions',
    shortLabel: 'Nhập - Xuất kho FEFO',
    label: '4. Lập phiếu Nhập kho - Xuất kho thuốc (Nguyên tắc FEFO)',
    description:
      'Nhập lô thuốc mới vào tủ y tế, xuất cấp phát thuốc theo nguyên tắc Hết hạn trước - Xuất trước (FEFO) và in phiếu nhập/xuất.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canManageInventoryCheck',
    shortLabel: 'Kiểm đếm & Lập biên bản',
    label: '5. Kiểm kê định kỳ tủ thuốc & Lập đề xuất hủy thuốc hết hạn',
    description:
      'Kiểm đếm số lượng thực tế trong tủ y tế, đối chiếu số liệu sổ sách và lập biên bản kiểm kê / đề xuất hủy thuốc hết hạn.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canViewReports',
    shortLabel: 'Báo cáo & In sổ A4',
    label: '6. Báo cáo thống kê y tế & In biểu mẫu sổ chuẩn A4',
    description:
      'Xem sổ nhập - xuất - tồn, truy xuất thuốc theo học sinh, báo cáo công tác y tế tháng/năm và in bộ sổ A4 chuẩn.',
    group: 'Chuyên môn Y tế & Dược học đường',
    adminDefault: true,
    medicDefault: true,
  },
  {
    key: 'canApproveAudits',
    shortLabel: 'Phê duyệt kiểm kê & Hủy thuốc',
    label: '7. Phê duyệt Biên bản kiểm kê, Chốt điều chỉnh kho & Quyết định hủy thuốc',
    description:
      'Thẩm quyền phê duyệt biên bản kiểm kê, chốt điều chỉnh số liệu chênh lệch tồn kho thực tế và duyệt quyết định tiêu hủy thuốc hết hạn.',
    group: 'Quản trị, Phê duyệt & Bảo mật hệ thống',
    adminDefault: true,
    medicDefault: false,
  },
  {
    key: 'canManageSettings',
    shortLabel: 'Quản trị hệ thống & Tài khoản',
    label: '8. Quản trị hệ thống, Quản lý tài khoản, Phân quyền & Sao lưu dữ liệu',
    description:
      'Tạo và khóa tài khoản thành viên, điều chỉnh phân quyền, xem nhật ký kiểm toán (Audit Log) và sao lưu / khôi phục dữ liệu.',
    group: 'Quản trị, Phê duyệt & Bảo mật hệ thống',
    adminDefault: true,
    medicDefault: false,
  },
];

const getDefaultPermsForRole = (role: UserRole): UserPermission => ({
  canManageMedicine: true,
  canManageTransactions: true,
  canManageClinicVisits: true,
  canManageStudents: true,
  canManageInventoryCheck: true,
  canViewReports: true,
  canApproveAudits: role === 'admin' || role === 'bgh',
  canManageSettings: role === 'admin' || role === 'bgh',
});

export const RoleManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>(() => db.getUsers());
  const [currentUser, setCurrentUser] = useState<UserType>(() => db.getCurrentUser());
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected user for granular permission editing
  const [selectedUserId, setSelectedUserId] = useState<string>(() => db.getCurrentUser()?.id || 'role-admin');

  // Create / Edit Member Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('medic');
  const [formPermissions, setFormPermissions] = useState<UserPermission>(() => getDefaultPermsForRole('medic'));
  const [formSetupMode, setFormSetupMode] = useState<'link' | 'temp_password'>('link');
  const [formTempPassword, setFormTempPassword] = useState('');

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<UserType | null>(null);
  const [resetMode, setResetMode] = useState<'link' | 'temp_password'>('link');
  const [resetTempPassword, setResetTempPassword] = useState('');

  // Generated One-Time Link / Handover Result Modal
  const [generatedLinkModal, setGeneratedLinkModal] = useState<{
    title: string;
    username: string;
    fullName: string;
    email: string;
    link: string;
    expiresAt: string;
    sentViaSmtp: boolean;
    hasTempPassword?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Confirm delete state
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserType | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const fetchUsersFromServer = async () => {
    try {
      const res = await fetch('/api/users', { headers: db.getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && Array.isArray(data.users)) {
        db.setUsersList(data.users);
        setUsers(data.users);
        setSmtpConfigured(Boolean(data.smtpConfigured));
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    fetchUsersFromServer();
    const unsubscribe = db.subscribe(() => {
      setUsers(db.getUsers());
      setCurrentUser(db.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  const selectedUser =
    users.find((u) => u.id === selectedUserId) || users[0] || currentUser;

  const generateRandomStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const nums = '23456789';
    let pass = 'Yte@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 3; i++) {
      pass += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return pass;
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormFullName('');
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormTitle('Nhân viên Y tế');
    setFormDepartment('Phòng Y tế Học đường');
    setFormRole('medic');
    setFormPermissions(getDefaultPermsForRole('medic'));
    setFormSetupMode('link');
    setFormTempPassword(generateRandomStrongPassword());
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (u: UserType) => {
    setEditingUser(u);
    setFormFullName(u.fullName || '');
    setFormUsername(u.username || '');
    setFormEmail(u.email || '');
    setFormPhone(u.phone || '');
    setFormTitle(u.title || '');
    setFormDepartment(u.department || '');
    setFormRole(u.role);
    setFormPermissions({
      ...getDefaultPermsForRole(u.role),
      ...(u.permissions || {}),
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${encodeURIComponent(editingUser.id)}`, {
          method: 'PUT',
          headers: db.getAuthHeaders(),
          body: JSON.stringify({
            fullName: formFullName,
            username: formUsername,
            email: formEmail,
            phone: formPhone,
            title: formTitle,
            department: formDepartment,
            role: formRole,
            permissions: formPermissions,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showError(data.error || 'Không thể cập nhật thông tin tài khoản.');
          return;
        }
        db.setUsersList(data.users);
        setUsers(data.users);
        setIsCreateModalOpen(false);
        db.logAudit(
          'Cập nhật tài khoản thành viên',
          `Cập nhật thông tin & phân quyền cho ${data.user.fullName} (${data.user.username})`
        );
        showSuccess(`Đã cập nhật tài khoản "${data.user.fullName}" thành công!`);
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: db.getAuthHeaders(),
          body: JSON.stringify({
            fullName: formFullName,
            username: formUsername,
            email: formEmail,
            phone: formPhone,
            title: formTitle,
            department: formDepartment,
            role: formRole,
            permissions: formPermissions,
            setupMode: formSetupMode,
            tempPassword: formSetupMode === 'temp_password' ? formTempPassword : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          showError(data.error || 'Không thể tạo tài khoản mới.');
          return;
        }
        db.setUsersList(data.users);
        setUsers(data.users);
        setSelectedUserId(data.user.id);
        setIsCreateModalOpen(false);
        db.logAudit(
          'Tạo tài khoản thành viên mới',
          `Tạo tài khoản: ${data.user.fullName} (${data.user.username}) - Vai trò: ${getRoleLabel(data.user.role)}`
        );

        setGeneratedLinkModal({
          title: 'Đã tạo tài khoản thành viên thành công',
          username: data.user.username,
          fullName: data.user.fullName,
          email: data.user.email,
          link: data.setupLink,
          expiresAt: data.expiresAt,
          sentViaSmtp: Boolean(data.sentViaSmtp),
          hasTempPassword: formSetupMode === 'temp_password',
        });
      }
    } catch {
      showError('Lỗi kết nối máy chủ khi lưu tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLockUser = async (target: UserType) => {
    setLoading(true);
    try {
      const isCurrentlyActive = target.status === 'active';
      const res = await fetch(`/api/users/${encodeURIComponent(target.id)}/toggle-lock`, {
        method: 'POST',
        headers: db.getAuthHeaders(),
        body: JSON.stringify({ lock: isCurrentlyActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || 'Không thể thay đổi trạng thái khóa tài khoản.');
        return;
      }
      db.setUsersList(data.users);
      setUsers(data.users);
      db.logAudit(
        isCurrentlyActive ? 'Khóa tài khoản thành viên' : 'Mở khóa tài khoản thành viên',
        `${isCurrentlyActive ? 'Khóa' : 'Mở khóa'} tài khoản ${target.fullName} (${target.username})`
      );
      showSuccess(
        `Đã ${isCurrentlyActive ? 'KHÓA' : 'MỞ KHÓA'} tài khoản "${target.fullName}" (${target.username}).`
      );
    } catch {
      showError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(resetTargetUser.id)}/reset-password`, {
        method: 'POST',
        headers: db.getAuthHeaders(),
        body: JSON.stringify({
          mode: resetMode,
          tempPassword: resetMode === 'temp_password' ? resetTempPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || 'Không thể đặt lại mật khẩu.');
        return;
      }
      db.setUsersList(data.users);
      setUsers(data.users);
      db.logAudit(
        'Hỗ trợ đặt lại mật khẩu',
        `Cấp lại mật khẩu / liên kết đặt lại cho tài khoản ${resetTargetUser.fullName} (${resetTargetUser.username})`
      );
      const target = resetTargetUser;
      setResetTargetUser(null);
      setGeneratedLinkModal({
        title: 'Đã tạo liên kết đặt lại mật khẩu (1 lần)',
        username: target.username,
        fullName: target.fullName,
        email: target.email || '',
        link: data.resetLink,
        expiresAt: data.expiresAt,
        sentViaSmtp: Boolean(data.sentViaSmtp),
        hasTempPassword: resetMode === 'temp_password',
      });
    } catch {
      showError('Lỗi kết nối máy chủ khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (target: UserType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers: db.getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || 'Không thể xóa tài khoản.');
        return;
      }
      db.setUsersList(data.users);
      setUsers(data.users);
      setConfirmDeleteUser(null);
      if (selectedUserId === target.id && data.users.length > 0) {
        setSelectedUserId(data.users[0].id);
      }
      db.logAudit('Xóa tài khoản thành viên', `Đã xóa tài khoản ${target.fullName} (${target.username})`);
      showSuccess(`Đã xóa tài khoản "${target.fullName}".`);
    } catch {
      showError('Lỗi kết nối máy chủ khi xóa tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserPermission = async (
    target: UserType,
    permKey: keyof UserPermission,
    label: string
  ) => {
    const basePerms = getDefaultPermsForRole(target.role);
    const currentPerms: UserPermission = {
      ...basePerms,
      ...(target.permissions || {}),
    };
    const nextVal = !currentPerms[permKey];
    const updatedPerms: UserPermission = {
      ...currentPerms,
      [permKey]: nextVal,
    };

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(target.id)}`, {
        method: 'PUT',
        headers: db.getAuthHeaders(),
        body: JSON.stringify({ permissions: updatedPerms }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || 'Không thể cập nhật quyền.');
        return;
      }
      db.setUsersList(data.users);
      setUsers(data.users);
      db.logAudit(
        'Cập nhật phân quyền thành viên',
        `${nextVal ? 'Cấp' : 'Thu hồi'} quyền "${label}" cho tài khoản ${target.fullName} (${target.username})`
      );
      showSuccess(
        `Đã ${nextVal ? 'CẤP' : 'THU HỒI'} quyền "${label}" đối với thành viên ${target.fullName}.`
      );
    } catch {
      showError('Lỗi kết nối máy chủ khi cập nhật phân quyền.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 rounded text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-100 rounded text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner: Member Account & Security Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  Quản Lý Tài Khoản Thành Viên & Phân Quyền Bảo Mật (RBAC)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Mã hóa Bcrypt • Xác thực Máy chủ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Mỗi thành viên có tài khoản riêng (Tên đăng nhập/Email & Mật khẩu băm Bcrypt). Quản trị viên có thể tạo tài khoản, phân quyền chi tiết, khóa/mở khóa và cấp liên kết đặt lại mật khẩu 1 lần.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchUsersFromServer}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tạo tài khoản thành viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* Member Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <span>Danh Sách Tài Khoản Thành Viên ({users.length} tài khoản)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mật khẩu của thành viên được băm một chiều (Bcrypt) và tuyệt đối không hiển thị cho Quản trị viên
            </p>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg font-semibold border ${
                smtpConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {smtpConfigured
                ? '✓ Đã kết nối SMTP gửi Email tự động'
                : 'Chế độ Liên kết trực tiếp (Chưa cấu hình biến môi trường SMTP)'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Thành viên / Chức vụ</th>
                <th className="py-3 px-4">Tên đăng nhập & Email</th>
                <th className="py-3 px-4">Vai trò & Quyền hạn</th>
                <th className="py-3 px-4">Trạng thái bảo mật</th>
                <th className="py-3 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => {
                const perms = {
                  ...getDefaultPermsForRole(u.role),
                  ...(u.permissions || {}),
                };
                const grantedCount = PERMISSION_CONFIG.filter((p) => !!perms[p.key]).length;
                const isLocked = u.status === 'inactive' || u.status === 'locked';
                const isSelected = selectedUser?.id === u.id;

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isLocked
                              ? 'bg-rose-100 text-rose-700'
                              : u.role === 'admin' || u.role === 'bgh'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.role === 'admin' || u.role === 'bgh' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <Stethoscope className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{u.fullName}</span>
                            {currentUser?.id === u.id && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                Bạn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {u.title || getRoleLabel(u.role)} • {u.department || 'Trường THCS Đông Thạnh'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-mono font-bold text-slate-800">{u.username}</p>
                        <p className="text-[11px] text-slate-500">{u.email || 'Chưa cập nhật email'}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                            u.role === 'admin' || u.role === 'bgh'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {getRoleLabel(u.role)} ({grantedCount}/8 quyền)
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(u.id)}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {isSelected ? 'Đang xem bảng quyền bên dưới' : 'Cấu hình quyền chi tiết →'}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        {u.status === 'inactive' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Lock className="w-3 h-3" /> Đã khóa bởi Quản trị
                          </span>
                        ) : u.status === 'locked' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldAlert className="w-3 h-3" /> Tạm khóa (Nhập sai MK)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                          </span>
                        )}

                        {u.mustChangePassword && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Bắt buộc đổi MK ở lần đăng nhập đầu
                          </span>
                        )}
                        {u.hasActiveSetupLink && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Có liên kết đặt MK đang hiệu lực
                          </span>
                        )}
                        {u.pendingResetRequestAt && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ⚡ Thành viên yêu cầu đặt lại mật khẩu
                          </span>
                        )}
                        {u.lastLoginAt && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Đăng nhập:{' '}
                            {new Date(u.lastLoginAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                          title="Chỉnh sửa thông tin & phân quyền"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa & Quyền</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetTargetUser(u);
                            setResetMode('link');
                            setResetTempPassword(generateRandomStrongPassword());
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 cursor-pointer"
                          title="Cấp liên kết đặt lại mật khẩu 1 lần hoặc đặt mật khẩu tạm thời"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Đặt lại MK</span>
                        </button>

                        <button
                          type="button"
                          disabled={currentUser?.id === u.id}
                          onClick={() => handleToggleLockUser(u)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer disabled:opacity-40 ${
                            isLocked
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                          title={isLocked ? 'Mở khóa tài khoản này' : 'Khóa tài khoản & thu hồi phiên đăng nhập'}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Mở khóa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Khóa</span>
                            </>
                          )}
                        </button>

                        {currentUser?.id !== u.id && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(u)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Xóa tài khoản thành viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Granular Permission Matrix for Selected Member */}
      {selectedUser && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>
                  Ma Trận Phân Quyền Chi Tiết Cho Thành Viên:{' '}
                  <span className="text-indigo-700">{selectedUser.fullName}</span> (
                  <code className="font-mono">{selectedUser.username}</code>)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thay đổi quyền sẽ có hiệu lực ngay lập tức ở cả giao diện và kiểm tra quyền phía Máy chủ (Server-side RBAC)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Chọn thành viên:</label>
              <select
                value={selectedUser.id}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.username} - {getRoleLabel(u.role)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-8/12">Chức năng / Quyền hạn nghiệp vụ</th>
                  <th className="py-3 px-4 text-center w-4/12 border-l border-slate-200">
                    Trạng thái cấp quyền ({selectedUser.username})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {PERMISSION_CONFIG.map((perm) => {
                  const userPerms = {
                    ...getDefaultPermsForRole(selectedUser.role),
                    ...(selectedUser.permissions || {}),
                  };
                  const isEnabled = !!userPerms[perm.key];
                  const isExclusiveAdmin =
                    perm.group === 'Quản trị, Phê duyệt & Bảo mật hệ thống';

                  return (
                    <tr key={perm.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{perm.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isExclusiveAdmin
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {perm.group}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{perm.description}</p>
                      </td>
                      <td className="py-3 px-4 text-center border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleUserPermission(selectedUser, perm.key, perm.shortLabel)
                          }
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isEnabled
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {isEnabled ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Được phép (Bấm để thu hồi)</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Không có quyền (Bấm để cấp)</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE OR EDIT MEMBER ACCOUNT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {editingUser
                    ? `Cập Nhật Tài Khoản: ${editingUser.fullName}`
                    : 'Tạo Tài Khoản Thành Viên Mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập thông tin đăng nhập, vai trò và quyền hạn chi tiết cho thành viên
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Họ và tên thành viên <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="VD: Nguyễn Thị Minh Anh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                    placeholder="VD: yte_minhanh"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="VD: minhanh@thcsdongthanh.edu.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 0909123456"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức vụ</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="VD: Cán bộ Y tế học đường"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vai trò nhóm quyền</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormRole(nextRole);
                      setFormPermissions(getDefaultPermsForRole(nextRole));
                    }}
                    className="w-full px-3 py-2 font-bold border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="medic">Nhân viên Y tế (Mặc định 6/8 quyền chuyên môn)</option>
                    <option value="bgh">Ban Giám Hiệu (Mặc định 8/8 quyền phê duyệt)</option>
                    <option value="admin">Quản trị viên hệ thống (Toàn quyền 8/8)</option>
                  </select>
                </div>
              </div>

              {/* Password Provisioning Method (Only on Create) */}
              {!editingUser && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="font-bold text-slate-900">
                    Phương thức khởi tạo mật khẩu bảo mật cho thành viên:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                        formSetupMode === 'link'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="setupMode"
                        checked={formSetupMode === 'link'}
                        onChange={() => setFormSetupMode('link')}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block">1. Gửi liên kết tự thiết lập mật khẩu</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          Tạo liên kết bảo mật dùng 1 lần (hiệu lực 24h) để thành viên tự đặt mật khẩu riêng.
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 ${
                        formSetupMode === 'temp_password'
                          ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="setupMode"
                        checked={formSetupMode === 'temp_password'}
                        onChange={() => setFormSetupMode('temp_password')}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block">2. Cấp mật khẩu tạm thời</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          Bắt buộc thành viên phải đổi mật khẩu ngay ở lần đăng nhập đầu tiên.
                        </span>
                      </div>
                    </label>
                  </div>

                  {formSetupMode === 'temp_password' && (
                    <div className="pt-1">
                      <label className="block font-bold text-slate-700 mb-1">
                        Nhập mật khẩu tạm thời ban đầu (Chỉ hiển thị lúc tạo, sẽ băm Bcrypt ngay khi lưu):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formTempPassword}
                          onChange={(e) => setFormTempPassword(e.target.value)}
                          className="flex-1 px-3 py-2 font-mono font-bold border border-slate-300 rounded-xl bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFormTempPassword(generateRandomStrongPassword())}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
                        >
                          Tạo ngẫu nhiên
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2">
                <p className="font-bold text-slate-900">Phân quyền chi tiết cho tài khoản này:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSION_CONFIG.map((perm) => {
                    const checked = !!formPermissions[perm.key];
                    return (
                      <label
                        key={perm.key}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer ${
                          checked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFormPermissions((prev) => ({
                              ...prev,
                              [perm.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span className="font-semibold leading-snug">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading
                    ? 'Đang lưu...'
                    : editingUser
                    ? 'Lưu cập nhật tài khoản'
                    : 'Tạo tài khoản & Cấp liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN RESET PASSWORD FOR MEMBER */}
      {resetTargetUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Hỗ Trợ Đặt Lại Mật Khẩu
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Thành viên: <strong>{resetTargetUser.fullName}</strong> (
                  <code className="font-mono">{resetTargetUser.username}</code>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer ${
                    resetMode === 'link'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    checked={resetMode === 'link'}
                    onChange={() => setResetMode('link')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="block">1. Cấp liên kết đặt lại mật khẩu 1 lần (Hiệu lực 30 phút)</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Thành viên tự nhập mật khẩu mới qua liên kết bảo mật, Quản trị viên không biết mật khẩu.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer ${
                    resetMode === 'temp_password'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    checked={resetMode === 'temp_password'}
                    onChange={() => setResetMode('temp_password')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="block">2. Đặt mật khẩu tạm thời (Bắt buộc đổi ngay khi đăng nhập)</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Sau khi đăng nhập bằng mật khẩu tạm, hệ thống bắt buộc thành viên đổi sang mật khẩu riêng.
                    </span>
                  </div>
                </label>
              </div>

              {resetMode === 'temp_password' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu tạm thời (Chỉ hiển thị 1 lần lúc tạo, lưu dưới dạng băm Bcrypt):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resetTempPassword}
                      onChange={(e) => setResetTempPassword(e.target.value)}
                      className="flex-1 px-3 py-2 font-mono font-bold border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setResetTempPassword(generateRandomStrongPassword())}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl cursor-pointer"
                    >
                      Đổi mã khác
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ONE-TIME SETUP / RESET LINK RESULT */}
      {generatedLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">{generatedLinkModal.title}</h3>
                  <p className="text-slate-500">
                    Thành viên: <strong>{generatedLinkModal.fullName}</strong> (
                    <code className="font-mono font-bold">{generatedLinkModal.username}</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedLinkModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedLinkModal.sentViaSmtp ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Hệ thống đã gửi Email tự động kèm liên kết thiết lập mật khẩu tới{' '}
                  <strong>{generatedLinkModal.email}</strong>.
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                <p className="font-bold">Hướng dẫn gửi liên kết cho thành viên:</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Sao chép liên kết bảo mật một lần bên dưới và gửi cho thành viên để tự thiết lập mật khẩu (Liên kết hết hạn vào{' '}
                  <strong>{new Date(generatedLinkModal.expiresAt).toLocaleString('vi-VN')}</strong> và chỉ dùng được 01 lần).
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                Liên kết thiết lập / đặt lại mật khẩu (Chỉ dùng 1 lần):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLinkModal.link}
                  className="flex-1 px-3 py-2 font-mono text-[11px] bg-slate-50 border border-slate-300 rounded-xl text-indigo-950 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLinkModal.link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGeneratedLinkModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
              >
                Đã hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DELETE MEMBER */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-base">Xác nhận xóa tài khoản thành viên?</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của{' '}
              <strong>{confirmDeleteUser.fullName}</strong> (
              <code className="font-mono font-bold">{confirmDeleteUser.username}</code>)? Toàn bộ phiên đăng nhập của tài khoản này sẽ bị thu hồi ngay lập tức.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                className="px-4 py-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
