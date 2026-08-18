# BJJCRON — Sistema SaaS Multiempresa de Gestão de Academias de Jiu-Jitsu

O **BJJCRON** é uma plataforma SaaS (*Software as a Service*) de nível corporativo projetada para academias, equipes e professores de Jiu-Jitsu Brasileiro (BJJ). Construído com foco em **alta escalabilidade**, **segurança (RBAC / JWT / LGPD)** e **experiência de usuário profissional (UX moderna)**.

---

## 🏗️ 1. Arquitetura do Sistema & Stack Tecnológica

O sistema foi estruturado seguindo princípios de **Clean Code**, **SOLID**, **Repository Pattern**, **Separation of Concerns (SoC)** e **Componentização Modular**.

### Frontend & Core
* **React 18+ com TypeScript**: Tipagem estática rigorosa em toda a aplicação.
* **Vite / Node Core**: Módulo ES super rápido com bundling otimizado e esbuild.
* **Tailwind CSS**: Estilização moderna e responsiva com suporte completo a **Dark Mode** e **Light Mode** ("Calm Twilight" e paletas neutras de alto contraste).
* **Lucide React**: Ícones vetoriais modernos e leves.
* **Recharts**: Gráficos analíticos e indicadores financeiros/frequência de treino em tempo real.
* **Qrcode.react / html5-qrcode**: Leitura e geração digital de QR Codes para check-in dinâmico por câmera ou token.

### Persistência & Banco de Dados (Multi-Tenant & Offline-First)
* **Storage Camada Dupla**:
  * **Banco Local Resiliente (Offline-First / Cache Eficiente)**: Sincronização em tempo real de Academias, Turmas, Presenças, Graduações, Financeiro e Logs via localStorage estruturado com eventos de broadcast.
  * **Integração Cloud / Supabase / PostgreSQL (Pronto para Produção)**: Conectores e modelos preparados para sincronização na nuvem (`Supabase REST API`, `JWT Auth`, `PostgreSQL schemas`).

---

## 📂 2. Estrutura Modular das Pastas

```text
/src
 ├── /components
 │    ├── /academies       # Módulo Multi-Tenant (Vínculo e Gestão de Rede de Academias)
 │    ├── /attendance      # Check-in QR Code (Câmera, Leitura em Tempo Real, Relatórios)
 │    ├── /auth            # Autenticação, Cadastro de Alunos/Professores, RoleSwitcher RBAC
 │    ├── /belts           # Sistema oficial de Faixas e Graus (IBJJF / Confederações)
 │    ├── /classes         # Gestão de Turmas, Cronograma e Frequência de Treino
 │    ├── /dashboard       # Indicadores, Gráficos Recharts, Estatísticas em Tempo Real
 │    ├── /financial       # Mensalidades, Pagamentos, PIX, Cartão, Fluxo de Caixa
 │    ├── /layout          # Navbar, Sidebar Adaptativa, Alternador de Perfis e Academias
 │    ├── /observations    # Prontuário, Desempenho Técnico e Notas de Professores
 │    ├── /ranking         # Gamificação, Pontuações e Destaques do Tatame
 │    ├── /reports         # Exportações PDF, Excel, Resumos Executivos
 │    ├── /settings        # Configurações de Academia, Esvaziar Banco (Zero Robôs/Testes)
 │    ├── /student         # Área do Aluno, Carteirinha Digital e QR Code Pessoal
 │    ├── /students        # Cadastro Completo, Documentos, Situação (Ativo/Congelado/Inativo)
 │    ├── /teachers        # Gestão de Corpo Docente e Horários
 │    └── /timer           # Cronômetro de Combate e Treinamento HIIT/Sparring
 ├── /constants
 │    ├── avatar.ts        # Resolução inteligente de Avatares e Graduações
 │    └── belts.ts         # Regras, tempos mínimos e cores oficiais das faixas
 ├── /context
 │    ├── AuthContext.tsx  # Autenticação, Controle de Acesso e Gerenciamento de Sessão
 │    └── DataContext.tsx  # Repositório Geral, Limpeza de Testes (clearAllDataToEmpty)
 ├── /data
 │    └── mockData.ts      # Dados padrão de teste (removíveis com 1 clique)
 ├── /types
 │    └── index.ts         # Tipagem TypeScript unificada do ecossistema BJJCRON
 ├── App.tsx               # Roteador Principal e Gestor de Permissões RBAC
 └── main.tsx              # Ponto de entrada da aplicação
```

