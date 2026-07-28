'use client';

import Link from 'next/link';
import { Warning } from '@phosphor-icons/react';

interface Props {
  count: number;
}

export function UnmatchedAlert({ count }: Props) {
  if (count === 0) return null;

  return (
    <div
      className="rounded-xl mb-8"
      style={{ backgroundColor: '#FFFBF0', border: '1px solid #F0C775', padding: '14px 18px' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warning size={18} weight="fill" style={{ color: '#BA7517' }} />
          <span className="text-body-md font-semibold" style={{ color: '#854F0B' }}>
            {count} {count === 1 ? 'inscrição por confirmar' : 'inscrições por confirmar'}
          </span>
        </div>
        <Link href="/revisao" className="text-[13px] font-medium underline" style={{ color: '#854F0B' }}>
          Ver todas →
        </Link>
      </div>
    </div>
  );
}
