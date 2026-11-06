import type { Request, Response } from 'express';
import { createApp } from '../server-runtime.mjs';
const appPromise = createApp(true);
export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  app(req, res);
}
