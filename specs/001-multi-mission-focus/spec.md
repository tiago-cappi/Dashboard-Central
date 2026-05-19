# Feature Specification: Sessão de Foco Multi-Missão (Cronômetro/Pomodoro)

**Feature Branch**: `001-multi-mission-focus`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Eu gostaria de adicionar a possibilidade de abrir o timer de cronômetro ou pomodoro e, antes de iniciar a cronometragem, poder adicionar uma lista com várias pequenas missões que eu pretendo completar durante a sessão de foco desse timer. Ou seja, seria um cronomêtro/pomodoro para múltiplas pequenas missões que serão feitas em paralelo ou em um curto intervalo de tempo. Para calcular o XP dessa sessão de foco de múltiplas missões, o usuário deve definir um nível de importância e dificuldade que ele considera antes de iniciar o timer para essas missões, sendo ambos um valor obrigatório. Após a conclusão do cronômetro/pomodoro, calcular o XP normalmente com a mesma fórmula que já é usada atualmente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sessão de foco multi-missão com importância e dificuldade definidas (Priority: P1)

O usuário abre o modal de foco, escolhe a modalidade do timer (cronômetro livre ou pomodoro), adiciona uma lista com várias pequenas missões que pretende executar em paralelo ou em sequência curta durante a sessão, define a importância (1–5) e a dificuldade (1–5) que representam o conjunto dessas mini-missões — ambas obrigatórias — e dispara o timer.

**Why this priority**: É o coração da funcionalidade. Sem essa configuração inicial, nada do resto se sustenta — ela define a granularidade da sessão e os parâmetros que alimentarão o cálculo de XP no final.

**Independent Test**: É testável de ponta a ponta abrindo o modal de foco em modo multi-missão, adicionando ≥ 2 mini-missões em texto livre, definindo importância e dificuldade, e confirmando que o timer só inicia quando ambos os valores estão preenchidos.

**Acceptance Scenarios**:

1. **Given** o modal de foco aberto em modo multi-missão sem mini-missões adicionadas, **When** o usuário tenta iniciar o timer, **Then** o sistema impede o início e sinaliza que pelo menos uma mini-missão é necessária.
2. **Given** uma lista com 3 mini-missões adicionadas e nenhum valor de importância/dificuldade definido, **When** o usuário tenta iniciar o timer, **Then** o sistema impede o início e sinaliza explicitamente que importância e dificuldade são obrigatórias.
3. **Given** lista de mini-missões preenchida e importância = 4, dificuldade = 3, **When** o usuário aciona "Iniciar", **Then** o timer começa a contar e a configuração da sessão (modo, mini-missões, importância, dificuldade, instante de início) fica persistida.
4. **Given** uma sessão de foco multi-missão em andamento, **When** o usuário reabre o modal de foco em outra aba/recarrega a página, **Then** a sessão retoma o tempo decorrido, a lista de mini-missões e os parâmetros sem perda.

---

### User Story 2 - Concluir a sessão e receber XP pelo conjunto (Priority: P1)

Ao final da sessão (parar manualmente no cronômetro, ou esgotar o ciclo de foco do pomodoro), o sistema calcula o XP da sessão usando a **mesma fórmula já em uso hoje** — `Math.round((elapsedMin × importance × difficulty) / 10)` — aplicada aos minutos efetivamente cronometrados e aos valores de importância/dificuldade escolhidos antes do início.

**Why this priority**: É o ciclo de recompensa que dá sentido à feature. Sem isso, a sessão multi-missão fica sem fechamento e desincentiva o uso.

**Independent Test**: É testável iniciando uma sessão com importância e dificuldade conhecidas, cronometrando um tempo conhecido (ex.: 25 min), encerrando e verificando que o XP gerado bate exatamente com `round((25 × imp × dif) / 10)`.

**Acceptance Scenarios**:

1. **Given** sessão multi-missão com importância = 5, dificuldade = 4, **When** o usuário encerra após 20 minutos cronometrados, **Then** o XP gerado é `round((20 × 5 × 4) / 10) = 40`.
2. **Given** sessão pomodoro 25/5 com importância = 3, dificuldade = 2, **When** o ciclo de foco se completa naturalmente, **Then** o XP gerado é `round((25 × 3 × 2) / 10) = 15`.
3. **Given** uma sessão multi-missão em andamento, **When** o usuário encerra a sessão antes de 1 minuto cronometrado, **Then** a sessão é descartada sem gerar XP nem registro permanente, mantendo a integridade do histórico.

