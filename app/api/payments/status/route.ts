import { NextRequest, NextResponse } from 'next/server';
import { checkDepositStatus } from '@/lib/pawapay';

export async function GET(request: NextRequest) {
  try {
    const depositId = request.nextUrl.searchParams.get('depositId');

    if (!depositId) {
      return NextResponse.json({ error: 'Missing depositId' }, { status: 400 });
    }

    const result = await checkDepositStatus(depositId);

    if (result.status === 'NOT_FOUND') {
      return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'FOUND',
      deposit: result.data,
    });
  } catch (error) {
    console.error('pawaPay status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
