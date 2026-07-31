import { Warning, Check, CaretDown, CaretUp } from '@phosphor-icons/react';
import type { RegistrationWithDetails } from '@/types/database';
import { shortenPlan } from '@/lib/plan-display';
import { calculateAge } from '@/lib/age-calculator';
import { STATUS_LABELS, STATUS_PILL } from '@/lib/status-utils';
import { firstName, shortName } from '@/lib/name-utils';

function CheckBadge() {
  return (
    <div className="w-5 h-5 rounded-full bg-check-bg flex items-center justify-center">
      <Check size={11} weight="bold" className="text-check-icon translate-x-px -translate-y-px" />
    </div>
  );
}

interface Props {
  registration: RegistrationWithDetails;
  order: number;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleFaturaEnviada: () => void;
}

export function RegistrationRow({
  registration: reg,
  order,
  isExpanded,
  onToggle,
  onToggleFaturaEnviada,
}: Props) {
  const { family, children } = reg;

  const childrenLabel = children.map((c) => firstName(c.name)).join(' + ');
  const parentLabel = shortName(family.parent_name);

  const ageLabel = children
    .map((c) => (c.date_of_birth ? calculateAge(c.date_of_birth) : '—'))
    .join(' / ');

  const isCancelled = reg.status === 'cancelado';

  return (
    <tr
      className={`hover:bg-surface-container-low transition-colors cursor-pointer border-b border-surface-container-highest ${
        isCancelled ? 'opacity-50' : ''
      } ${isExpanded ? 'bg-surface-container-low' : 'bg-surface-container-lowest'}`}
      onClick={onToggle}
    >
      {/* #. Ordem de inscrição */}
      <td className="py-3 md:py-6 pl-3 md:pl-6 pr-3 text-gray-500 whitespace-nowrap">{order}</td>

      {/* 1. Estado */}
      <td className="py-3 md:py-6 px-3 md:px-6">
        <span className={`inline-flex items-center px-2.5 py-1 md:px-4 md:py-2 rounded-full text-label-md whitespace-nowrap ${STATUS_PILL[reg.status]}`}>
          {STATUS_LABELS[reg.status]}
        </span>
      </td>

      {/* 2. Criança(s) */}
      <td className="py-3 md:py-6 px-3 md:px-6 font-medium text-gray-900">{childrenLabel}</td>

      {/* 3. Idade */}
      <td className="py-3 md:py-6 px-3 md:px-6 text-gray-500 text-body-md whitespace-nowrap">{ageLabel}</td>

      {/* 4. Responsável — plain text, no avatar */}
      <td className="py-3 md:py-6 px-3 md:px-6 text-gray-600">{parentLabel}</td>

      {/* 5. Plano */}
      <td className="py-3 md:py-6 px-3 md:px-6 text-gray-600">{shortenPlan(reg.plan)}</td>

      {/* 6. Valor */}
      <td className="py-3 md:py-6 px-3 md:px-6 font-medium text-gray-900">{reg.total_price}€</td>

      {/* 7. Fatura */}
      <td className="py-3 md:py-6 px-3 md:px-6">
        {reg.nif ? (
          <div className="flex justify-center">
            <CheckBadge />
          </div>
        ) : null}
      </td>

      {/* 7b. Fatura enviada */}
      <td className="py-2 md:py-4 px-1 md:px-2 bg-[#F8FDFA] border-x border-surface-container-highest">
        {reg.nif ? (
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFaturaEnviada();
              }}
              className={`group w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors touch-manipulation ${
                reg.fatura_enviada
                  ? 'border-emerald-600 bg-emerald-600'
                  : 'border-gray-300 bg-transparent hover:border-emerald-600 hover:bg-emerald-50'
              }`}
              aria-label={reg.fatura_enviada ? 'Marcar fatura como não enviada' : 'Marcar fatura como enviada'}
            >
              <Check
                size={11}
                weight="bold"
                className={`translate-x-px -translate-y-px ${
                  reg.fatura_enviada
                    ? 'text-white'
                    : 'text-transparent group-hover:text-emerald-300'
                }`}
              />
            </button>
          </div>
        ) : null}
      </td>

      {/* 8. Voucher */}
      <td className="py-3 md:py-6 px-1 md:px-2">
        {reg.voucher_code ? (
          <div className="flex justify-center">
            <CheckBadge />
          </div>
        ) : null}
      </td>

      {/* 9. Expand/collapse chevron */}
      <td className="py-3 md:py-6 pl-3 md:pl-6 pr-3 md:pr-6 text-on-surface-variant">
        {reg.webhook_error && (
          <Warning size={14} weight="fill" className="text-error inline mr-2" />
        )}
        {isExpanded
          ? <CaretUp size={16} weight="bold" />
          : <CaretDown size={16} weight="bold" />}
      </td>
    </tr>
  );
}