---

### User Story 3 - Gerenciar mini-missões durante a sessão (Priority: P2)

Durante a sessão em andamento, o usuário pode marcar mini-missões como concluídas, reordená-las e adicionar/remover itens — sem que isso afete o cálculo de XP ao final (o XP depende apenas do tempo cronometrado e dos parâmetros fixados no início).

**Why this priority**: Aumenta a utilidade prática da lista durante a sessão, transformando-a em um checklist vivo, mas não bloqueia o MVP — a feature ainda entrega valor mesmo se a lista for somente leitura durante o timer.

**Independent Test**: É testável iniciando uma sessão com 4 mini-missões, marcando 2 como concluídas, adicionando uma nova mid-sessão e encerrando — o XP deve continuar dependendo apenas de tempo × importância × dificuldade.

**Acceptance Scenarios**:

1. **Given** sessão em andamento com 3 mini-missões, **When** o usuário marca uma como concluída, **Then** ela fica visualmente diferenciada (riscada/check) e o estado persiste mesmo se a página recarregar.
2. **Given** sessão em andamento, **When** o usuário adiciona uma nova mini-missão à lista, **Then** ela passa a constar na sessão atual sem alterar importância, dificuldade ou tempo já decorrido.
3. **Given** sessão encerrada, **When** o resumo final aparece, **Then** ele mostra quantas mini-missões foram marcadas como concluídas vs. pendentes, mas o XP independe desse número.

---

### User Story 4 - Registro histórico como Mission consolidada (Priority: P3)

Ao concluir uma sessão multi-missão, o sistema gera **uma única Mission consolidada** no histórico de Missions, representando todo o conjunto: a Mission criada herda a importância e a dificuldade da sessão, recebe o XP calculado pela fórmula, é marcada como `done`, e tem a lista de mini-missões (com seu status final) registrada como parte do seu detalhamento.

**Why this priority**: Aumenta o senso de progresso e mantém consistência com o histórico de Missions já existente, mas a feature funciona mesmo se este passo for adicionado depois (a sessão por si só já credita XP).

**Independent Test**: É testável concluindo uma sessão multi-missão e verificando que **uma única** Mission nova aparece no histórico de Missions, com o conjunto correto de campos herdados e o XP esperado — e que **nenhuma** Mission separada por mini-missão é criada.

**Acceptance Scenarios**:

1. **Given** uma sessão multi-missão recém-concluída de 30 min, importância = 4, dificuldade = 3, 5 mini-missões (3 marcadas como done, 2 pendentes), **When** o usuário consulta o histórico de Missions, **Then** existe **exatamente 1** nova Mission registrada com `importance=4`, `difficulty=3`, `focus_minutes=30`, `xp_gained=36`, `status='done'`, e a `description` contendo as 5 mini-missões com seus respectivos status.
2. **Given** a mesma sessão acima, **When** o usuário inspeciona o histórico, **Then** **nenhuma** Mission individual por mini-missão foi criada.

---

### Edge Cases

