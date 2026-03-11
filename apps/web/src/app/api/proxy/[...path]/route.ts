import { NextRequest, NextResponse } from 'next/server';

const API = 'http://localhost:4001';

async function forward(req: NextRequest, method: string, path: string[]) {
  const target = `${API}/${path.join('/')}`;
  const body = method === 'GET' ? undefined : await req.text();
  const res = await fetch(target, {
    method,
    headers: { 'content-type': req.headers.get('content-type') || 'application/json' },
    body,
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(req, 'GET', path);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(req, 'POST', path);
}
