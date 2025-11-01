import type { Request, Response } from 'express';

export function healthRouter(req: Request, res: Response) {
  res.json({ status: 'ok' });
}





