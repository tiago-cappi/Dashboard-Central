# Spec-Kit para mudanças pequenas — guia de níveis

**Princípio base:** SDD (spec-driven development) = intenção escrita antes do
código. O tamanho do artefato deve ser proporcional ao tamanho da mudança.
As skills do spec-kit são independentes — é possível entrar em qualquer ponto
do fluxo.

## Nível 1 — Trivial

Exemplos: cor, texto, espaçamento, bug pontual.

- Não usar spec-kit.
- Plano em bullet points (regra do `CLAUDE.md`) já é a "mini-spec".
- Registro vive na conversa + no commit.

## Nível 2 — Pequena com lógica/decisão

Exemplos: novo card, novo hook, alterar um cálculo.

- Fluxo colapsado: `/speckit-specify` (escopo apertado) → `/speckit-implement`.
- Pular `/speckit-plan` e `/speckit-tasks`.
- Opcional: `/speckit-checklist` antes de implementar.

## Nível 3 — Feature grande

Exemplos: nova página, novo domínio, integração nova.

- Fluxo completo: `specify → (clarify) → plan → tasks → (analyze) → implement`.

## Regra de decisão rápida

| Sinal | Nível |
|---|---|
| Sem decisão de arquitetura, 1 arquivo, reversível | 1 — sem spec-kit |
| Toca 2-4 arquivos, há escolha de design, "como" é óbvio | 2 — `specify` + `implement` |
| Múltiplos domínios, contratos de dados novos, ambiguidade real | 3 — fluxo completo |

## Valor mínimo do SDD

Registrar a intenção em `specs/` antes de codar, nem que seja um parágrafo
(Nível 2+). No Nível 1, conversa + commit bastam.
