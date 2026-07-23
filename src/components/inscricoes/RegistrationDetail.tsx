'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PencilSimple, Check, X } from '@phosphor-icons/react';
import type { RegistrationWithDetails, RegistrationStatus, Child } from '@/types/database';
import { calculateAge } from '@/lib/age-calculator';
import { STATUS_LABELS, STATUS_PILL, ALL_STATUSES } from '@/lib/status-utils';
import { useToast } from '@/contexts/ToastContext';
import {
  updateRegistration,
  updateRegistrationStatus,
  updateRegistrationDates,
  updateFamily,
  updateChild,
} from '@/lib/data/registrations';
import { parsePlan } from '@/lib/plan-parser';
import { InlineEditField } from './InlineEditField';
import { StatusActions } from './StatusActions';
import { WebhookErrorBanner } from './WebhookErrorBanner';
import { DeleteRegistrationButton } from './DeleteRegistrationButton';
import { ResyncButton } from './ResyncButton';

interface Props {
  registration: RegistrationWithDetails;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onStatusChange: (id: string, newStatus: RegistrationStatus) => void;
}

const IMAGE_CONSENT_OPTIONS = ['Sim, autorizo', 'Autorizo, mas o rosto não é exposto', 'Não'];

const STATUS_TOAST_MESSAGES: Partial<Record<RegistrationStatus, string>> = {
  a_pagar: 'Dados de pagamento enviados',
  pago_confirmado: 'Pagamento confirmado',
  lembrete: 'Lembrete enviado',
  cancelado: 'Inscrição cancelada',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatChildNames(children: Child[]): string {
  if (children.length === 0) return '';
  if (children.length === 1) return children[0].name;
  return `${children.slice(0, -1).map((c) => c.name).join(', ')} e ${children[children.length - 1].name}`;
}

function formatPlanBreakdown(unitPrice: number, numSessions: number): string {
  const parts = [`${unitPrice}€`, numSessions === 1 ? '1 sessão' : `${numSessions} sessões`];
  if (numSessions > 1) {
    const perSession = (unitPrice / numSessions).toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    parts.push(`${perSession}€/sessão`);
  }
  return parts.join(' · ');
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-body-md text-gray-900">{value}</span>
    </div>
  );
}

