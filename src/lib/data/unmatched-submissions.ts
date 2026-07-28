import { supabaseClient } from '@/lib/supabase/client';
import type { UnmatchedSubmission, ReviewStatus } from '@/types/database';

export async function fetchUnmatchedSubmissions(
  status?: ReviewStatus
): Promise<UnmatchedSubmission[]> {
  const query = supabaseClient
    .from('unmatched_submissions')
    .select('*')
    .in('review_status', status ? [status] : ['pending', 'notified'])
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('fetchUnmatchedSubmissions error:', error);
    return [];
  }
  return (data ?? []) as unknown as UnmatchedSubmission[];
}

export async function fetchUnmatchedCount(): Promise<number> {
  const { count, error } = await supabaseClient
    .from('unmatched_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', 'pending');

  if (error) {
    console.error('fetchUnmatchedCount error:', error);
    return 0;
  }
  return count ?? 0;
}

export async function verifySubmission(
  id: string,
  email?: string
): Promise<{ success: boolean; found: boolean; registration_id?: string; error?: string }> {
  const res = await fetch(`/api/unmatched-submissions/${id}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email ? { email } : {}),
  });
  return res.json();
}

export async function notifySubmission(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/unmatched-submissions/${id}/notify`, {
    method: 'POST',
  });
  return res.json();
}

export async function discardSubmission(
  id: string
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/unmatched-submissions/${id}`, {
    method: 'DELETE',
  });
  return { success: res.ok };
}
