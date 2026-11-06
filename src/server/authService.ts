import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import type { Request, Response, NextFunction } from 'express';
import type { User, UserRole, UserPermission } from '../types.ts';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const IP_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_IP_FAILED_ATTEMPTS = 12;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SETUP_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_LINK_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Precomputed bcrypt hash for constant-time comparison when user does not exist
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('DummyConstantTimeGuard#2026!', BCRYPT_ROUNDS);

export interface ServerAuthAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  title: string;
  department: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'locked';
  permissions: UserPermission;
  passwordHash: string | null;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt?: string;
  pendingResetRequestAt?: string | null;
  resetTokenHash?: string | null;
  resetTokenType?: 'setup' | 'reset' | null;
  resetTokenExpiresAt?: string | null;
  resetTokenUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerSession {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  ip: string;
  userAgent: string;
}

export interface OutboxMailItem {
  id: string;
  to: string;
  username: string;
  fullName: string;
  subject: string;
  type: 'setup' | 'reset';
  link: string;
  expiresAt: string;
  sentViaSmtp: boolean;
  createdAt: string;
}

export const DEFAULT_ADMIN_PERMS: UserPermission = {
  canManageMedicine: true,
  canManageTransactions: true,
  canManageClinicVisits: true,
  canManageStudents: true,
  canManageInventoryCheck: true,
  canViewReports: true,
  canManageSettings: true,
  canApproveAudits: true,
};

export const DEFAULT_MEDIC_PERMS: UserPermission = {
  canManageMedicine: true,
  canManageTransactions: true,
  canManageClinicVisits: true,
  canManageStudents: true,
  canManageInventoryCheck: true,
  canViewReports: true,
  canManageSettings: false,
  canApproveAudits: false,
};

const ipRateLimitMap = new Map<string, { count: number; firstAttemptAt: number; lockedUntil: number }>();

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || typeof password !== 'string') {
    return 'Vui lòng nhập mật khẩu.';
  }
  if (password.length < 8) {
    return 'Mật khẩu phải có ít nhất 8 ký tự.';
  }
  if (password.length > 128) {
    return 'Mật khẩu không được vượt quá 128 ký tự.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Mật khẩu phải bao gồm cả chữ cái và chữ số để đảm bảo an toàn.';
  }
  return null;
}

export function sanitizeUserForClient(acc: ServerAuthAccount): User {
  const now = Date.now();
  const isTempLocked =
    acc.lockedUntil && new Date(acc.lockedUntil).getTime() > now;
  const effectiveStatus: 'active' | 'inactive' | 'locked' =
    acc.status === 'inactive'
      ? 'inactive'
      : isTempLocked || acc.status === 'locked'
      ? 'locked'
      : 'active';

  const hasActiveSetupLink = Boolean(
    acc.resetTokenHash &&
      !acc.resetTokenUsedAt &&
      acc.resetTokenExpiresAt &&
      new Date(acc.resetTokenExpiresAt).getTime() > now
  );

  return {
    id: acc.id,
    username: acc.username,
    fullName: acc.fullName,
    email: acc.email,
    phone: acc.phone || '',
    title: acc.title || '',
    department: acc.department || '',
    role: acc.role,
    status: effectiveStatus,
    permissions: {
      ...(acc.role === 'admin' || acc.role === 'bgh' ? DEFAULT_ADMIN_PERMS : DEFAULT_MEDIC_PERMS),
      ...(acc.permissions || {}),
    },
    mustChangePassword: Boolean(acc.mustChangePassword),
    hasPasswordSet: Boolean(acc.passwordHash),
    lastLoginAt: acc.lastLoginAt,
    failedLoginAttempts: acc.failedLoginAttempts || 0,
    lockedUntil: isTempLocked ? acc.lockedUntil : null,
    pendingResetRequestAt: acc.pendingResetRequestAt || null,
    hasActiveSetupLink,
    setupLinkExpiresAt: hasActiveSetupLink ? acc.resetTokenExpiresAt : null,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  };
}

