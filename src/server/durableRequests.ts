import crypto from 'crypto';
import type { RequestHandler } from 'express';

// One shared snapshot preserves the existing file-based application model.
// A Redis lease and a local queue prevent concurrent requests losing updates.
export function durableRequests(read: () => any, restore: (snapshot: any) => void): RequestHandler {
  let queue = Promise.resolve();
  const initialSnapshot = JSON.stringify(read());
  return async (req, res, next) => {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    const unavailable = () => {
      res.removeHeader('Content-Length');
      res.removeHeader('Set-Cookie');
      res.status(503).json({ ok: false, error: 'Máy chủ chưa sẵn sàng. Kiểm tra kết nối Redis trong Vercel và triển khai lại.' });
    };
    if (!url || !token) { unavailable(); return; }
    const command = async (...args: any[]) => {
      const response = await fetch(url, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Redis HTTP error');
      const result = await response.json();
      if (result.error) throw new Error('Redis command failed');
      return result.result;
    };
    const prefix = process.env.APP_STORAGE_PREFIX || 'dongthanh:v1';
    const owner = crypto.randomUUID();
    const previous = queue;
    let releaseLocal!: () => void;
    queue = new Promise<void>((resolve) => { releaseLocal = resolve; });
    await previous;
    let locked = false;
    const unlock = async () => {
      try {
        if (locked) await command('EVAL', "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", 1, `${prefix}:lock`, owner);
      } finally { releaseLocal(); }
    };
    try {
      locked = (await command('SET', `${prefix}:lock`, owner, 'NX', 'EX', 120)) === 'OK';
      if (!locked) { releaseLocal(); res.status(503).json({ ok: false, error: 'Máy chủ đang xử lý yêu cầu khác. Vui lòng thử lại.' }); return; }
      const raw = await command('GET', `${prefix}:snapshot`);
      restore(JSON.parse(raw || initialSnapshot));
    } catch (error) {
      await unlock().catch(() => {});
      unavailable(); return;
    }
    const originalEnd = res.end.bind(res);
    let ending = false;
    // Delay the response until the account/session update is durable.
    res.end = ((...args: any[]) => {
      if (ending) return res;
      ending = true;
      (async () => {
        try {
          await command('SET', `${prefix}:snapshot`, JSON.stringify(read()));
          await unlock();
          originalEnd(...args as [any]);
        } catch (error) {
          await unlock().catch(() => {});
          res.end = originalEnd;
          if (!res.headersSent) unavailable(); else res.destroy();
        }
      })();
      return res;
    }) as typeof res.end;
    next();
  };
}
