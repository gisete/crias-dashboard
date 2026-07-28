import { ArrowRight } from '@phosphor-icons/react/dist/ssr';

const STATUS_CLASSES: Record<string, string> = {
  pendente: 'bg-red-100 text-red-700',
  a_pagar: 'bg-status-apagar-bg text-status-apagar-text',
  lembrete: 'bg-status-lembrete-bg text-status-lembrete-text',
  pago: 'bg-status-pago-bg text-status-pago-text',
  cancelado: 'bg-gray-100 text-gray-500',
};

function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-label-md font-medium ${STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-[3px] border-emerald-400 bg-emerald-50 rounded-r-lg px-4 py-3 my-4 text-body-md text-gray-700">
      {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-[3px] border-amber-400 bg-amber-50 rounded-r-lg px-4 py-3 my-4 text-body-md text-gray-700">
      {children}
    </div>
  );
}

function Arrow() {
  return <ArrowRight size={12} weight="bold" className="inline mx-1 text-gray-400" />;
}

const TOC = [
  { id: 'novo-mes', label: '1. Como começar um novo mês' },
  { id: 'inscricoes', label: '2. Inscrições' },
  { id: 'revisao', label: '3. Revisão' },
  { id: 'sessoes', label: '4. Sessões' },
  { id: 'presencas', label: '5. Presenças' },
  { id: 'meses', label: '6. Meses' },
];

