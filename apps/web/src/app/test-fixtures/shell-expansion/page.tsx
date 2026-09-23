import { notFound } from 'next/navigation'

import { PageFrame } from '@curiofold/ui'

import { ApplicationShell } from '../../(product)/application-shell'
import { assertE2eFixturesEnabled } from '../../../testing/e2e-story'

export default function ShellExpansionFixturePage() {
  try {
    assertE2eFixturesEnabled()
  } catch {
    notFound()
  }

  return (
    <ApplicationShell
      activeNavigation="discover"
      labels={{
        account: 'Definições da conta pessoal',
        collections: 'Coleções cuidadosamente selecionadas',
        discover: 'Descobrir novas curiosidades',
        library: 'A minha biblioteca permanente',
        progress: 'Progresso de leitura detalhado',
        search: 'Pesquisar todas as histórias',
        skipToContent: 'Saltar diretamente para o conteúdo principal',
      }}
    >
      <PageFrame>
        <h1>Interface expansion fixture</h1>
        <p>
          This route deliberately uses long Portuguese labels to verify reflow,
          focus order, touch reachability, and navigation resilience.
        </p>
      </PageFrame>
    </ApplicationShell>
  )
}