export function RegistrationDetail({ registration: reg, onUpdate, onStatusChange }: Props) {
  const { family, children } = reg;
  const { showToast } = useToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [editingDates, setEditingDates] = useState(false);
  const [datesDraft, setDatesDraft] = useState('');
  const [pendingStatus, setPendingStatus] = useState<RegistrationStatus | null>(null);

  useEffect(() => {
    if (!statusOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setStatusOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [statusOpen]);

  async function handleSave(fieldName: string, value: string) {
    await updateRegistration(reg.id, { [fieldName]: value });
    onUpdate(reg.id, { [fieldName]: value });
  }

  async function handleFamilySave(fieldName: string, value: string) {
    await updateFamily(family.id, { [fieldName]: value });
    onUpdate(reg.id, { family: { ...family, [fieldName]: value } });
  }

  async function handleChildSave(childId: string, fieldName: string, value: string) {
    await updateChild(childId, { [fieldName]: value });
    const newChildren = children.map((c) =>
      c.id === childId ? { ...c, [fieldName]: value } : c,
    );
    onUpdate(reg.id, { children: newChildren });
  }

  async function handlePlanSave(_fieldName: string, value: string) {
    const parsed = parsePlan(value);
    const totalPrice = parsed.unitPrice * reg.num_children;
    const updates = {
      plan: value,
      unit_price: parsed.unitPrice,
      num_sessions: parsed.numSessions,
      has_photos: parsed.hasPhotos,
      total_price: totalPrice,
    };
    await updateRegistration(reg.id, updates);
    onUpdate(reg.id, updates);
  }

  async function handleDatesSave(_fieldName: string, value: string) {
    const dates = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (reg.status === 'pago_confirmado') {
      await updateRegistrationDates(reg.id, dates);
    } else {
      await updateRegistration(reg.id, { selected_dates: dates });
    }
    onUpdate(reg.id, { selected_dates: dates });
  }

  async function applyStatus(newStatus: RegistrationStatus, options?: { silent?: boolean }) {
    const result = await updateRegistrationStatus(reg.id, newStatus, options);
    if (!result.success) {
      showToast('Erro ao atualizar estado', 'error');
      return;
    }
    onStatusChange(reg.id, newStatus);
    const message = STATUS_TOAST_MESSAGES[newStatus];
    if (message) showToast(message);
  }

  // Wired to StatusActions' quick-action buttons — the "official" flow, so it
  // sends the Brevo notification as usual.
  async function handleStatusChange(newStatus: RegistrationStatus) {
    await applyStatus(newStatus);
  }

  // Manual "Estado" dropdown override — used for testing or to correct a
  // mistake, so it must not re-trigger a customer email.
  function handleStatusSelect(newStatus: RegistrationStatus) {
    setStatusOpen(false);
    if (newStatus === reg.status) return;
    if (reg.status === 'pago_confirmado' && newStatus !== 'pago_confirmado') {
      setPendingStatus(newStatus);
      return;
    }
    applyStatus(newStatus, { silent: true });
  }

  async function handleConfirmStatusChange() {
    if (!pendingStatus) return;
    await applyStatus(pendingStatus, { silent: true });
    setPendingStatus(null);
  }

  async function handleResend() {
    const result = await updateRegistrationStatus(reg.id, reg.status);
    if (result.success) {
      onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
    }
  }

  const childNamesStr = formatChildNames(children);

  return (
    <>
      <tr className="bg-[#fbfbfb] border-b border-surface-container-highest">
        <td colSpan={10} className="p-0">
          <div className="p-10">
            {reg.webhook_error && reg.webhook_error_message && (
              <WebhookErrorBanner
                message={reg.webhook_error_message}
                onResend={handleResend}
              />
            )}
            {/* The parent cell is always ≥900px (table min-w), so use a fixed
                3-column layout — viewport breakpoints would collapse this to
                one stretched column on phones. */}
            <div className="grid grid-cols-3 gap-6">
              {/* Column 1 — Crianças, Responsável, Contacto, Estado */}
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-3 mb-6">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-body-md font-medium text-gray-500 shrink-0">
                        {child.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <InlineEditField
                          value={child.name}
                          fieldName="name"
                          valueClassName="text-body-lg font-medium text-gray-900"
                          onSave={(fieldName, value) => handleChildSave(child.id, fieldName, value)}
                        />
                        {child.date_of_birth && (
                          <InlineEditField
                            value={child.date_of_birth}
                            fieldName="date_of_birth"
                            type="date"
                            displayValue={
                              <span className="text-label-md font-medium text-gray-500">
                                {calculateAge(child.date_of_birth)} · {formatDate(child.date_of_birth)}
                              </span>
                            }
                            onSave={(fieldName, value) => handleChildSave(child.id, fieldName, value)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <InlineEditField
                    label="Responsável"
                    value={family.parent_name}
                    fieldName="parent_name"
                    onSave={handleFamilySave}
                  />
                  <Field
                    label="Email"
                    value={
                      <a href={`mailto:${family.email}`} className="hover:underline">
                        {family.email}
                      </a>
                    }
                  />
                  <InlineEditField
                    label="Telefone"
                    value={family.phone}
                    fieldName="phone"
                    onSave={handleFamilySave}
                  />
                </div>

                <div className="mt-auto pt-4">
                  <div>
                    <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">Estado</span>
                    <div ref={statusRef} className="relative">
                      <button
                        onClick={() => setStatusOpen((o) => !o)}
                        className="group inline-flex items-center gap-1.5 text-left cursor-pointer"
                      >
                        <span className="text-body-md text-gray-900">
                          {STATUS_LABELS[reg.status]}
                        </span>
                        <PencilSimple
                          size={14}
                          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        />
                      </button>

                      {statusOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-surface-container-highest z-50 py-1">
                          {ALL_STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusSelect(s)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low transition-colors"
                            >
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-label-md ${STATUS_PILL[s]}`}>
                                {STATUS_LABELS[s]}
                              </span>
                              {s === reg.status && (
                                <Check size={14} weight="bold" className="text-primary shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2 — Escolha & Sessões agendadas */}
              <div className="flex flex-col gap-4">
                <div>
                  <InlineEditField
                    label="Escolha"
                    value={reg.plan}
                    fieldName="plan"
                    onSave={handlePlanSave}
                  />
                  <span className="block mt-1 text-label-md text-gray-500">
                    {formatPlanBreakdown(reg.unit_price, reg.num_sessions)}
                  </span>
                </div>

                <div>
                  <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">Sessões agendadas</span>
                  {editingDates ? (
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={datesDraft}
                        onChange={(e) => setDatesDraft(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={async () => { await handleDatesSave('selected_dates', datesDraft); setEditingDates(false); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shrink-0 mt-0.5"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => setEditingDates(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container-highest hover:bg-surface-container text-gray-500 transition-colors shrink-0 mt-0.5"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setDatesDraft(reg.selected_dates.join(', ')); setEditingDates(true); }}
                      className="group flex flex-wrap items-center gap-2 w-fit text-left -mx-1.5 -my-0.5 px-1.5 py-0.5 rounded-md hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      {reg.selected_dates.length > 0 ? (
                        reg.selected_dates.map((date) => (
                          <span
                            key={date}
                            className="px-3 py-1 rounded-full bg-surface-container text-label-md text-gray-900"
                          >
                            {date}
                          </span>
                        ))
                      ) : (
                        <span className="text-body-md text-gray-400">—</span>
                      )}
                      <PencilSimple
                        size={14}
                        className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Column 3 — NIF, Voucher, Consentimento, Notas */}
              <div className="flex flex-col gap-4">
                <InlineEditField
                  label="NIF"
                  value={reg.nif}
                  fieldName="nif"
                  onSave={handleSave}
                />
                <InlineEditField
                  label="Voucher"
                  value={reg.voucher_code}
                  fieldName="voucher_code"
                  onSave={handleSave}
                />
                <InlineEditField
                  label="Consentimento imagem"
                  value={reg.image_consent}
                  fieldName="image_consent"
                  type="select"
                  options={IMAGE_CONSENT_OPTIONS}
                  onSave={handleSave}
                />
                <InlineEditField
                  label="Notas internas"
                  value={reg.notes}
                  fieldName="notes"
                  type="textarea"
                  onSave={handleSave}
                />
              </div>
            </div>

            {/* Footer row */}
            <div className="mt-8 pt-6 border-t border-surface-container-highest flex items-center justify-between gap-4">
              <DeleteRegistrationButton registrationId={reg.id} childNames={childNamesStr} />
              <div className="flex items-center gap-4">
                <ResyncButton registrationId={reg.id} family={family} onUpdate={onUpdate} />
                <StatusActions
                  status={reg.status}
                  onAction={handleStatusChange}
                  hasVoucher={!!reg.voucher_code}
                  childrenCount={children.length}
                />
              </div>
            </div>
          </div>
        </td>
      </tr>

      {pendingStatus && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingStatus(null)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Alterar estado?</h2>
            <p className="text-body-md text-gray-600 mb-8">
              Ao alterar de Pago para {STATUS_LABELS[pendingStatus]}, {childNamesStr} será
              removido(a) das sessões agendadas. Esta ação pode ser revertida confirmando o
              pagamento novamente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingStatus(null)}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStatusChange}
                className="px-5 py-2.5 rounded-xl text-label-md bg-on-primary-fixed text-white hover:bg-on-primary-fixed/90 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
