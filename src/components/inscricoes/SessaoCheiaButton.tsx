'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Envelope, CircleNotch, ArrowClockwise, Check } from '@phosphor-icons/react';
import { formatSelectedDate } from '@/lib/date-utils';
import { getSessaoCheiaMode } from '@/lib/sessao-cheia';

interface Props {
  selectedDates: string[];
  month: string;
  sessaoCheiaNotifiedAt: string | null;
  onSessaoCheia: (dates: string[]) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
  title?: string;
}

function formatDayMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function SessaoCheiaButton({
  selectedDates,
  month,
  sessaoCheiaNotifiedAt,
  onSessaoCheia,
  disabled = false,
  title,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mode = getSessaoCheiaMode(selectedDates);

  useEffect(() => {
    if (!showModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) setShowModal(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showModal, loading]);

  async function send(dates: string[]) {
    setLoading(true);
    setError(null);
    try {
      const result = await onSessaoCheia(dates);
      if (!result.success) {
        // Keep the modal open with the ticks so the school can retry.
        setError(result.error ?? 'Erro ao enviar notificação');
        return;
      }
      setShowModal(false);
      setPicked([]);
      setShowResendButton(false);
    } catch {
      setError('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  }

  // Only the no-dates case skips the modal — the school always confirms
  // which sessions are full before an email goes out.
  function handleClick() {
    if (mode === 'none') {
      send([]);
      return;
    }
    setPicked([]);
    setError(null);
    setShowModal(true);
  }

  function toggle(date: string) {
    setPicked((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]));
  }

  // Send in the order the dates appear on the registration, not tick order.
  const orderedPicked = selectedDates.filter((d) => picked.includes(d));
  const canSend = mode === 'confirm' || orderedPicked.length > 0;

  if (sessaoCheiaNotifiedAt && !showResendButton) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[12px] text-[#0F6E56] bg-[#E1F5EE] px-2.5 py-1 rounded-full font-medium">
          <Check size={12} />
          Sessão cheia enviada {formatDayMonth(sessaoCheiaNotifiedAt)}
        </span>
        <button
          onClick={() => setShowResendButton(true)}
          title="Enviar novamente"
          aria-label="Enviar novamente"
          className="w-7 h-7 flex items-center justify-center border border-surface-container-highest text-gray-400 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowClockwise size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        title={title}
        className={`w-auto flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3.5 px-5 rounded-xl text-label-md hover:bg-gray-50 transition-colors ${loading || disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {loading ? <CircleNotch size={16} className="animate-spin" /> : <Envelope size={16} weight="fill" />}
        Sessão Cheia
      </button>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!loading) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Sessão cheia</h2>
            {mode === 'confirm' ? (
              <p className="text-body-md text-gray-600 mb-6">
                Enviar email a informar a família que a sessão de {formatSelectedDate(selectedDates[0], month)} está cheia?
              </p>
            ) : (
              <>
                <p className="text-body-md text-gray-600 mb-6">Quais as sessões que estão cheias?</p>

                <div className="flex flex-col gap-1 mb-8">
                  {/* Keyed by the entry, not the day — the same day can appear
                      twice with different slots. */}
                  {selectedDates.map((date) => (
                    <label
                      key={date}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="sessao-cheia-data"
                        value={date}
                        checked={picked.includes(date)}
                        onChange={() => toggle(date)}
                        disabled={loading}
                        className="accent-primary"
                      />
                      <span className="text-body-md text-gray-900">
                        {formatSelectedDate(date, month)}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="text-label-sm text-red-500 mb-4">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => send(mode === 'confirm' ? selectedDates : orderedPicked)}
                disabled={loading || !canSend}
                className="px-5 py-2.5 rounded-xl text-label-md bg-on-primary-fixed text-white hover:bg-on-primary-fixed/90 transition-colors disabled:opacity-50"
              >
                {loading ? <CircleNotch size={16} className="animate-spin" /> : 'Enviar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