export default function SobrePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-headline-md md:text-headline-lg text-gray-900 mb-2">Guia de utilização</h1>
      <p className="text-body-lg text-gray-500 mb-8">
        Referência sobre como utilizar o painel de gestão. Esta página é atualizada sempre que o processo muda.
      </p>

      {/* ── Table of contents ── */}
      <nav className="bg-surface-container-low rounded-xl border border-surface-container-highest p-5 mb-10">
        <p className="text-label-md text-gray-500 uppercase tracking-wider mb-3">Índice</p>
        <ul className="flex flex-col gap-1.5">
          {TOC.map(({ id, label }) => (
            <li key={id}>
              <a href={`#${id}`} className="text-body-md text-primary hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Sections ── */}
      <div className="flex flex-col gap-12 text-body-md text-gray-700 leading-relaxed">

        {/* 1 ── Como começar um novo mês ── */}
        <section id="novo-mes">
          <h2 className="text-title-lg text-gray-900 mb-4">1. Como começar um novo mês</h2>
          <p className="mb-3">
            Antes de abrir inscrições para um novo mês, é preciso prepará-lo no sistema:
          </p>
          <ol className="list-decimal list-inside flex flex-col gap-2 mb-4 pl-1">
            <li>Ir à página <strong>Meses</strong> e clicar no botão <strong>+</strong> para criar o novo mês</li>
            <li>O mês é criado com estado <strong>Ativo</strong></li>
            <li>No Tally, atualizar o campo escondido <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[13px]">mes</code> para corresponder ao nome do novo mês (ex: &quot;agosto&quot;)</li>
            <li>Publicar ou partilhar o formulário Tally</li>
            <li>As inscrições começam a aparecer automaticamente na página Inscrições</li>
          </ol>
          <Tip>
            É possível ter dois meses ativos ao mesmo tempo — por exemplo, quando um mês está a fechar e o próximo já está aberto para inscrições.
          </Tip>
        </section>

        {/* 2 ── Inscrições ── */}
        <section id="inscricoes">
          <h2 className="text-title-lg text-gray-900 mb-4">2. Inscrições</h2>
          <p className="mb-4">
            Quando uma família preenche o formulário Tally, a inscrição aparece na página Inscrições com o estado <StatusPill status="pendente" label="Pendente" />.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3">Estados e fluxo</h3>
          <p className="mb-3">Cada inscrição passa pelos seguintes estados:</p>
          <div className="flex flex-col gap-2 mb-4 pl-1">
            <p><StatusPill status="pendente" label="Pendente" /> — acabou de chegar, precisa de ser revista</p>
            <p><StatusPill status="a_pagar" label="A Pagar" /> — foi revista, email enviado à família com informação de pagamento</p>
            <p><StatusPill status="lembrete" label="Lembrete" /> — lembrete de pagamento enviado</p>
            <p><StatusPill status="pago" label="Pago" /> — pagamento confirmado, criança inscrita nas sessões</p>
            <p><StatusPill status="cancelado" label="Cancelado" /> — inscrição cancelada</p>
          </div>

          <p className="mb-2">O fluxo normal é:</p>
          <p className="mb-4 flex items-center flex-wrap gap-1">
            <StatusPill status="pendente" label="Pendente" />
            <Arrow />
            <StatusPill status="a_pagar" label="A Pagar" />
            <Arrow />
            <StatusPill status="pago" label="Pago" />
          </p>

          <Warning>
            <strong>Cada mudança de estado (exceto Pendente) envia automaticamente um email à família.</strong> Confirmar sempre antes de clicar nos botões de ação.
          </Warning>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3 mt-6">Voucher</h3>
          <p className="mb-3">
            Quando uma família tem voucher e inscreve apenas <strong>uma criança</strong>, o sistema salta automaticamente de Pendente para Pago — o voucher cobre o valor total da inscrição.
          </p>
          <p className="mb-3">
            Com várias crianças e voucher, o fluxo segue o caminho normal porque o voucher só cobre parcialmente o valor.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3 mt-6">Inscrições não atribuídas</h3>
          <p className="mb-3">
            Se aparecer um aviso amarelo entre os cartões de estatísticas e os filtros, significa que há inscrições que não foram associadas a nenhum mês. Clicar em &quot;Ver inscrições&quot; para as atribuir ao mês correto.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3 mt-6">Editar detalhes</h3>
          <p className="mb-3">
            Para editar as datas selecionadas, clicar no campo de datas da inscrição. Para alterar o estado manualmente, passar o rato sobre o estado atual — aparece um ícone de lápis que permite escolher outro estado.
          </p>
          <Warning>
            A alteração manual do estado também dispara o envio de email. Usar com cuidado.
          </Warning>
        </section>

        {/* 3 ── Revisão ── */}
        <section id="revisao">
          <h2 className="text-title-lg text-gray-900 mb-4">3. Revisão</h2>
          <p className="mb-4">
            A página Revisão mostra inscrições de famílias que indicaram ser existentes no formulário, mas cujo email não foi encontrado no Brevo. O badge na barra lateral indica quantas submissões pendentes existem.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3">Ações disponíveis</h3>
          <div className="flex flex-col gap-3 mb-4 pl-1">
            <p><strong>Verificar</strong> — o sistema volta a procurar o email no Brevo. Se entretanto o contacto existir (por exemplo, foi criado manualmente), a inscrição é processada normalmente e aparece na página Inscrições.</p>
            <p><strong>Notificar</strong> — envia um email à família a pedir que corrija o email ou se inscreva como nova família. A submissão passa para o separador &quot;Notificadas&quot;.</p>
            <p><strong>Descartar</strong> — elimina a submissão (usar para duplicados ou testes).</p>
          </div>
          <Tip>
            Se o email tiver um erro de digitação evidente, pode ser editado diretamente no cartão antes de verificar.
          </Tip>
        </section>

        {/* 4 ── Sessões ── */}
        <section id="sessoes">
          <h2 className="text-title-lg text-gray-900 mb-4">4. Sessões</h2>
          <p className="mb-4">
            A página Sessões mostra todas as sessões do mês, organizadas por data e turno (Manhã/Tarde). Apenas crianças com estado <StatusPill status="pago" label="Pago" /> aparecem.
          </p>
          <p className="mb-4">
            As sessões são criadas automaticamente quando uma inscrição passa para Pago, com base nas datas selecionadas pela família. Não é necessário criar sessões manualmente.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3">Filtros</h3>
          <div className="flex flex-col gap-2 mb-4 pl-1">
            <p><strong>Manhã / Tarde</strong> — filtrar por turno</p>
            <p><strong>Só fotos</strong> — toggle no canto superior direito, mostra apenas crianças com plano fotográfico</p>
            <p><strong>Pesquisa</strong> — procurar crianças por nome em todas as sessões</p>
          </div>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3 mt-6">Fotos prontas</h3>
          <p className="mb-3">
            Na tabela de cada sessão, a coluna <strong>Prontas</strong> permite marcar que as fotos de cada criança estão prontas para enviar. Clicar no círculo para marcar como pronto (fica verde) e clicar novamente para desmarcar.
          </p>
          <p className="mb-3">
            Apenas crianças com plano fotográfico têm este botão. Usar o filtro &quot;Só fotos&quot; para ver rapidamente o progresso.
          </p>
        </section>

        {/* 5 ── Presenças ── */}
        <section id="presencas">
          <h2 className="text-title-lg text-gray-900 mb-4">5. Presenças</h2>
          <p className="mb-4">
            A página Presenças permite marcar a presença das crianças em cada sessão, dia a dia.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3">Como usar</h3>
          <ol className="list-decimal list-inside flex flex-col gap-2 mb-4 pl-1">
            <li>Navegar entre datas com as setas ou clicando na data</li>
            <li>Expandir o turno (Manhã ou Tarde)</li>
            <li>Clicar no cartão de cada criança para marcar presença — fica verde quando presente</li>
            <li>Clicar novamente para desmarcar</li>
          </ol>

          <Tip>
            O turno da Manhã recolhe automaticamente depois das 13:00, para facilitar o acesso direto ao turno da Tarde.
          </Tip>

          <p className="mt-3">
            O filtro <strong>Só fotos</strong> funciona aqui da mesma forma que nas Sessões — mostra apenas crianças com plano fotográfico.
          </p>
        </section>

        {/* 6 ── Meses ── */}
        <section id="meses">
          <h2 className="text-title-lg text-gray-900 mb-4">6. Meses</h2>
          <p className="mb-4">
            A página Meses é onde se criam e gerem os meses disponíveis para inscrição.
          </p>

          <h3 className="text-body-lg font-semibold text-gray-900 mb-3">Ações</h3>
          <div className="flex flex-col gap-2 mb-4 pl-1">
            <p><strong>Criar</strong> — botão &quot;+&quot; para criar um novo mês</p>
            <p><strong>Arquivar</strong> — meses antigos podem ser arquivados. Continuam a aparecer no seletor de mês mas ficam marcados como inativos.</p>
            <p><strong>Reativar</strong> — um mês arquivado pode ser reativado se necessário</p>
            <p><strong>Exportar</strong> — exporta todas as inscrições do mês em formato CSV</p>
            <p><strong>Eliminar</strong> — só disponível para meses que não têm inscrições</p>
          </div>
        </section>

      </div>
    </div>
  );
}