---

## 🔐 3. Tipos de Usuários & Controle de Acesso (RBAC)

O BJJCRON implementa controle de acesso baseado em cargos (**Role-Based Access Control**):
1. **ADMIN (Administrador Geral / Mestre da Academia)**:
   * Acesso irrestrito a configurações, financeiro, auditoria, aprovação de cadastros, turmas e limpeza do banco de dados.
2. **PROFESSOR (Corpo Docente / Instrução)**:
   * Gestão de turmas, check-in QR Code, lançamento de presenças, avaliações, prontuário de alunos e requisições de graduação de faixa.
3. **ALUNO (Praticante)**:
   * Visualização da carteirinha digital, QR Code pessoal para entrada rápida, histórico de treinos, linha do tempo de faixas, certificados e pagamentos/mensalidades.

---

## 🧹 4. Limpeza de Dados de Teste / Robôs (Ambiente Limpo)

O sistema conta com o recurso **Limpar Todos os Registros (Zero Teste/Robôs)** disponível no módulo **Configurações da Academia (`/settings`)**:
* **Função**: `clearAllDataToEmpty()`
* **Comportamento**: Remove instantaneamente todos os registros de alunos fictícios, turmas simuladas, logs de robôs ou presenças de teste do cache e banco local, inicializando o sistema completamente **zerado** e pronto para entrada em **produção real**.
* **Como usar**:
  1. Acesse **Configurações** (menu lateral).
  2. Na aba **Geral**, localize o rodapé inferior e clique no botão vermelho **"Limpar Todos os Registros (Zero Teste/Robôs)"**.

---

## 🚀 5. Como Executar e Deploy (Instalação & Cloud)

### Desenvolvimento Local
```bash
# 1. Instale as dependências
npm install

# 2. Execute o servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3000
```

### Deploy para Produção (Vercel / Cloud Run / Railway / Supabase)
1. **Build de Produção**:
   ```bash
   npm run build
   ```
2. **Variáveis de Ambiente Recomendadas (`.env.example`)**:
   ```env
   VITE_SUPABASE_URL=https://sua-instancia.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```
3. O projeto gera arquivos estáticos otimizados no diretório `dist/`, compatíveis com qualquer CDN ou plataforma de containers Cloud Run.

---

## 📊 6. Modelagem de Banco de Dados (Entidades Principais)

* **`users` (Usuários / Contas)**: `id`, `name`, `email`, `role`, `avatarUrl`, `academyId`, `approvalStatus`.
* **`academies` (Academias / Rede Multi-Tenant)**: `id`, `name`, `fantasyName`, `logoUrl`, `planType`, `active`.
* **`students` (Alunos)**: `id`, `name`, `email`, `belt`, `degrees`, `status (ACTIVE|INACTIVE|FROZEN)`, `qrCodeToken`, `academyId`.
* **`classes` (Turmas)**: `id`, `name`, `schedule`, `instructorId`, `capacity`, `academyId`.
* **`attendances` (Presenças)**: `id`, `studentId`, `classId`, `date`, `method (QR_CODE_STUDENT|QR_CODE_TEACHER|MANUAL)`.
* **`payments` (Financeiro)**: `id`, `studentId`, `amount`, `dueDate`, `status (PAID|PENDING|OVERDUE)`, `method`.
* **`belt_requests` (Graduações)**: `id`, `studentId`, `targetBelt`, `requestDate`, `status (APPROVED|PENDING|REJECTED)`.

---

## 🔮 7. Roadmap & Melhorias Futuras (Evolução do Produto)

1. **Catraca Física & IoT**:
   * Integração de hardware via MQTT/WebSockets para liberação automática de catracas físicas na academia após leitura do QR Code no check-in.
2. **Notificações Push / WhatsApp API**:
   * Envio automatizado de lembretes de aula, aviso de faixas aprovadas e alertas de vencimento de mensalidade por WhatsApp Business API.
3. **Módulo de Seminários e Competições**:
   * Inscrição online em torneios internos, chaves de luta chaveadas por peso/faixa e placar eletrônico integrado ao cronômetro de combate (`/timer`).
4. **App Mobile Nativo (React Native / Flutter)**:
   * Empacotamento para iOS (App Store) e Android (Google Play) com suporte a biometria e carteirinha offline no Apple Wallet / Google Wallet.

---
*© 2026 BJJCRON — Gestão de Jiu-Jitsu de Alta Performance.*
