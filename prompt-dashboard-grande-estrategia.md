# Prompt para Claude — Protótipo de Dashboard Unificada (estética EU5 + Victoria 3)

Crie um **protótipo de alta fidelidade** de uma dashboard e central de controle unificada, em **HTML único com Tailwind via CDN** (ou React em artefato único, sua escolha — o que ficar mais rico visualmente). O protótipo deve ser visualmente **denso, ricamente decorado e funcional**, evocando um "centro de comando de grande estratégia" aplicado a dados corporativos. Use **dados completamente fictícios** (números, nomes, séries temporais inventadas) — o foco aqui é puramente design e frontend.

---

## 1. Direção visual

A inspiração principal é **Europa Universalis V**, com elementos de clareza informacional emprestados de **Victoria 3**. **Não é um pastiche literal** dos jogos — é um dashboard moderno e profissional que **canaliza a linguagem visual** desses jogos de grande estratégia da Paradox: densidade de informação organizada, hierarquia visual clara via molduras e divisórias, ícones temáticos, tipografia com personalidade, e aquela sensação de "mapa de gabinete renascentista" que faz o jogador sentir que está tomando decisões importantes.

### Paleta — modo claro, "pergaminho de gabinete"

- **Fundo principal:** creme envelhecido (`#f4ead5` → `#ebe0c3`), com textura sutil de papel/pergaminho (gradiente radial muito leve, ou ruído via SVG filter `feTurbulence` com baixa opacidade)
- **Painéis (cards):** creme mais claro (`#faf3e0`) com **bordas duplas** — uma linha externa fina em ouro velho (`#a88a3d`) e uma interna mais escura (`#5b4423`), separadas por 2-3px
- **Cabeçalhos de seção:** faixa em vinho profundo (`#6b1f2a`) ou azul-marinho heráldico (`#1f3a5f`) com texto em creme/dourado
- **Acentos decorativos:** ouro velho (`#c9a14a`), verde-musgo (`#4a6b3a`), vinho (`#7a2230`)
- **Texto:** marrom-tinta (`#3a2a18`) para corpo, preto sépia (`#1f1408`) para títulos
- **Cores de dados (gráficos):** paleta sóbria de 6 tons — vinho, azul-marinho, ouro velho, verde-musgo, terracota, ardósia (`#7a2230`, `#1f3a5f`, `#c9a14a`, `#4a6b3a`, `#a8553a`, `#4a5568`)
- **Estados:** positivo em verde-musgo, negativo em vinho, alerta em ouro velho — **nunca** em verde-neon ou vermelho-cereja modernos

### Tipografia (importe do Google Fonts no `<head>`)

- **Títulos principais:** `Cinzel` ou `Cormorant Garamond`, em UPPERCASE, com letter-spacing generoso (0.08em a 0.15em)
- **Subtítulos e rótulos de seção:** `EB Garamond` em *small caps* (`font-variant: small-caps`)
- **Corpo de texto:** `Lora` ou `Crimson Text`, regular 400
- **Números e dados tabulares:** `IBM Plex Mono` peso 500, com `font-variant-numeric: tabular-nums`, alinhados à direita
- Use **versalete** (small caps) em rótulos de tabelas e cabeçalhos de coluna

### Bordas, molduras e ornamentação

Esse é o elemento que mais "vende" a estética. Não economize aqui:

- Cards principais devem ter **molduras duplas** com cantos levemente decorados (pode ser via `border-image` SVG ou pseudo-elementos `::before`/`::after` com flourishes nos quatro cantos)
- Use **divisórias ornamentais** entre seções: uma linha horizontal fina em ouro velho com um pequeno ornamento central (losango, flor-de-lis estilizada, ou um diamante simples — desenhe em SVG inline)
- Headers de painéis principais ganham uma **faixa colorida** (vinho ou azul-marinho) com texto em creme, e uma fina linha dourada acima e abaixo
- Botões importantes têm aparência de **selo ou medalhão**: borda dupla, leve sombra interna, hover suaviza para um tom mais escuro
- Adicione **brasão/escudo decorativo** no canto superior esquerdo do cabeçalho principal (SVG inline, geometria simples — escudo dividido em quadrantes com símbolos abstratos)

