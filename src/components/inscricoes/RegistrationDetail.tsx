'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Envelope, Phone, PencilSimple, Check, Trash, X } from '@phosphor-icons/react';
import type { RegistrationWithDetails, RegistrationStatus } from '@/types/database';
import { calculateAge } from '@/lib/age-calculator';
import { STATUS_LABELS, STATUS_PILL, ALL_STATUSES } from '@/lib/status-utils';
import { updateRegistration, updateRegistrationStatus, deleteRegistration } from '@/lib/data/registrations';
import { parsePlan } from '@/lib/plan-parser';
import { InlineEditField } from './InlineEditField';
import { StatusActions } from './StatusActions';
import { WebhookErrorBanner } from './WebhookErrorBanner';

interface Props {
  registration: RegistrationWithDetails;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onStatusChange: (id: string, newStatus: RegistrationStatus) => void;
}

const IMAGE_CONSENT_OPTIONS = ['Sim, autorizo', 'Não autorizo', 'Apenas para uso interno'];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatChildNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function RegistrationDetail({ registration: reg, onUpdate, onStatusChange }: Props) {
  const { family, children } = reg;
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingDates, setEditingDates] = useState(false);
  const [datesDraft, setDatesDraft] = useState('');

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

  useEffect(() => {
    if (!showModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) setShowModal(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showModal, deleting]);

  async function handleSave(fieldName: string, value: string) {
    await updateRegistration(reg.id, { [fieldName]: value });
    onUpdate(reg.id, { [fieldName]: value });
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
    await updateRegistration(reg.id, { selected_dates: dates });
    onUpdate(reg.id, { selected_dates: dates });
  }

  async function handleStatusChange(newStatus: RegistrationStatus) {
    await updateRegistrationStatus(reg.id, newStatus);
    onStatusChange(reg.id, newStatus);
  }

  async function handleStatusSelect(newStatus: RegistrationStatus) {
    setStatusOpen(false);
    if (newStatus !== reg.status) {
      await handleStatusChange(newStatus);
    }
  }

  async function handleResend() {
    await updateRegistration(reg.id, { webhook_error: false, webhook_error_message: null });
    onUpdate(reg.id, { webhook_error: false, webhook_error_message: null });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRegistration(reg.id);
    setDeleting(false);
    if (result.success) {
      setShowModal(false);
    } else {
      setShowModal(false);
      setDeleteError('Erro ao eliminar. Tente novamente.');
    }
  }

  const childNames = formatChildNames(children.map((c) => c.name));

  return (
    <>
      <tr className="bg-surface-bright border-b border-surface-container-highest">
        <td colSpan={9} className="p-0">
          <div className="p-10">
            {reg.webhook_error && reg.webhook_error_message && (
              <WebhookErrorBanner
                message={reg.webhook_error_message}
                onResend={handleResend}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              {/* Left — Estado, Contacto & Crianças */}
              <div className="flex flex-col gap-10">
                <div>
                  <h4 className="text-label-sm text-gray-500 uppercase mb-4 tracking-wider">Estado</h4>
                  <div ref={statusRef} className="relative">
                    <button
                      onClick={() => setStatusOpen((o) => !o)}
                      className="group flex items-center justify-between w-full text-left cursor-pointer"
                    >
                      <span className="text-body-lg font-medium text-gray-900">
                        {STATUS_LABELS[reg.status]}
                      </span>
                      <PencilSimple
                        size={14}
                        className="text-gray-400 group-hover:text-gray-900 transition-colors shrink-0"
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

                <div>
                  <p className="text-title-lg text-gray-900 mb-2">{family.parent_name}</p>
                  <a
                    href={`mailto:${family.email}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-gray-900 hover:underline text-body-md mb-2 transition-colors"
                  >
                    <Envelope size={14} />
                    {family.email}
                  </a>
                  {family.phone && (
                    <p className="flex items-center gap-3 text-gray-600 text-body-md">
                      <Phone size={14} />
                      {family.phone}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-label-sm text-gray-500 uppercase mb-4 tracking-wider">Crianças</h4>
                  <div className="flex flex-col gap-4">
                    {children.map((child) => (
                      <div key={child.id} className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-gray-600 text-title-lg font-semibold shrink-0">
                          {child.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-title-lg text-gray-900">{child.name}</span>
                          {child.date_of_birth && (
                            <>
                              <span className="text-body-md text-gray-600">
                                {calculateAge(child.date_of_birth)}
                              </span>
                              <span className="text-label-md text-on-surface-variant">
                                {formatDate(child.date_of_birth)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Middle — Plano & Sessões */}
              <div className="flex flex-col gap-10">
                <div>
                  <h4 className="text-label-sm text-gray-500 uppercase mb-4 tracking-wider">Resumo do Plano</h4>
                  <div className="flex flex-col gap-3">
                    <InlineEditField
                      label="Plano"
                      value={reg.plan}
                      fieldName="plan"
                      onSave={handlePlanSave}
                    />
                    <div className="flex items-center gap-4">
                      <span className="text-title-lg text-gray-900">{reg.total_price}€</span>
                      <span className="text-body-md text-gray-600">
                        {reg.num_children === 1 ? '1 Criança' : `${reg.num_children} Crianças`}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-label-sm text-gray-500 uppercase tracking-wider">Sessões Agendadas</h4>
                    {!editingDates && (
                      <button
                        onClick={() => { setDatesDraft(reg.selected_dates.join(', ')); setEditingDates(true); }}
                        className="text-gray-400 hover:text-gray-900 transition-colors"
                      >
                        <PencilSimple size={14} />
                      </button>
                    )}
                  </div>
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
                    <div className="flex flex-wrap gap-3">
                      {reg.selected_dates.map((date) => (
                        <span
                          key={date}
                          className="px-4 py-2 rounded-full bg-surface-container text-label-sm text-gray-900"
                        >
                          {date}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right — Detalhes Administrativos & Notas */}
              <div className="flex flex-col gap-10">
                <div>
                  <h4 className="text-label-sm text-gray-500 uppercase mb-4 tracking-wider">
                    Detalhes Administrativos
                  </h4>
                  <div className="flex flex-col gap-6">
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
                      label="Consentimento Imagem"
                      value={reg.image_consent}
                      fieldName="image_consent"
                      type="select"
                      options={IMAGE_CONSENT_OPTIONS}
                      onSave={handleSave}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-label-sm text-gray-500 block mb-2 tracking-wider uppercase">
                    Notas Internas
                  </span>
                  <InlineEditField
                    label=""
                    value={reg.notes}
                    fieldName="notes"
                    type="textarea"
                    onSave={handleSave}
                  />
                </div>
              </div>
            </div>

            {/* Footer row */}
            <div className="mt-8 pt-6 border-t border-surface-container-highest flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setDeleteError(null); setShowModal(true); }}
                  className="flex items-center gap-1.5 text-label-md text-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash size={14} />
                  Eliminar inscrição
                </button>
                {deleteError && (
                  <p className="text-label-sm text-red-500">{deleteError}</p>
                )}
              </div>
              <StatusActions status={reg.status} onAction={handleStatusChange} />
            </div>
          </div>
        </td>
      </tr>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!deleting) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Eliminar inscrição?</h2>
            <p className="text-body-md text-gray-600 mb-8">
              Esta ação vai eliminar permanentemente a inscrição
              {childNames ? ` de ${childNames}` : ''} e todos os dados associados (família e crianças).
              Esta ação não pode ser revertida.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-70"
              >
                {deleting ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
