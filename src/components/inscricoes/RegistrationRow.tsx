import { Warning, Check, CaretDown, CaretUp } from '@phosphor-icons/react';
import type { RegistrationWithDetails } from '@/types/database';
import { shortenPlan } from '@/lib/plan-display';
import { calculateAge } from '@/lib/age-calculator';
import { STATUS_LABELS, STATUS_PILL } from '@/lib/status-utils';
import { firstName, shortName } from '@/lib/name-utils';

function CheckBadge() {
  return (
    <div className="w-7 h-7 rounded-full bg-check-bg flex items-center justify-center">
      <Check size={14} weight="bold" className="text-check-icon" />
    </div>
  );
}

interface Props {
  registration: RegistrationWithDetails;
  order: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function RegistrationRow({ registration: reg, order, isExpanded, onToggle }: Props) {
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
      <td className="py-6 pl-6 pr-3 text-gray-500 whitespace-nowrap">{order}</td>

      {/* 1. Estado */}
      <td className="py-6 px-6">
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-label-md whitespace-nowrap ${STATUS_PILL[reg.status]}`}>
          {STATUS_LABELS[reg.status]}
        </span>
      </td>

      {/* 2. Criança(s) */}
      <td className="py-6 px-6 font-medium text-gray-900">{childrenLabel}</td>

      {/* 3. Idade */}
      <td className="py-6 px-6 text-gray-500 text-body-md whitespace-nowrap">{ageLabel}</td>

      {/* 4. Responsável — plain text, no avatar */}
      <td className="py-6 px-6 text-gray-600">{parentLabel}</td>

      {/* 5. Plano */}
      <td className="py-6 px-6 text-gray-600">{shortenPlan(reg.plan)}</td>

      {/* 6. Valor */}
      <td className="py-6 px-6 font-medium text-gray-900">{reg.total_price}€</td>

      {/* 7. Fatura */}
      <td className="py-6 px-6">
        {reg.nif ? <CheckBadge /> : null}
      </td>

      {/* 8. Voucher */}
      <td className="py-6 px-6">
        {reg.voucher_code ? <CheckBadge /> : null}
      </td>

      {/* 9. Expand/collapse chevron */}
      <td className="py-6 pl-6 pr-6 text-on-surface-variant">
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
