'use client';

import { useCallback, useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import { supabaseClient } from '@/lib/supabase/client';
import { useRealtimeRegistrations } from '@/hooks/useRealtimeRegistrations';

export function PendingCounter() {
  const [count, setCount] = useState(0);

  const refetch = useCallback(() => {
    supabaseClient
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .then(({ count }) => setCount(count ?? 0));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtimeRegistrations(refetch);

  return (
    <div className="flex items-center gap-3 p-3 text-primary-fixed text-label-md bg-white/5 rounded-lg">
      <Warning size={18} weight="fill" />
      <span>Pendente: {count}</span>
    </div>
  );
}
