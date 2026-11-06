import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Laptop,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  UserCheck,
  Info,
} from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';
import { db } from '../services/db';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

type AuthScreenMode = 'login' | 'forgot_password' | 'reset_token' | 'force_change_password';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthScreenMode>('login');
  const [loading, setLoading] = useState(false);
  const [syncingServer, setSyncingServer] = useState(true);
  const [serverStats, setServerStats] = useState<{
    students: number;
    clinicVisits: number;
    medicines: number;
  }>({
    students: db.getStudents().length,
    clinicVisits: db.getClinicVisits().length,
    medicines: db.getMedicines().length,
  });

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDefaultAccountsHint, setShowDefaultAccountsHint] = useState(false);

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [previewResetLink, setPreviewResetLink] = useState<string | null>(null);
  const [copiedResetLink, setCopiedResetLink] = useState(false);

  // Token setup / reset state (?setupToken=... or ?resetToken=...)
  const [urlToken, setUrlToken] = useState<string>('');
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [tokenValidInfo, setTokenValidInfo] = useState<{
    valid: boolean;
    tokenType?: 'setup' | 'reset';
    username?: string;
    fullName?: string;
    email?: string;
    expiresAt?: string;
    error?: string;
  } | null>(null);

  // New password state (used by both reset_token and force_change_password)
  const [currentTempPassword, setCurrentTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Detect ?setupToken= or ?resetToken= in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('setupToken') || params.get('resetToken');
      if (token) {
        setUrlToken(token);
        setMode('reset_token');
        verifyTokenFromServer(token);
      }
    }
  }, []);

  const verifyTokenFromServer = async (token: string) => {
    setTokenVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/verify-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setTokenValidInfo({
          valid: true,
          tokenType: data.tokenType,
          username: data.username,
          fullName: data.fullName,
          email: data.email,
          expiresAt: data.expiresAt,
        });
      } else {
        setTokenValidInfo({
          valid: false,
          error: data.error || 'Liên kết không hợp lệ hoặc đã hết hạn.',
        });
      }
    } catch {
      setTokenValidInfo({
        valid: false,
        error: 'Không thể kết nối máy chủ để kiểm tra liên kết.',
      });
    } finally {
      setTokenVerifying(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const unsub = db.subscribe(() => {
      if (!mounted) return;
      setServerStats({
        students: db.getStudents().length,
        clinicVisits: db.getClinicVisits().length,
        medicines: db.getMedicines().length,
      });
    });

    db.pullFromServerAndMerge(false).finally(() => {
      if (!mounted) return;
      setSyncingServer(false);
      setServerStats({
        students: db.getStudents().length,
        clinicVisits: db.getClinicVisits().length,
        medicines: db.getMedicines().length,
      });
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const completeSessionLogin = (user: User, token?: string) => {
    if (token) {
      db.setAuthToken(token);
    }
    db.setCurrentUser(user);
    db.bindUser(user.id, user);
    localStorage.setItem('school_health_auth_session', 'true');
    localStorage.setItem('school_health_user_cache', JSON.stringify(user));
    onLoginSuccess(user);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setError('Vui lòng nhập đầy đủ Tên đăng nhập (hoặc Email) và Mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Tên đăng nhập/Email hoặc mật khẩu không chính xác.');
        return;
      }

      if (data.token) {
        db.setAuthToken(data.token);
      }

      // Check if user must change temporary password on first login
      if (data.mustChangePassword || data.user?.mustChangePassword) {
        setPendingUser(data.user);
        setCurrentTempPassword(password);
        setNewPassword('');
        setConfirmPassword('');
        setMode('force_change_password');
        return;
      }

      await db.pullFromServerAndMerge(false);
      completeSessionLogin(data.user, data.token);
    } catch {
      setError('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleForceChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Mật khẩu mới phải bao gồm cả chữ cái và chữ số.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword === currentTempPassword) {
      setError('Mật khẩu mới phải khác mật khẩu tạm thời ban đầu.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: db.getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: currentTempPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
        return;
      }

      await db.pullFromServerAndMerge(false);
      completeSessionLogin(data.user || pendingUser!);
    } catch {
      setError('Lỗi kết nối máy chủ khi cập nhật mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = forgotIdentifier.trim();
    if (!cleanId) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email của bạn.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setPreviewResetLink(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
        return;
      }

      setSuccessMsg(
        data.message ||
          'Nếu thông tin tài khoản hợp lệ, hệ thống đã tạo liên kết đặt lại mật khẩu (hiệu lực 30 phút, chỉ dùng 1 lần).'
      );
      if (data.previewResetLink) {
        setPreviewResetLink(data.previewResetLink);
      }
    } catch {
      setError('Lỗi kết nối máy chủ khi gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Mật khẩu phải bao gồm cả chữ cái và chữ số.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/complete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: urlToken,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Không thể đặt lại mật khẩu.');
        return;
      }

      // Clean token query parameter from URL so refreshing won't re-trigger token screen
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await db.pullFromServerAndMerge(false);
      completeSessionLogin(data.user, data.token);
    } catch {
      setError('Lỗi kết nối máy chủ khi thiết lập mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await loginWithGoogle();
      if (userData?.email) {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            fullName: userData.fullName,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || 'Không thể đăng nhập bằng tài khoản Google này.');
          return;
        }
        await db.pullFromServerAndMerge(false);
        completeSessionLogin(data.user, data.token);
      }
    } catch (err: any) {
      const isUserClosedPopup =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        (typeof err?.message === 'string' && err.message.includes('popup-closed-by-user'));

      if (!isUserClosedPopup) {
        setError(
          'Trình duyệt chặn cửa sổ bật lên (Popup) của Google hoặc miền chưa được cấp phép. Vui lòng đăng nhập bằng Tên đăng nhập / Email và Mật khẩu ở trên.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-slate-100">
        {/* School Branding Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2.5 mb-5">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner ring-4 ring-emerald-50">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 mb-1">
              TRƯỜNG THCS ĐÔNG THẠNH
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Sổ Quản Lý Y Tế Học Đường
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống xác thực bảo mật • Phân quyền RBAC • Quản lý kho dược FEFO
            </p>
          </div>
        </div>

        {/* Live Server Status Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <Laptop className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Đã kết nối Máy chủ Y tế Trường học</p>
              <p className="text-[11px] text-emerald-700">
                Đồng bộ: <strong>{serverStats.clinicVisits}</strong> ca khám •{' '}
                <strong>{serverStats.medicines}</strong> thuốc •{' '}
                <strong>{serverStats.students}</strong> học sinh
              </p>
            </div>
          </div>
          {syncingServer ? (
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 text-rose-900 rounded-xl flex items-start gap-2.5 border border-rose-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-900 rounded-xl flex items-start gap-2.5 border border-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="font-semibold leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* MODE 1: STANDARD LOGIN */}
        {mode === 'login' && (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đăng nhập hoặc Email thành viên
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nhập tên đăng nhập hoặc email (vd: quantri, nhanvien_yte)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setPreviewResetLink(null);
                      setForgotIdentifier(identifier);
                      setMode('forgot_password');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">Hoặc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoginGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs disabled:opacity-50 text-xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Đăng nhập bằng Google (Email đã cấp quyền)</span>
            </button>

            {/* Collapsible Initial Accounts Helper for School Staff */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDefaultAccountsHint(!showDefaultAccountsHint)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tài khoản mặc định ban đầu (Điền nhanh để kiểm thử)</span>
                </span>
                <span className="text-indigo-600">{showDefaultAccountsHint ? 'Ẩn' : 'Xem'}</span>
              </button>

              {showDefaultAccountsHint && (
                <div className="mt-2.5 space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('quantri');
                      setPassword('Admin@123');
                      setError(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
                      <div>
                        <p className="font-bold text-indigo-950 text-xs">Quản trị viên (8/8 quyền)</p>
                        <p className="text-[11px] text-indigo-800">
                          TK: <code className="font-mono font-bold">quantri</code> • MK khởi tạo:{' '}
                          <code className="font-mono font-bold">Admin@123</code>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-lg">
                      Điền nhanh
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIdentifier('nhanvien_yte');
                      setPassword('Yte@12345');
                      setError(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Stethoscope className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-950 text-xs">Nhân viên Y tế (6/8 quyền)</p>
                        <p className="text-[11px] text-emerald-800">
                          TK: <code className="font-mono font-bold">nhanvien_yte</code> • MK khởi tạo:{' '}
                          <code className="font-mono font-bold">Yte@12345</code>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-1 rounded-lg">
                      Điền nhanh
                    </span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* MODE 2: FORGOT PASSWORD */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Khôi phục / Đặt lại mật khẩu</span>
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Nhập tên đăng nhập hoặc email của bạn. Hệ thống sẽ tạo liên kết đặt lại mật khẩu có thời hạn 30 phút và chỉ sử dụng được 01 lần duy nhất.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đăng nhập hoặc Email của bạn
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="Nhập tên đăng nhập hoặc email..."
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Đang xử lý...' : 'Gửi liên kết đặt lại mật khẩu'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {previewResetLink && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 text-xs">
                <p className="font-bold text-amber-950">
                  Liên kết đặt lại mật khẩu 1 lần (Hiệu lực 30 phút):
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Máy chủ hiện chưa cấu hình SMTP gửi mail tự động nên hiển thị trực tiếp liên kết bảo mật một lần dưới đây (hoặc Quản trị viên có thể lấy liên kết này trong mục Quản lý Tài khoản):
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={previewResetLink}
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white border border-amber-300 rounded-lg text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(previewResetLink);
                      setCopiedResetLink(true);
                      setTimeout(() => setCopiedResetLink(false), 2500);
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedResetLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedResetLink ? 'Đã chép' : 'Chép'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = new URL(previewResetLink);
                    const token = url.searchParams.get('resetToken') || url.searchParams.get('setupToken') || '';
                    if (token) {
                      setUrlToken(token);
                      setMode('reset_token');
                      verifyTokenFromServer(token);
                    }
                  }}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở liên kết đặt lại mật khẩu ngay</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setMode('login');
              }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại màn hình đăng nhập</span>
            </button>
          </div>
        )}

        {/* MODE 3: RESET / SETUP PASSWORD VIA ONE-TIME TOKEN LINK */}
        {mode === 'reset_token' && (
          <div className="space-y-4">
            {tokenVerifying ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Đang kiểm tra tính hợp lệ của liên kết bảo mật...
                </p>
              </div>
            ) : !tokenValidInfo?.valid ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Liên kết không khả dụng</span>
                  </p>
                  <p className="leading-relaxed">
                    {tokenValidInfo?.error ||
                      'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng trước đó.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setError(null);
                    setMode('forgot_password');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Yêu cầu cấp liên kết mới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setError(null);
                    setMode('login');
                  }}
                  className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCompleteResetSubmit} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-1">
                  <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>
                      {tokenValidInfo.tokenType === 'setup'
                        ? 'Thiết lập mật khẩu kích hoạt tài khoản'
                        : 'Đặt lại mật khẩu mới'}
                    </span>
                  </p>
                  <p className="text-[11px] text-indigo-900">
                    Thành viên: <strong>{tokenValidInfo.fullName}</strong> (
                    <code className="font-mono font-bold">{tokenValidInfo.username}</code>)
                  </p>
                  {tokenValidInfo.expiresAt && (
                    <p className="text-[10px] text-indigo-700">
                      Hiệu lực 1 lần đến: {new Date(tokenValidInfo.expiresAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu mới (Tối thiểu 8 ký tự, gồm chữ và số)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhập lại mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Xác nhận mật khẩu mới..."
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {loading ? 'Đang lưu mật khẩu...' : 'Xác nhận lưu mật khẩu & Đăng nhập'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE 4: MANDATORY FIRST-LOGIN PASSWORD CHANGE */}
        {mode === 'force_change_password' && (
          <form onSubmit={handleForceChangePasswordSubmit} className="space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Xin chào <strong>{pendingUser?.fullName}</strong>! Bạn đang sử dụng mật khẩu tạm thời do Quản trị viên cấp. Vui lòng thiết lập mật khẩu cá nhân mới trước khi làm việc.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu cá nhân mới (Ít nhất 8 ký tự, gồm chữ và số)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Đang cập nhật...' : 'Đổi mật khẩu & Vào hệ thống'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
