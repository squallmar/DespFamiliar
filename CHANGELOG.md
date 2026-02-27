# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-02-26

### ✨ Adicionado

#### Funcionalidades Principais
- Sistema completo de gestão de despesas familiares
- Dashboard interativo com estatísticas em tempo real
- Gestão de contas a pagar e receber
- Gerenciamento de proventos (receitas)
- Sistema de membros da família
- Projeções financeiras com gráficos interativos
- Relatórios detalhados por categoria e período
- Sistema de conquistas gamificado
  - 10+ conquistas desbloqueáveis
  - Notificações com som e confetti
  - Badge de notificações no menu

#### Interface e UX
- Menu de navegação moderno com gradiente azul/índigo
- Design responsivo mobile-first
- Menu hamburger para dispositivos móveis
- Destaque visual da página ativa
- Animações e transições suaves
- Ícones Lucide consistentes
- Sistema de feedback visual (toasts)

#### Internacionalização
- Suporte a 3 idiomas: Português (BR), English (US), Español (ES)
- Suporte a 3 moedas: BRL, USD, EUR
- Seletor de idioma/moeda no menu

#### Autenticação e Segurança
- Sistema de registro e login
- Autenticação baseada em sessão
- Hash de senhas com bcrypt
- Recuperação de senha com email
- Rotas protegidas com middleware
- Painel administrativo para gestão

#### APIs REST
- CRUD completo de despesas
- CRUD de contas/bills
- CRUD de categorias
- CRUD de proventos/receitas
- Gestão de membros da família
- Sistema de conquistas
- Geração de relatórios
- Estatísticas e analytics
- Backup e importação de dados

#### Banco de Dados
- SQLite com relacionamentos completos
- 8 categorias padrão pré-configuradas
- Suporte a despesas recorrentes
- Sistema de budgets e metas financeiras
- Histórico completo de transações

#### Recursos Avançados
- Busca e filtros dinâmicos
- Exportação de dados (JSON)
- Sistema de alertas e notificações
- Gráficos interativos (Recharts)
- Modo de edição inline
- Paginação de resultados
- Validação completa com TypeScript

### 🛠️ Tecnologias Utilizadas
- Next.js 15 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS 3.4
- SQLite 3
- Recharts
- Lucide Icons
- SWR para data fetching
- bcrypt para segurança

### 📚 Documentação
- README completo com badges e screenshots
- Guia de instalação detalhado
- Documentação de APIs
- Guia de contribuição (CONTRIBUTING.md)
- Licença MIT (LICENSE)
- Arquivo .env.example
- Estrutura de banco de dados documentada

### 🔒 Segurança
- Proteção contra SQL injection
- Cookies httpOnly seguros
- Validação de inputs
- Sanitização de dados
- Rate limiting básico

---

## Tipos de Mudanças

- **Adicionado** - para novas funcionalidades
- **Modificado** - para mudanças em funcionalidades existentes
- **Depreciado** - para funcionalidades que serão removidas
- **Removido** - para funcionalidades removidas
- **Corrigido** - para correções de bugs
- **Segurança** - para vulnerabilidades corrigidas

---

[1.0.0]: https://github.com/squallmar/DespFamiliar/releases/tag/v1.0.0
