# Diretrizes de Proteção de Dados de Operação Real (BJJCRON)

1. **Preservação Extrema dos Dados Reais**:
   - NUNCA redefinir, alterar ou apagar os dados reais cadastrados pelos usuários (alunos, turmas, frequências, pagamentos, configurações da academia) durante testes ou edições de código.
   - NUNCA executar rotinas automáticas de limpeza ou substituição por dados de testes (*mock data*) quando já existirem registros no `localStorage` ou no banco de dados.

2. **Isolamento de Testes e Homologação**:
   - Todas as modificações de código e testes internos devem respeitar os registros reais salvos.
   - Recursos de teste e homologação devem permanecer estritamente opcionais e isolados, sem impactar a base real de alunos ou os relatórios financeiros operacionais.