export class ServerAuthStore {
  private dataDir: string;
  private accountsFile: string;
  private sessionsFile: string;
  private outboxFile: string;
  private accounts: ServerAuthAccount[] = [];
  private sessions: Map<string, ServerSession> = new Map();
  private outbox: OutboxMailItem[] = [];

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.accountsFile = path.join(dataDir, 'auth_accounts.json');
    this.sessionsFile = path.join(dataDir, 'auth_sessions.json');
    this.outboxFile = path.join(dataDir, 'auth_outbox.json');
    this.load();
  }

  private ensureDir() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  private load() {
    this.ensureDir();
    try {
      if (fs.existsSync(this.accountsFile)) {
        const raw = fs.readFileSync(this.accountsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.accounts = parsed;
        }
      }
    } catch (err) {
      console.warn('Could not load auth_accounts.json:', err);
    }

    if (this.accounts.length === 0) {
      this.seedDefaultAccounts();
    } else {
      this.ensureAdminAccountExists();
    }

    try {
      if (fs.existsSync(this.sessionsFile)) {
        const raw = fs.readFileSync(this.sessionsFile, 'utf-8');
        const parsed: ServerSession[] = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            if (s && s.tokenHash && new Date(s.expiresAt).getTime() > now) {
              this.sessions.set(s.tokenHash, s);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      if (fs.existsSync(this.outboxFile)) {
        const raw = fs.readFileSync(this.outboxFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.outbox = parsed.slice(0, 100);
        }
      }
    } catch {
      // ignore
    }
  }

  private seedDefaultAccounts() {
    const nowIso = new Date().toISOString();
    this.accounts = [
      {
        id: 'role-admin',
        username: 'quantri',
        fullName: 'Đoàn Thị Minh Trang (Quản trị viên)',
        email: 'minhtrangdongthanh@gmail.com',
        phone: '0909123456',
        title: 'Quản trị hệ thống & Phụ trách Y tế',
        department: 'Ban Quản trị & Phòng Y tế',
        role: 'admin',
        status: 'active',
        permissions: { ...DEFAULT_ADMIN_PERMS },
        passwordHash: bcrypt.hashSync('Admin@123', BCRYPT_ROUNDS),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: nowIso,
      },
      {
        id: 'usr-bgh',
        username: 'bgh',
        fullName: 'Ban Giám Hiệu Trường THCS Đông Thạnh',
        email: 'bgh@thcsdongthanh.edu.vn',
        phone: '',
        title: 'Hiệu trưởng / Phó Hiệu trưởng',
        department: 'Ban Giám Hiệu',
        role: 'bgh',
        status: 'active',
        permissions: { ...DEFAULT_ADMIN_PERMS },
        passwordHash: bcrypt.hashSync('Bgh@12345', BCRYPT_ROUNDS),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: nowIso,
      },
      {
        id: 'role-medic',
        username: 'nhanvien_yte',
        fullName: 'Cán bộ Y tế Học đường',
        email: 'yte@thcsdongthanh.edu.vn',
        phone: '',
        title: 'Nhân viên Y tế chuyên trách',
        department: 'Phòng Y tế Học đường',
        role: 'medic',
        status: 'active',
        permissions: { ...DEFAULT_MEDIC_PERMS },
        passwordHash: bcrypt.hashSync('Yte@12345', BCRYPT_ROUNDS),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: nowIso,
      },
    ];
    this.saveAccounts();
  }

  private ensureAdminAccountExists() {
    let changed = false;
    const hasActiveAdmin = this.accounts.some(
      (a) => (a.role === 'admin' || a.role === 'bgh') && a.status === 'active'
    );
    if (!hasActiveAdmin && this.accounts.length > 0) {
      this.accounts[0].role = 'admin';
      this.accounts[0].status = 'active';
      this.accounts[0].permissions = { ...DEFAULT_ADMIN_PERMS };
      changed = true;
    }
    for (const acc of this.accounts) {
      if (!acc.passwordHash && (acc.id === 'role-admin' || acc.username === 'quantri')) {
        acc.passwordHash = bcrypt.hashSync('Admin@123', BCRYPT_ROUNDS);
        changed = true;
      } else if (!acc.passwordHash && (acc.id === 'role-medic' || acc.username === 'nhanvien_yte')) {
        acc.passwordHash = bcrypt.hashSync('Yte@12345', BCRYPT_ROUNDS);
        changed = true;
      }
    }
    if (changed) {
      this.saveAccounts();
    }
  }

  public saveAccounts() {
    this.ensureDir();
    try {
      const tmp = `${this.accountsFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.accounts, null, 2), 'utf-8');
      fs.renameSync(tmp, this.accountsFile);
    } catch (err) {
      console.warn('Failed to save auth_accounts.json:', err);
    }
  }

  public saveSessions() {
    this.ensureDir();
    try {
      const now = Date.now();
      const valid = Array.from(this.sessions.values()).filter(
        (s) => new Date(s.expiresAt).getTime() > now
      );
      const tmp = `${this.sessionsFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(valid, null, 2), 'utf-8');
      fs.renameSync(tmp, this.sessionsFile);
    } catch {
      // ignore
    }
  }

  public saveOutbox() {
    this.ensureDir();
    try {
      const tmp = `${this.outboxFile}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.outbox.slice(0, 100), null, 2), 'utf-8');
      fs.renameSync(tmp, this.outboxFile);
    } catch {
      // ignore
    }
  }

  public getSanitizedUsers(): User[] {
    return this.accounts.map((a) => sanitizeUserForClient(a));
  }

  public getAccountById(id: string): ServerAuthAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  public findAccountByIdentifier(identifier: string): ServerAuthAccount | undefined {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return undefined;
    // Support primary admin aliases
    if (clean === 'doanthiminhtrang3990@gmail.com' || clean === 'admin') {
      const direct = this.accounts.find(
        (a) => a.username.toLowerCase() === clean || a.email.toLowerCase() === clean
      );
      if (direct) return direct;
      return this.accounts.find((a) => a.id === 'role-admin' || a.role === 'admin');
    }
    return this.accounts.find(
      (a) =>
        a.username.toLowerCase() === clean ||
        (a.email && a.email.toLowerCase() === clean)
    );
  }

  public isSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  public async sendAuthLinkEmail(params: {
    to: string;
    username: string;
    fullName: string;
    type: 'setup' | 'reset';
    link: string;
    expiresAt: string;
  }): Promise<{ sentViaSmtp: boolean; outboxItem: OutboxMailItem }> {
    const subject =
      params.type === 'setup'
        ? '[Y tế THCS Đông Thạnh] Thiết lập mật khẩu tài khoản thành viên'
        : '[Y tế THCS Đông Thạnh] Liên kết đặt lại mật khẩu (Hiệu lực 1 lần)';

    let sentViaSmtp = false;
    if (this.isSmtpConfigured() && params.to && params.to.includes('@')) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Y tế Trường THCS Đông Thạnh" <${process.env.SMTP_USER}>`,
          to: params.to,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a;">Hệ thống Quản lý Y tế Trường THCS Đông Thạnh</h2>
              <p>Xin chào <strong>${params.fullName}</strong> (Tài khoản: <code>${params.username}</code>),</p>
              <p>${
                params.type === 'setup'
                  ? 'Quản trị viên đã khởi tạo tài khoản thành viên cho bạn trên Hệ thống Quản lý Thuốc & Y tế Học đường.'
                  : 'Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.'
              }</p>
              <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu mới (Liên kết chỉ sử dụng được <strong>01 lần duy nhất</strong> và có thời hạn đến <strong>${new Date(
                params.expiresAt
              ).toLocaleString('vi-VN')}</strong>):</p>
              <p style="margin: 24px 0;">
                <a href="${params.link}" style="background: #059669; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  ${params.type === 'setup' ? 'Thiết lập mật khẩu ngay' : 'Đặt lại mật khẩu mới'}
                </a>
              </p>
              <p style="font-size: 12px; color: #64748b;">Hoặc sao chép đường dẫn: <br/>${params.link}</p>
            </div>
          `,
        });
        sentViaSmtp = true;
      } catch (err) {
        console.warn('SMTP send warning:', err);
      }
    }

    const outboxItem: OutboxMailItem = {
      id: 'mail-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      to: params.to,
      username: params.username,
      fullName: params.fullName,
      subject,
      type: params.type,
      link: params.link,
      expiresAt: params.expiresAt,
      sentViaSmtp,
      createdAt: new Date().toISOString(),
    };
    this.outbox.unshift(outboxItem);
    this.saveOutbox();
    return { sentViaSmtp, outboxItem };
  }

  public getOutbox(): OutboxMailItem[] {
    return this.outbox;
  }

  public createSession(userId: string, req: Request): string {
    const rawToken = generateSecureToken(32);
    const tokenHash = sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 250);

    this.sessions.set(tokenHash, {
      tokenHash,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActiveAt: now.toISOString(),
      ip,
      userAgent,
    });
    this.saveSessions();
    return rawToken;
  }

  public revokeSessionToken(rawToken: string) {
    if (!rawToken) return;
    const tokenHash = sha256(rawToken);
    if (this.sessions.delete(tokenHash)) {
      this.saveSessions();
    }
  }

  public revokeAllUserSessions(userId: string, keepRawToken?: string) {
    const keepHash = keepRawToken ? sha256(keepRawToken) : null;
    let removed = false;
    for (const [hash, session] of this.sessions.entries()) {
      if (session.userId === userId && hash !== keepHash) {
        this.sessions.delete(hash);
        removed = true;
      }
    }
    if (removed) {
      this.saveSessions();
    }
  }

  public extractRawTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)thcs_dt_session=([^;]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }

  public getAuthenticatedAccount(req: Request): ServerAuthAccount | null {
    const rawToken = this.extractRawTokenFromRequest(req);
    if (!rawToken) return null;
    const tokenHash = sha256(rawToken);
    const session = this.sessions.get(tokenHash);
    if (!session) return null;

    const now = Date.now();
    if (new Date(session.expiresAt).getTime() <= now) {
      this.sessions.delete(tokenHash);
      this.saveSessions();
      return null;
    }

    const account = this.getAccountById(session.userId);
    if (!account) {
      this.sessions.delete(tokenHash);
      return null;
    }

    if (account.status === 'inactive') {
      this.sessions.delete(tokenHash);
      return null;
    }

    if (account.lockedUntil && new Date(account.lockedUntil).getTime() > now) {
      return null;
    }

    session.lastActiveAt = new Date(now).toISOString();
    return account;
  }

  public checkIpRateLimit(ip: string): { allowed: boolean; retryAfterMinutes?: number } {
    const now = Date.now();
    const record = ipRateLimitMap.get(ip);
    if (!record) return { allowed: true };

    if (record.lockedUntil > now) {
      const mins = Math.max(1, Math.ceil((record.lockedUntil - now) / 60000));
      return { allowed: false, retryAfterMinutes: mins };
    }

    if (now - record.firstAttemptAt > IP_RATE_WINDOW_MS) {
      ipRateLimitMap.delete(ip);
      return { allowed: true };
    }

    return { allowed: true };
  }

  public recordIpFailedAttempt(ip: string) {
    const now = Date.now();
    const record = ipRateLimitMap.get(ip);
    if (!record || now - record.firstAttemptAt > IP_RATE_WINDOW_MS) {
      ipRateLimitMap.set(ip, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
      return;
    }
    record.count += 1;
    if (record.count >= MAX_IP_FAILED_ATTEMPTS) {
      record.lockedUntil = now + ACCOUNT_LOCK_DURATION_MS;
    }
  }

  public clearIpFailedAttempts(ip: string) {
    ipRateLimitMap.delete(ip);
  }

  public async verifyLogin(
    identifier: string,
    password: string,
    ip: string
  ): Promise<{
    ok: boolean;
    account?: ServerAuthAccount;
    status?: number;
    error?: string;
  }> {
    const ipCheck = this.checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return {
        ok: false,
        status: 429,
        error: `Tạm khóa đăng nhập do thử sai quá nhiều lần. Vui lòng thử lại sau ${ipCheck.retryAfterMinutes} phút.`,
      };
    }

    const account = this.findAccountByIdentifier(identifier);
    if (!account) {
      // Constant-time bcrypt check to prevent timing enumeration of accounts
      await bcrypt.compare(password || '', DUMMY_PASSWORD_HASH);
      this.recordIpFailedAttempt(ip);
      return {
        ok: false,
        status: 401,
        error: 'Tên đăng nhập/Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      };
    }

    const now = Date.now();
    if (account.status === 'inactive') {
      await bcrypt.compare(password || '', DUMMY_PASSWORD_HASH);
      return {
        ok: false,
        status: 403,
        error: 'Tài khoản này đang bị khóa bởi Quản trị viên. Vui lòng liên hệ Quản trị hệ thống.',
      };
    }

    if (account.lockedUntil && new Date(account.lockedUntil).getTime() > now) {
      const mins = Math.max(1, Math.ceil((new Date(account.lockedUntil).getTime() - now) / 60000));
      return {
        ok: false,
        status: 429,
        error: `Tài khoản tạm khóa bảo vệ do nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${mins} phút hoặc liên hệ Quản trị viên.`,
      };
    }

    if (!account.passwordHash) {
      await bcrypt.compare(password || '', DUMMY_PASSWORD_HASH);
      return {
        ok: false,
        status: 401,
        error: 'Tài khoản chưa thiết lập mật khẩu. Vui lòng sử dụng liên kết thiết lập mật khẩu hoặc chức năng Quên mật khẩu.',
      };
    }

    const match = await bcrypt.compare(password || '', account.passwordHash);
    if (!match) {
      this.recordIpFailedAttempt(ip);
      account.failedLoginAttempts = (account.failedLoginAttempts || 0) + 1;
      if (account.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        account.lockedUntil = new Date(now + ACCOUNT_LOCK_DURATION_MS).toISOString();
        account.status = 'locked';
        account.updatedAt = new Date(now).toISOString();
        this.saveAccounts();
        return {
          ok: false,
          status: 429,
          error: `Bạn đã nhập sai mật khẩu ${MAX_FAILED_ATTEMPTS} lần liên tiếp. Tài khoản tạm khóa trong 15 phút để bảo vệ an toàn.`,
        };
      }
      account.updatedAt = new Date(now).toISOString();
      this.saveAccounts();
      return {
        ok: false,
        status: 401,
        error: 'Tên đăng nhập/Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      };
    }

    // Login succeeded: reset counters
    this.clearIpFailedAttempts(ip);
    account.failedLoginAttempts = 0;
    account.lockedUntil = null;
    if (account.status === 'locked') {
      account.status = 'active';
    }
    account.lastLoginAt = new Date(now).toISOString();
    account.updatedAt = new Date(now).toISOString();
    this.saveAccounts();

    return { ok: true, account };
  }

  public createSingleUseToken(
    account: ServerAuthAccount,
    type: 'setup' | 'reset',
    baseUrl: string
  ): { rawToken: string; link: string; expiresAt: string } {
    const rawToken = generateSecureToken(32);
    const tokenHash = sha256(rawToken);
    const ttl = type === 'setup' ? SETUP_LINK_TTL_MS : RESET_LINK_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    account.resetTokenHash = tokenHash;
    account.resetTokenType = type;
    account.resetTokenExpiresAt = expiresAt;
    account.resetTokenUsedAt = null;
    account.updatedAt = new Date().toISOString();
    this.saveAccounts();

    const cleanBase = baseUrl.replace(/\/+$/, '');
    const paramName = type === 'setup' ? 'setupToken' : 'resetToken';
    const link = `${cleanBase}/?${paramName}=${rawToken}`;

    return { rawToken, link, expiresAt };
  }

  public verifyResetOrSetupToken(rawToken: string): {
    ok: boolean;
    account?: ServerAuthAccount;
    tokenType?: 'setup' | 'reset';
    error?: string;
  } {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) {
      return { ok: false, error: 'Mã liên kết không hợp lệ.' };
    }
    const tokenHash = sha256(rawToken.trim());
    const account = this.accounts.find((a) => a.resetTokenHash === tokenHash);
    if (!account) {
      return {
        ok: false,
        error: 'Liên kết đặt lại mật khẩu không tồn tại, đã được sử dụng hoặc đã bị thay thế bởi liên kết mới hơn.',
      };
    }
    if (account.resetTokenUsedAt) {
      return {
        ok: false,
        error: 'Liên kết này đã được sử dụng trước đó (Mỗi liên kết chỉ có hiệu lực 1 lần duy nhất).',
      };
    }
    const now = Date.now();
    if (!account.resetTokenExpiresAt || new Date(account.resetTokenExpiresAt).getTime() <= now) {
      return {
        ok: false,
        error: 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu cấp lại liên kết mới.',
      };
    }
    if (account.status === 'inactive') {
      return {
        ok: false,
        error: 'Tài khoản này đang bị khóa bởi Quản trị viên.',
      };
    }
    return {
      ok: true,
      account,
      tokenType: account.resetTokenType || 'reset',
    };
  }

  public async consumeTokenAndSetPassword(
    rawToken: string,
    newPassword: string
  ): Promise<{ ok: boolean; account?: ServerAuthAccount; error?: string }> {
    const check = this.verifyResetOrSetupToken(rawToken);
    if (!check.ok || !check.account) {
      return { ok: false, error: check.error };
    }
    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      return { ok: false, error: pwdError };
    }

    const account = check.account;
    account.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    account.mustChangePassword = false;
    account.resetTokenHash = null;
    account.resetTokenUsedAt = new Date().toISOString();
    account.resetTokenExpiresAt = null;
    account.pendingResetRequestAt = null;
    account.failedLoginAttempts = 0;
    account.lockedUntil = null;
    if (account.status === 'locked') {
      account.status = 'active';
    }
    account.updatedAt = new Date().toISOString();
    this.saveAccounts();
    this.revokeAllUserSessions(account.id);

    return { ok: true, account };
  }

  public async changeOwnPassword(
    account: ServerAuthAccount,
    currentPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; account?: ServerAuthAccount; error?: string }> {
    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      return { ok: false, error: pwdError };
    }

    if (account.passwordHash) {
      const validCurrent = await bcrypt.compare(currentPassword || '', account.passwordHash);
      if (!validCurrent) {
        return { ok: false, error: 'Mật khẩu hiện tại không chính xác.' };
      }
      const sameAsOld = await bcrypt.compare(newPassword, account.passwordHash);
      if (sameAsOld) {
        return { ok: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' };
      }
    }

    account.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    account.mustChangePassword = false;
    account.pendingResetRequestAt = null;
    account.updatedAt = new Date().toISOString();
    this.saveAccounts();

    return { ok: true, account };
  }

  public async createMemberAccount(params: {
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    title?: string;
    department?: string;
    role: UserRole;
    permissions?: Partial<UserPermission>;
    setupMode: 'link' | 'temp_password';
    tempPassword?: string;
    baseUrl: string;
  }): Promise<{
    ok: boolean;
    user?: User;
    setupLink?: string;
    expiresAt?: string;
    sentViaSmtp?: boolean;
    error?: string;
  }> {
    const cleanUsername = (params.username || '').trim().toLowerCase();
    const cleanEmail = (params.email || '').trim().toLowerCase();
    const fullName = (params.fullName || '').trim();

    if (!cleanUsername || !/^[a-z0-9_.-]{3,50}$/.test(cleanUsername)) {
      return {
        ok: false,
        error: 'Tên đăng nhập phải từ 3–50 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.',
      };
    }
    if (!fullName) {
      return { ok: false, error: 'Vui lòng nhập họ và tên thành viên.' };
    }
    if (
      this.accounts.some(
        (a) =>
          a.username.toLowerCase() === cleanUsername ||
          (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail)
      )
    ) {
      return {
        ok: false,
        error: 'Tên đăng nhập hoặc Email này đã tồn tại trong hệ thống.',
      };
    }

    let passwordHash: string | null = null;
    let mustChangePassword = false;

    if (params.setupMode === 'temp_password') {
      const pwdErr = validatePasswordStrength(params.tempPassword || '');
      if (pwdErr) {
        return { ok: false, error: `Mật khẩu tạm thời chưa hợp lệ: ${pwdErr}` };
      }
      passwordHash = await bcrypt.hash(params.tempPassword!, BCRYPT_ROUNDS);
      mustChangePassword = true;
    }

    const role: UserRole =
      params.role === 'admin' ? 'admin' : params.role === 'bgh' ? 'bgh' : 'medic';
    const basePerms = role === 'admin' || role === 'bgh' ? DEFAULT_ADMIN_PERMS : DEFAULT_MEDIC_PERMS;
    const nowIso = new Date().toISOString();

    const newAcc: ServerAuthAccount = {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      username: cleanUsername,
      fullName,
      email: cleanEmail,
      phone: (params.phone || '').trim(),
      title:
        (params.title || '').trim() ||
        (role === 'admin'
          ? 'Quản trị hệ thống'
          : role === 'bgh'
          ? 'Ban Giám Hiệu'
          : 'Nhân viên Y tế'),
      department:
        (params.department || '').trim() ||
        (role === 'admin' || role === 'bgh' ? 'Ban Giám Hiệu & Quản trị' : 'Phòng Y tế Học đường'),
      role,
      status: 'active',
      permissions: {
        ...basePerms,
        ...(params.permissions || {}),
      },
      passwordHash,
      mustChangePassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.accounts.push(newAcc);
    const { link, expiresAt } = this.createSingleUseToken(newAcc, 'setup', params.baseUrl);
    const { sentViaSmtp } = await this.sendAuthLinkEmail({
      to: newAcc.email,
      username: newAcc.username,
      fullName: newAcc.fullName,
      type: 'setup',
      link,
      expiresAt,
    });

    this.saveAccounts();

    return {
      ok: true,
      user: sanitizeUserForClient(newAcc),
      setupLink: link,
      expiresAt,
      sentViaSmtp,
    };
  }

  public updateMemberAccount(
    targetId: string,
    updates: {
      fullName?: string;
      username?: string;
      email?: string;
      phone?: string;
      title?: string;
      department?: string;
      role?: UserRole;
      permissions?: Partial<UserPermission>;
    }
  ): { ok: boolean; user?: User; error?: string } {
    const acc = this.getAccountById(targetId);
    if (!acc) {
      return { ok: false, error: 'Không tìm thấy tài khoản thành viên.' };
    }

    if (updates.username !== undefined) {
      const cleanU = updates.username.trim().toLowerCase();
      if (!cleanU || !/^[a-z0-9_.-]{3,50}$/.test(cleanU)) {
        return { ok: false, error: 'Tên đăng nhập không hợp lệ (3–50 ký tự chữ/số).' };
      }
      if (this.accounts.some((a) => a.id !== targetId && a.username.toLowerCase() === cleanU)) {
        return { ok: false, error: 'Tên đăng nhập đã được sử dụng bởi thành viên khác.' };
      }
      acc.username = cleanU;
    }

    if (updates.email !== undefined) {
      const cleanE = updates.email.trim().toLowerCase();
      if (cleanE && this.accounts.some((a) => a.id !== targetId && a.email.toLowerCase() === cleanE)) {
        return { ok: false, error: 'Email đã được sử dụng bởi thành viên khác.' };
      }
      acc.email = cleanE;
    }

    if (updates.fullName !== undefined && updates.fullName.trim()) {
      acc.fullName = updates.fullName.trim();
    }
    if (updates.phone !== undefined) acc.phone = updates.phone.trim();
    if (updates.title !== undefined) acc.title = updates.title.trim();
    if (updates.department !== undefined) acc.department = updates.department.trim();

    if (updates.role !== undefined) {
      // Prevent demoting the last active admin
      const isCurrentlyAdmin = acc.role === 'admin' || acc.role === 'bgh';
      const nextIsAdmin = updates.role === 'admin' || updates.role === 'bgh';
      if (isCurrentlyAdmin && !nextIsAdmin) {
        const otherActiveAdmins = this.accounts.filter(
          (a) => a.id !== targetId && (a.role === 'admin' || a.role === 'bgh') && a.status === 'active'
        );
        if (otherActiveAdmins.length === 0) {
          return {
            ok: false,
            error: 'Hệ thống phải có ít nhất 01 tài khoản Quản trị viên đang hoạt động.',
          };
        }
      }
      acc.role = updates.role;
    }

    if (updates.permissions !== undefined) {
      const mergedPerms: UserPermission = {
        ...(acc.role === 'admin' || acc.role === 'bgh' ? DEFAULT_ADMIN_PERMS : DEFAULT_MEDIC_PERMS),
        ...(acc.permissions || {}),
        ...updates.permissions,
      };
      // If this is the only active admin with canManageSettings, protect canManageSettings
      if (!mergedPerms.canManageSettings) {
        const otherSettingsAdmins = this.accounts.filter(
          (a) =>
            a.id !== targetId &&
            a.status === 'active' &&
            (a.permissions?.canManageSettings || a.role === 'admin')
        );
        if (otherSettingsAdmins.length === 0) {
          return {
            ok: false,
            error: 'Không thể thu hồi quyền Quản trị hệ thống của Quản trị viên duy nhất.',
          };
        }
      }
      acc.permissions = mergedPerms;
    }

    acc.updatedAt = new Date().toISOString();
    this.saveAccounts();
    return { ok: true, user: sanitizeUserForClient(acc) };
  }

  public toggleLockAccount(
    targetId: string,
    actorId: string,
    lock?: boolean
  ): { ok: boolean; user?: User; error?: string } {
    const acc = this.getAccountById(targetId);
    if (!acc) {
      return { ok: false, error: 'Không tìm thấy tài khoản thành viên.' };
    }
    const currentlyLocked =
      acc.status === 'inactive' ||
      acc.status === 'locked' ||
      Boolean(acc.lockedUntil && new Date(acc.lockedUntil).getTime() > Date.now());
    const shouldLock = typeof lock === 'boolean' ? lock : !currentlyLocked;

    if (shouldLock && targetId === actorId) {
      return { ok: false, error: 'Bạn không thể tự khóa tài khoản đang đăng nhập của chính mình.' };
    }

    if (shouldLock) {
      const otherAdmins = this.accounts.filter(
        (a) => a.id !== targetId && (a.role === 'admin' || a.role === 'bgh') && a.status === 'active'
      );
      if ((acc.role === 'admin' || acc.role === 'bgh') && otherAdmins.length === 0) {
        return { ok: false, error: 'Không thể khóa tài khoản Quản trị viên duy nhất của hệ thống.' };
      }
      acc.status = 'inactive';
      this.revokeAllUserSessions(acc.id);
    } else {
      acc.status = 'active';
      acc.failedLoginAttempts = 0;
      acc.lockedUntil = null;
    }

    acc.updatedAt = new Date().toISOString();
    this.saveAccounts();
    return { ok: true, user: sanitizeUserForClient(acc) };
  }

  public async adminResetPassword(params: {
    targetId: string;
    mode: 'link' | 'temp_password';
    tempPassword?: string;
    baseUrl: string;
  }): Promise<{
    ok: boolean;
    user?: User;
    resetLink?: string;
    expiresAt?: string;
    sentViaSmtp?: boolean;
    error?: string;
  }> {
    const acc = this.getAccountById(params.targetId);
    if (!acc) {
      return { ok: false, error: 'Không tìm thấy tài khoản thành viên.' };
    }

    if (params.mode === 'temp_password') {
      const pwdErr = validatePasswordStrength(params.tempPassword || '');
      if (pwdErr) {
        return { ok: false, error: `Mật khẩu tạm thời không hợp lệ: ${pwdErr}` };
      }
      acc.passwordHash = await bcrypt.hash(params.tempPassword!, BCRYPT_ROUNDS);
      acc.mustChangePassword = true;
    }

    acc.failedLoginAttempts = 0;
    acc.lockedUntil = null;
    acc.pendingResetRequestAt = null;
    if (acc.status === 'locked') {
      acc.status = 'active';
    }

    const { link, expiresAt } = this.createSingleUseToken(acc, 'reset', params.baseUrl);
    const { sentViaSmtp } = await this.sendAuthLinkEmail({
      to: acc.email,
      username: acc.username,
      fullName: acc.fullName,
      type: 'reset',
      link,
      expiresAt,
    });

    this.revokeAllUserSessions(acc.id);
    this.saveAccounts();

    return {
      ok: true,
      user: sanitizeUserForClient(acc),
      resetLink: link,
      expiresAt,
      sentViaSmtp,
    };
  }

  public deleteMemberAccount(
    targetId: string,
    actorId: string
  ): { ok: boolean; error?: string } {
    if (targetId === actorId) {
      return { ok: false, error: 'Không thể xóa tài khoản đang đăng nhập của chính bạn.' };
    }
    const acc = this.getAccountById(targetId);
    if (!acc) {
      return { ok: false, error: 'Không tìm thấy tài khoản.' };
    }
    if (acc.role === 'admin' || acc.role === 'bgh') {
      const otherAdmins = this.accounts.filter(
        (a) => a.id !== targetId && (a.role === 'admin' || a.role === 'bgh') && a.status === 'active'
      );
      if (otherAdmins.length === 0) {
        return { ok: false, error: 'Không thể xóa Quản trị viên duy nhất của hệ thống.' };
      }
    }
    this.accounts = this.accounts.filter((a) => a.id !== targetId);
    this.revokeAllUserSessions(targetId);
    this.saveAccounts();
    return { ok: true };
  }

  public hasServerPermission(
    acc: ServerAuthAccount | null,
    permKey: keyof UserPermission | 'admin_only'
  ): boolean {
    if (!acc || acc.status !== 'active') return false;
    const isAdmin = acc.role === 'admin' || acc.role === 'bgh';
    if (permKey === 'admin_only') {
      return isAdmin || Boolean(acc.permissions?.canManageSettings);
    }
    const perms: UserPermission = {
      ...(isAdmin ? DEFAULT_ADMIN_PERMS : DEFAULT_MEDIC_PERMS),
      ...(acc.permissions || {}),
    };
    return Boolean(perms[permKey]);
  }
}