---

## 2. Estrutura e layout

Layout em **três zonas verticais**, ocupando viewport inteira (mínimo 1440x900):

### A. Topbar (altura ~64px)

Faixa horizontal escura (madeira escura `#3a2818` ou vinho profundo) com ornamentos dourados nas extremidades. Contém, da esquerda para a direita:

1. **Brasão/logo decorativo** (SVG inline) + nome da central em Cinzel uppercase: *"CENTRAL DE COMANDO — GABINETE EXECUTIVO"*
2. **Cluster de indicadores-chave** (estilo "recursos" do EU5): 6 a 8 mini-widgets, cada um com ícone SVG monocromático em ouro + número em fonte mono. Exemplos fictícios:
   - 💰 Tesouraria: `R$ 2.847.392`
   - 📈 Receita Mensal: `+R$ 184.230` (verde-musgo)
   - 📉 Despesas: `-R$ 142.110` (vinho)
   - 👥 Colaboradores Ativos: `1.247`
   - ⚙️ Operações em Curso: `23`
   - 🛡️ Estabilidade do Sistema: `94%`
   - ⏱️ Tempo Real: relógio ao vivo (atualize com JS)
   - 🔔 Alertas: `3` (badge vermelho)
3. **Controles de tempo/atualização** à direita (estilo controles de velocidade do EU5): botões de pausa/play/avanço, e um **datepicker** em estilo de pergaminho indicando "data atual" do dashboard

### B. Sidebar esquerda (largura ~240px)

Painel lateral em creme escuro com **menu de navegação categorizado**, no estilo do menu radial/lateral dos jogos Paradox. Cada item é um botão grande com ícone SVG à esquerda + label em small caps + sublabel descritivo. Categorias sugeridas:

- **Visão Geral** (selecionado por padrão)
- **Tesouraria & Finanças**
- **População & Recursos Humanos**
- **Operações & Produção**
- **Comércio & Mercados**
- **Diplomacia & Parcerias**
- **Tecnologia & Inovação**
- **Decretos & Políticas**
- **Inteligência & Relatórios**
- **Mapa Operacional**

O item ativo recebe destaque: faixa vinho à esquerda, fundo levemente mais claro, ornamento dourado.

### C. Área principal (centro + sidebar direita opcional ~320px)

A **área central** é a Visão Geral. Deve ser uma grade densa de cards/painéis ornamentados, organizados em **3 colunas** com alturas variáveis (masonry/grid). Cada painel tem cabeçalho com faixa colorida + título em Cinzel, corpo com dados, e ocasionalmente um rodapé com mini-ação. Inclua os seguintes painéis (mínimo 9, gere mais se couber):

#### Painéis obrigatórios

1. **Resumo do Tesouro** (card grande, 2 colunas de largura): gráfico de área empilhada (receitas vs despesas dos últimos 12 meses) usando Recharts/Chart.js ou SVG manual. Linha de tendência em ouro velho. Abaixo, mini-tabela com 4 categorias de receita e 4 de despesa, com valores e variação percentual em pequenas setas.

2. **Distribuição Populacional** (card médio): gráfico de pizza estilo Vic3 — segmentos coloridos com cores sóbrias, rótulos externos com linhas finas até cada fatia. Categorias fictícias tipo: *Especialistas, Operadores, Aprendizes, Liderança, Consultores, Auxiliares*.

3. **Mapa Operacional** (card grande, ocupa 2-3 colunas): SVG de um mapa estilizado — pode ser um mapa-múndi simplificado ou um mapa abstrato de regiões/divisões internas. Use cores de pergaminho com regiões coloridas indicando "status" (verde-musgo = saudável, ouro = atenção, vinho = crítico). Pequenos ícones indicam unidades/operações em locais específicos. Adicione legenda decorativa no canto.

4. **Pendências do Gabinete** (card médio, estilo "decisões pendentes" do EU5): lista de 4-6 cards menores em formato de "carta" ou "decreto", cada um com ícone temático, título em Cinzel, descrição curta, e dois botões (Aprovar/Adiar) em estilo medalhão. Exemplos: *"Renovação do Contrato com Fornecedor A"*, *"Aumento de Quadro no Setor Norte"*, *"Revisão Trimestral de Política Comercial"*.

