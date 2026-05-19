# Quickstart — Controle de Finanças

Setup e validação manual da feature (não há test runner no projeto;
verificação segue os cenários de aceitação da spec — KISS/YAGNI).

## 1. Pré-requisitos

- Stack já instalada (`npm install` na raiz). Nenhuma dependência nova.
- Acesso ao projeto Supabase usado pela dashboard.

## 2. Banco de dados

1. Criar o schema `financas` e as 7 tabelas conforme `data-model.md`
   (migração SQL gerada na fase de implementação).
2. Em **Supabase → Project Settings → API → Exposed schemas**, adicionar
   `financas` (senão o PostgREST devolve 404).
3. Rodar o seed de categorias sugeridas (FR-009) via `seedDefaults()`.

## 3. Variáveis de ambiente

Adicionar ao `.env` (referência em `.env.example`):

```env
VITE_FINANCAS_SCHEMA=financas
```

## 4. Subir o app

```bash
npm run dev   # http://localhost:5173
```

Login com a conta existente. No menu lateral ("Câmaras do Gabinete"), o
item **Tesouraria & Finanças** deixa de estar desabilitado e leva a
`/financas`.

## 5. Roteiro de validação (mapeado às User Stories)

| Passo | Ação | Esperado | Cobre |
|-------|------|----------|-------|
| 1 | Criar receita e despesa (data, valor, categoria, descrição) | Aparecem na lista; cartões de receita/despesa/saldo atualizam < 1s | US1, SC-001, SC-005 |
| 2 | Editar valor e excluir um lançamento | Indicadores recalculam sem reload | US1 |
| 3 | Filtrar por mês/tipo/categoria/busca | Tabela e totais respeitam filtro | US1 |
| 4 | Abrir painel do mês corrente | Cartões + evolução diária + donut por categoria + top 5 visíveis sem rolar | US2, SC-002 |
| 5 | Clicar numa categoria do donut / célula do heatmap | Lista filtra por categoria/mês | US2/US3 (FR-017, FR-022a) |
| 6 | Inserir ~30 dias de dados; abrir composição | Maior categoria identificável em < 1 min | SC-003 |
| 7 | Com ≥3 meses: ver histórico, alternar mensal/anual, comparar 2 períodos | Variação % por categoria visível < 2 min | US3, SC-004 |
| 8 | Heatmap mês×categoria (12 meses) | Sazonalidade visível; hover mostra valor | US3 (FR-022) |
| 9 | Criar categoria + subcategoria; tentar excluir categoria com lançamentos | Exclusão exige realocação | US4 (FR-010/011) |
| 10 | Criar recorrência mensal; navegar p/ mês futuro | Ocorrência aparece como **prevista** sem nova digitação | US5 (FR-013) |
| 11 | Editar/encerrar a recorrência | Só projeções futuras mudam; passado intacto | US5 (FR-014) |
| 12 | Esperar/data passar de lançamento previsto | Vira **realizado** e entra no saldo; marcar "não confirmado" reverte | FR-019a/b/c |
| 13 | Definir orçamento por categoria; acumular gasto | Barra muda em 80% e 100% | US6 (FR-023) |
| 14 | Criar meta; registrar 2 aportes; criar 2ª meta | Acumulado/projeção por meta, isoladas entre si | US6, Clarif. Q1 |
| 15 | Com ≥3 meses: abrir Insights | Anomalia ≥25%, conquista 3 meses, alerta de recorrência ausente | US7 (FR-025) |
| 16 | Navegar ForestOS e voltar | Nenhum impacto cruzado entre domínios | SC-006 (FR-002) |
| 17 | Mês sem lançamentos | Estado vazio coerente, sem gráfico quebrado | Edge Cases (FR-027) |

## 6. Critérios de aceite do plano

- [ ] Nenhuma dependência npm nova adicionada
- [ ] `src/features/financas/` autocontido; sem import de `forestos`/`FocusContext`
- [ ] Toda viz em SVG com tokens *grand strategy*
- [ ] Estados loading/erro/vazio explícitos em todos os painéis
- [ ] ForestOS inalterado (apenas `App.jsx` + `Sidebar.jsx` + `supabase.js` tocados fora do domínio)
