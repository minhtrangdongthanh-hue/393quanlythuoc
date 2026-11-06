import type { Request, Response } from 'express';
import { createApp } from '../server.ts';
const appPromise = createApp(true);
export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  app(req, res);
}
