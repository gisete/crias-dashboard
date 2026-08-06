import { NextRequest, NextResponse } from 'next/server';
import { recomputeSessionValues } from '@/lib/data/sessions-sync';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await recomputeSessionValues(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('recompute-session-values error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