- O usuário fecha o modal sem encerrar a sessão: a sessão continua em andamento e pode ser retomada (mesmo comportamento da sessão de foco mono-missão atual).
- O usuário recarrega a página no meio da sessão: o estado é recuperado integralmente (tempo, lista, importância, dificuldade, modo).
- O usuário tenta iniciar uma sessão multi-missão enquanto já há uma sessão de foco (mono-missão ou multi-missão) ativa: o sistema impede e oferece encerrar/retomar a atual.
- Pomodoro: o que conta para o XP é apenas o tempo de **foco** (não os intervalos de descanso).
- Importância ou dificuldade fora da faixa 1–5: o sistema impede o início.
- Usuário define todas as mini-missões com texto vazio: o sistema trata cada item vazio como inválido e impede o início se nenhum item válido existir.
- Tempo cronometrado < 1 minuto: sessão descartada, sem XP nem registro (consistente com o tratamento já existente para sessões muito curtas).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que o usuário abra o modal de foco em um modo "multi-missão", distinto do modo de foco em missão única já existente.
- **FR-002**: O sistema MUST oferecer ao usuário a escolha entre cronômetro livre (stopwatch) e pomodoro como modalidade de contagem da sessão multi-missão.
- **FR-003**: O sistema MUST permitir que o usuário adicione uma lista com 1 ou mais mini-missões antes de iniciar o timer, sendo cada mini-missão um item textual curto descrito pelo próprio usuário.
- **FR-004**: O sistema MUST permitir remover e reordenar itens da lista de mini-missões antes do início da sessão.
- **FR-005**: O sistema MUST exigir, antes de iniciar o timer, que o usuário defina obrigatoriamente um valor de **importância** (escala 1–5) e um valor de **dificuldade** (escala 1–5) que se aplicam ao conjunto da sessão.
- **FR-006**: O sistema MUST impedir o início do timer enquanto importância, dificuldade ou ao menos uma mini-missão válida não estiverem definidas, exibindo feedback claro do motivo.
- **FR-007**: O sistema MUST iniciar a contagem do timer no instante em que o usuário confirma o início e MUST persistir o instante de início, modo, importância, dificuldade e lista de mini-missões para que a sessão sobreviva a recarregamentos da página.
- **FR-008**: O sistema MUST permitir, durante uma sessão em andamento, marcar mini-missões como concluídas, adicionar novas mini-missões e remover mini-missões pendentes, persistindo essas alterações.
- **FR-009**: O sistema MUST permitir que o usuário encerre manualmente uma sessão de cronômetro a qualquer momento; no modo pomodoro, MUST encerrar automaticamente ao final do ciclo de foco configurado.
- **FR-010**: O sistema MUST calcular o XP da sessão multi-missão usando exatamente a mesma fórmula da sessão de foco mono-missão hoje: `Math.round((elapsedMin × importance × difficulty) / 10)`, em que `elapsedMin` é o tempo de foco em minutos (sem incluir pausas/descansos do pomodoro) e `importance`/`difficulty` são os valores fixados antes do início.
- **FR-011**: O sistema MUST creditar o XP gerado ao perfil do usuário pelo mesmo caminho de acumulação que a sessão mono-missão atual utiliza, mantendo paridade com o sistema de progressão existente.
- **FR-012**: O sistema MUST descartar a sessão sem gerar XP nem registro de histórico quando o tempo de foco for inferior a 1 minuto, consistente com o tratamento existente.
- **FR-013**: O sistema MUST registrar a sessão multi-missão concluída no histórico como **um único registro agregado** (não um registro por mini-missão), contendo: modo, tempo total de foco, importância, dificuldade, lista das mini-missões com status final, XP gerado e timestamps de início/fim.
- **FR-014**: O sistema MUST impedir que duas sessões de foco (mono-missão ou multi-missão) coexistam ativas no mesmo perfil, oferecendo encerrar/retomar a atual antes de iniciar a nova.
- **FR-015**: O sistema MUST exibir, durante a sessão em andamento, o tempo decorrido, o modo, o status atual da lista de mini-missões (concluídas/pendentes) e os valores de importância e dificuldade da sessão.
- **FR-016**: Ao encerrar a sessão multi-missão (com tempo de foco ≥ 1 minuto), o sistema MUST gerar **uma única Mission real consolidada** no sistema de Missions, representando todo o conjunto da sessão — nunca uma Mission por mini-missão. Essa Mission consolidada:
  - HERDA exatamente os valores de `importance` e `difficulty` definidos para a sessão;
  - Recebe `status = 'done'`, `focus_minutes = <tempo total de foco>` e `xp_gained = <XP calculado pela fórmula>`;
  - Recebe `title` derivado da sessão (ex.: rótulo curto da sessão multi-missão) e `description` contendo a lista textual completa das mini-missões com seus status finais (concluída/pendente), para fins de registro histórico;
  - Recebe `completed_at = <instante de fim da sessão>`;
  - Existe **apenas para fins de registro histórico** — não passa pelo fluxo normal de criação de Mission (inbox → active → done).
- **FR-017**: As mini-missões da sessão multi-missão MUST ser **apenas texto livre inline**, criadas exclusivamente dentro da sessão. O sistema NÃO oferece, neste escopo, a possibilidade de selecionar Missions já existentes (do inbox/active) para incluir na lista da sessão.

### Key Entities *(include if feature involves data)*

