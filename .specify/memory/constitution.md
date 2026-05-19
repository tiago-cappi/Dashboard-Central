# Central de Dados — Grande Estratégia · Constituição

> Dashboard e central de comando unificada com estética de *grand strategy*
> (Europa Universalis V + Victoria 3), construída em React + Vite + Supabase.
> Esta constituição descreve os princípios já vigentes no projeto e governa
> toda evolução futura.

## Princípios Fundamentais

### I. Fidelidade ao Sistema Visual (INEGOCIÁVEL)

Toda visualização, componente ou tela DEVE derivar sua identidade de
`Central de Comando.html` e de `prompt-dashboard-grande-estrategia.md`, com
implementação ancorada nos *design tokens* de `src/styles/grand-strategy.css`.

- Cores, fontes, molduras e ornamentos vêm das variáveis CSS (`--paper-*`,
  `--gold*`, `--wine*`, `--navy*`, etc.) e das classes do design system
  (`.panel`, `.panel-header`, `.font-cinzel`, `.num`, `.smallcaps`).
- É proibido introduzir estética de "SaaS moderno": cantos muito
  arredondados, sombras Material/neumorphism, gradientes neon/glass,
  tipografia sans-serif moderna ou emojis coloridos como ícones.
- Densidade informacional e ornamentação têm prioridade sobre minimalismo;
  ícones são SVG monocromáticos em tom de ouro velho ou marrom-tinta.

### II. Planejamento Antes de Visualização

Toda solicitação de criação ou modificação de visualização, gráfico, tabela
ou elemento da dashboard DEVE ser precedida de um plano em *bullet points*
objetivos, com sugestões da melhor abordagem e dos elementos necessários
para uma entrega completa e funcional.

- Quando houver ambiguidade, fazer perguntas abertas de múltipla escolha ou
  multisseleção, no nível de um especialista em Dashboards e Frontend.
- Nenhum código de visualização é escrito antes do plano ser apresentado.

### III. Arquitetura Modular por Domínio

O código é organizado por responsabilidade e domínio, mantendo hierarquia
previsível e unidades coesas e reutilizáveis.

- `src/features/<domínio>/` agrupa componentes, `hooks/` e `lib/` do domínio;
  `src/components/layout` e `src/components/ornaments` para UI compartilhada;
  `src/pages` para rotas; `src/lib` para infraestrutura transversal
  (Supabase, Auth); `src/styles` para o sistema visual.
- Padrão de dados estabelecido: hooks de leitura `useX` retornam
  `{ data, loading, error, refetch }`; mutações ficam em `useXMutations` e
  disparam `notify()` para revalidação global via `FocusContext`.
- Cada arquivo expõe uma unidade única; arquivos longos com múltiplas
  responsabilidades devem ser quebrados em módulos menores.

### IV. Reaproveitamento e Sem Código Legado

Antes de criar função, componente ou utilitário, verificar se já existe algo
equivalente ou adaptável e reutilizá-lo; estender ou parametrizar em vez de
duplicar.

- Ao substituir uma funcionalidade, o código legado correspondente é
  removido por completo — sem versões antigas, comentadas ou duplicadas
  convivendo com a nova.
- Duplicação encontrada durante a implementação DEVE ser sinalizada com
  sugestão de consolidação.

### V. Tratamento Explícito de Erros e Estado

Erros são tratados de forma explícita e visível; nada de `catch` vazio ou
silencioso.

- A camada de dados (Supabase) nunca derruba o app por configuração
  ausente: o estado de erro é propagado pelos hooks e refletido na UI.
- Estados de `loading`, `error` e vazio são tratados explicitamente em todo
  consumo de dados assíncronos.

## Restrições Técnicas

- **Stack fixa:** React 18, Vite 5, React Router 6, Tailwind CSS 3,
  `@supabase/supabase-js` 2. Novas dependências pesadas exigem justificativa
  explícita (princípios KISS/YAGNI) e aprovação antes da adoção.
- **Supabase:** cliente único em `src/lib/supabase.js`, com schema definido
  por `VITE_FORESTOS_SCHEMA`. Autenticação centralizada em
  `AuthContext`/`useAuth`. Segredos apenas via variáveis `VITE_` em `.env`
  (nunca commitados); `.env.example` é a referência.
- **Idioma:** todo código de domínio, comentários e textos de UI em
  Português do Brasil, com ortografia e acentuação corretas.
- **Build/exec:** `npm run dev` (porta 5173), `npm run build`,
  `npm run preview`. Saída de build em `dist/` não é versionada como fonte.

## Fluxo de Desenvolvimento

- **Escopo cirúrgico:** alterar apenas o que faz parte da modificação
  solicitada; melhorias fora de escopo são propostas separadamente, não
  aplicadas silenciosamente.
- **Spec-Kit:** mudanças não triviais seguem o fluxo
  `constitution → specify → plan → tasks → implement`; skills opcionais
  (`clarify`, `analyze`, `checklist`) usadas quando reduzem risco.
- **Checklist antes de finalizar qualquer tarefa:**
  1. Código legado substituído foi removido por completo.
  2. Nada fora do escopo foi alterado.
  3. Não há duplicação com código já existente.
  4. A entrega respeita o sistema visual (Princípio I).

## Governança

Esta constituição prevalece sobre quaisquer outras práticas. As instruções
operacionais de runtime permanecem em `CLAUDE.md`, que é subordinado a este
documento e não pode contradizê-lo.

- Toda revisão de mudança DEVE verificar conformidade com os cinco
  princípios e o checklist de finalização.
- Complexidade adicional (nova dependência, nova camada, nova abstração)
  DEVE ser justificada explicitamente; na ausência de justificativa,
  prevalece a opção mais simples.
- Emendas requerem: descrição da mudança, justificativa e impacto nos
  artefatos do Spec-Kit, com versionamento semântico abaixo.



## Observações

- Ao final de cada uma das etapas de criação de uma nova "spec" através das Skills próprias do SpecKit, diga-me resumidamente o conteúdo escrito no arquivo ".md" que foi gerado ao final da execução da Skill.


**Versão**: 1.0.0 | **Ratificada**: 2026-05-18 | **Última emenda**: 2026-05-18