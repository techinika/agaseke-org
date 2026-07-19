import { NextResponse } from 'next/server';

// This endpoint has been moved to the quorum-subscriptions worker.
// The subscription page now calls the worker directly.
// This stub is kept for backwards compatibility and will be removed in a future version.

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has moved. Use the quorum-subscriptions worker directly.' },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'This endpoint has moved. Use the quorum-subscriptions worker directly.' },
    { status: 410 }
  );
}