- **MultiMissionFocusSession**: representa uma sessão de foco com múltiplas mini-missões. Atributos-chave: id, modo (`stopwatch` | `pomodoro`), configuração do pomodoro (quando aplicável), importance (1–5), difficulty (1–5), instante de início, instante de fim, tempo total de foco em minutos, XP gerado, status (`active` | `completed` | `discarded`), referência ao perfil do usuário, referência à Mission consolidada gerada ao final (quando aplicável).
- **MiniMission**: item leve pertencente a uma `MultiMissionFocusSession`, criado **exclusivamente por texto livre inline** dentro da sessão. Atributos-chave: id, descrição textual, ordem na lista, status (`pending` | `done`), instante de criação, instante de conclusão (quando marcada). **Não é** uma `Mission` do sistema principal — vive apenas sob a sessão e nunca é promovida individualmente.
- **Mission consolidada (existente, derivada)**: ao encerrar a sessão com tempo ≥ 1 min, o sistema cria **uma única** Mission real (entidade existente em `useMissionMutations`) representando todo o conjunto. Herda `importance` e `difficulty` da sessão, `status='done'`, `focus_minutes` e `xp_gained` calculados, `description` com a lista das mini-missões e seus status finais, `completed_at` no instante de fim. Existe apenas para registro histórico.
- **Profile (existente)**: o perfil do usuário recebe o XP e armazena a referência à sessão de foco ativa, herdando o mesmo mecanismo da sessão mono-missão atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue abrir o modal de foco, adicionar 3 mini-missões, definir importância/dificuldade e iniciar o timer em menos de 30 segundos.
- **SC-002**: 100% das sessões com tempo ≥ 1 minuto geram um XP que bate exatamente com a fórmula `round((minutos × importância × dificuldade) / 10)`, sem desvio, em verificação automatizada.
- **SC-003**: 100% das tentativas de iniciar a sessão sem importância, sem dificuldade ou sem nenhuma mini-missão válida são bloqueadas com feedback explícito.
- **SC-004**: 100% das sessões em andamento sobrevivem a um recarregamento de página com tempo decorrido, lista e parâmetros íntegros.
- **SC-005**: Nenhum perfil tem mais de uma sessão de foco ativa simultaneamente (verificável por consulta ao estado do perfil).
- **SC-006**: Em uma amostra de 10 sessões reais de uso, o usuário consegue concluir a sessão e ver o registro agregado no histórico em ≤ 5 segundos após o encerramento.

## Assumptions

- A fórmula de XP a ser reutilizada é exatamente a `sessionXp(elapsedMin, entity) = Math.round((elapsedMin × importance × difficulty) / 10)` já presente no contexto de foco existente.
- A escala de importância e dificuldade adotada é **1–5 inteiros**, mantendo paridade com a escala já usada por Missions e pela sessão de foco mono-missão.
- A sessão multi-missão é **separada** da sessão de foco mono-missão existente: ambas reutilizam o mesmo modal/UX de timer, mas não compartilham a mesma entidade de persistência (uma sessão multi-missão não está atrelada a uma Mission específica).
- O tempo de foco do pomodoro que conta para o XP é apenas o tempo "ativo de foco" do ciclo (não inclui intervalos de descanso), seguindo o padrão usual da técnica pomodoro.
- O fluxo de retomada de sessão em andamento (após reload/troca de aba) usa o mesmo mecanismo de persistência já presente no `FocusContext` atual.
- Tempo de foco mínimo para gerar XP/registro é 1 minuto, consistente com o tratamento já existente para sessões muito curtas.
- A feature não introduz nova escala, nova fórmula nem nova categoria de XP — apenas uma nova **forma de agrupar** o esforço dentro de uma sessão.
- Ao encerrar, a sessão multi-missão é registrada no histórico de Missions como **uma única** Mission consolidada (FR-016) — nunca uma Mission por mini-missão. Esse registro é para fins de histórico/análise, e não passa pelo fluxo de inbox/active das Missions criadas manualmente.
- Mini-missões são **exclusivamente** texto livre inline (FR-017). Selecionar Missions já existentes para participar da sessão está fora deste escopo.

## Dependencies

- Sistema de Focus Session atual (`FocusContext` / `FocusModal` em `src/features/forestos/`) — será estendido (ou terá variação criada) para suportar o novo modo.
- Sistema de XP/profile do usuário — receberá o XP gerado pela sessão multi-missão pelo mesmo caminho da sessão mono-missão.
- Sistema de Missions (`useMissionMutations`) — reutilizado para criar a **Mission consolidada única** ao final da sessão (FR-016), com os campos herdados da sessão.
