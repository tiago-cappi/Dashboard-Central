Baseie-se totalmente no Design, estilo, cores e fontes do arquivo 'Central de Comando.html' e no Prompt 'prompt-dashboard-grande-estrategia' para criação da Dashboard e da implementação de qualquer visualização de dados nessa Dashboard.

Sempre que eu solicitar a criação ou modificação de alguma visualização, gráfico, tabela ou qualquer outro elemento da Dashboard, sempre crie um plano com as suas sugestões de qual a melhor maneira de fazer o que está sendo solicitado e quais elementos são necessários implementar para que a nova solicitação seja implementada de maneira mais completa e funcional possível. Crie esse plano em Bullet Points que sejam objetivos e vão direto ao ponto. Pode criar quantos Bullet Points forem necessários caso suas sugestões e ideias sejam extensas. 



Quando necessário, faça perguntas abertas de múltipla escolha ou de seleção de várias opções que um especialista em Dashboards e Design Frontend faria. 


# Instruções do Projeto

## Modificações no código
- Ao modificar uma funcionalidade ou componente, **remova completamente o código legado correspondente**. Não deixe versões antigas, comentadas ou duplicadas convivendo com a nova.
- Altere **apenas** o que faz parte da modificação solicitada. Não toque em código fora do escopo, mesmo que pareça melhorável — proponha separadamente se necessário.

## Reaproveitamento (Clean Code)
- Antes de criar qualquer função, componente ou utilitário novo, **verifique se já existe algo equivalente ou adaptável no projeto**. Reutilize sempre que possível.
- Prefira estender ou parametrizar o que existe em vez de duplicar lógica semelhante. Evite DRY violations.
- Se encontrar duplicação ao implementar algo, sinalize e sugira consolidação.

## Boas práticas
- Siga os princípios **SOLID**, **DRY**, **KISS** e **YAGNI**.
- Nomes descritivos para variáveis, funções e arquivos. Sem abreviações obscuras.
- Funções curtas, com responsabilidade única. Evite efeitos colaterais inesperados.
- Trate erros de forma explícita; nada de `catch` vazio ou silencioso.
- Respeite as convenções e o estilo já estabelecidos no projeto (lint, formatter, padrões existentes).

## Organização
- **Estrutura de pastas:** agrupe arquivos por domínio/responsabilidade (ex.: `components/`, `services/`, `utils/`, `hooks/`, `types/`). Mantenha hierarquia clara e previsível.
- **Modularidade:** cada arquivo deve expor uma unidade coesa e reutilizável. Funcionalidades comuns viram módulos compartilhados, não cópias espalhadas.
- Evite arquivos longos com múltiplas responsabilidades — quebre em módulos menores quando crescer demais.

## Antes de finalizar qualquer tarefa
1. Confirme que o código legado substituído foi removido.
2. Confirme que nada fora do escopo foi alterado.
3. Confirme que não há duplicação com código já existente.



<!-- SPECKIT START -->

Sempre leia o arquivo ".specify\memory\constitution.md" que contém a base e todas as regras que este projeto deve seguir em todas as etapas e implementações.

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
`specs/002-controle-financas/plan.md` (feature: Controle de Finanças).
<!-- SPECKIT END -->
