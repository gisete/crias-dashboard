'use client';

import { useEffect, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export function useRealtimeRegistrations(onchange: () => void) {
  const callbackRef = useRef(onchange);

  // Keep the ref pointing at the latest callback without re-subscribing.
  useEffect(() => {
    callbackRef.current = onchange;
  });

  useEffect(() => {
    const channel = supabaseClient
      .channel('registrations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => callbackRef.current(),
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);
}