5. **Indicadores de Estabilidade** (card médio): 4-6 barras horizontais ornamentadas (estilo "modificadores" do EU5) com rótulo, valor numérico e barra preenchida em cor de status. Exemplos: *Moral Operacional 87%, Eficiência Logística 73%, Satisfação Interna 91%, Risco Externo 22%*.

6. **Linha do Tempo de Eventos** (card largo, parte inferior): timeline horizontal com marcos dos últimos 30/90 dias. Cada evento é um pino vertical com ícone, data e label curto. Use cores diferentes para tipos de evento (financeiro, operacional, diplomático).

7. **Ranking de Unidades/Setores** (card médio): tabela densa estilo "ledger" — 6-8 linhas com colunas: nome do setor, produção, eficiência, tendência (sparkline mini em SVG), status. Linhas zebradas em tons sutis de creme.

8. **Câmaras de Decisão / Conselhos** (card pequeno): 3-4 "personagens" fictícios do gabinete representados como retratos circulares (use placeholders em SVG — silhuetas estilizadas), com nome, cargo, e mini-stats de "afinidade" e "influência" em barras pequenas.

9. **Alertas e Notificações** (card lateral fixo, opcional na sidebar direita): lista vertical de 5-7 alertas, cada um com ícone de severidade, título, timestamp, e ação rápida. Estilo similar aos alertas do topo da tela do EU5.

#### Sidebar direita (opcional mas recomendada)

Painel mais estreito com:
- **Calendário do mês** estilizado (estilo pergaminho)
- **Metas trimestrais** com 3 barras de progresso ornamentadas
- **Feed de notícias internas** — 3-4 cards mini estilo "evento" com ícone e texto curto

---

## 3. Interatividade e detalhes técnicos

- **Hovers:** todos os cards e botões devem ter estado hover sutil — leve elevação via box-shadow quente (sépia, não preto puro), e brilho dourado nas bordas
- **Tooltips:** valores numéricos importantes têm tooltip ao passar o mouse, em estilo "tooltip de pergaminho" (fundo creme, borda dourada, fonte serifa)
- **Sparklines** nos rankings: SVG manual, linha simples em vinho ou azul-marinho
- **Animações de entrada:** cards aparecem com fade-in escalonado (stagger de 50ms) ao carregar
- **Relógio ao vivo na topbar:** atualize com `setInterval`
- **Não use ícones genéricos do Lucide/Heroicons puros** — ou estilize-os fortemente (cor ouro velho, sem gradientes modernos), ou desenhe ícones SVG inline customizados com aparência de gravura (linhas finas, simbolismo simples: balança, livro, espada estilizada, engrenagem, escudo, pena, moeda, torre)

---

## 4. O que evitar (importante)

- ❌ Cantos super arredondados (use no máximo `rounded-sm`, idealmente cantos retos ou levemente chanfrados)
- ❌ Sombras escuras estilo Material Design ou neumorphism
- ❌ Gradientes modernos vibrantes (pastel, neon, glassmorphism)
- ❌ Emojis coloridos como ícones — use SVG monocromático em ouro velho ou marrom-tinta
- ❌ Tipografia sans-serif moderna (Inter, Roboto, etc.) em qualquer lugar
- ❌ Paleta de "SaaS moderno" (azul-roxo, fundo branco puro `#fff`)
- ❌ Aparência de jogo literal — não desenhe pixels, não use fontes góticas exageradas, não imite a UI do jogo pixel a pixel; **canalize a linguagem, não copie**

---

## 5. Entregável esperado

Um **único arquivo HTML auto-contido** (com Tailwind via CDN, Google Fonts via `<link>`, e Recharts/Chart.js via CDN se necessário), pronto para abrir no navegador. Todos os dados são fictícios mas plausíveis e consistentes (datas em ordem, percentuais que somam 100%, etc.). O resultado deve fazer o usuário sentir que está olhando para o **gabinete de comando de uma nação renascentista**, mas para uma operação corporativa moderna.

Densidade > minimalismo. Decoração > flatness. Caráter > genérico.
