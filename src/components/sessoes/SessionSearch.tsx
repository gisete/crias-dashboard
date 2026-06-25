'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SessionSearch({ value, onChange }: Props) {
  return (
    <div className="relative">
      <MagnifyingGlass
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Procurar criança..."
        className="w-full pl-9 pr-4 py-2.5 text-body-md border border-surface-container-highest rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400"
      />
    </div>
  );
}
