# 💰 DespFamiliar - Controle de Despesas Familiar

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)

Uma aplicação moderna e completa para controle de despesas familiares com funcionalidades avançadas de projeção financeira, sistema de conquistas gamificado, e banco de dados integrado.

![Dashboard Preview](https://via.placeholder.com/800x400/4F46E5/ffffff?text=DespFamiliar+Dashboard)

## 🚀 Funcionalidades Implementadas

### ✅ Sistema Completo de Gestão Financeira
- **Dashboard Interativo**: Visão geral das finanças com dados reais do banco
- **Gestão Completa de Despesas**: CRUD completo (Criar, Ler, Atualizar, Deletar)
- **Gestão de Contas**: Controle de contas a pagar e receber com status e vencimentos
- **Proventos (Receitas)**: Gerenciamento de fontes de renda mensais
- **Membros da Família**: Atribua despesas a membros específicos da família
- **Estatísticas em Tempo Real**: Comparação mensal, médias e projeções
- **Busca e Filtros**: Localização rápida de despesas por categoria, membro ou descrição

### 🎯 Recursos Avançados
- **Sistema de Conquistas**: Gamificação com 10+ conquistas desbloqueáveis
  - Notificações com som e confetti ao desbloquear
  - Badge de notificações no menu
  - Sistema de progresso e timestamps
- **Projeções Financeiras**: Gráficos interativos e análise de tendências
  - Projeções de 1, 3, 6 e 12 meses
  - Gráficos de linha e pizza
  - Alertas de orçamento
- **Relatórios Detalhados**: Análises por categoria, período e membro
- **Multi-idioma**: Suporte para Português (BR), English (US), Español (ES)
- **Multi-moeda**: BRL, USD, EUR
- **Sistema de Autenticação**: Login, registro, recuperação de senha
- **Painel Administrativo**: Gestão de usuários e feedbacks (para admins)
- **Backup/Importação**: Exporte e importe seus dados em JSON

### 🎨 Interface Moderna
- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Menu Mobile**: Hamburger menu com transições suaves
- **Template Moderno**: Gradientes azul/índigo, animações sutis
- **Destaque de Página Ativa**: Navegação clara e intuitiva
- **Ícones Lucide**: Biblioteca de ícones moderna e consistente
- **Tailwind CSS**: Estilização utilitária e customizável

### 🔐 Segurança
- **Autenticação por Sessão**: Cookies seguros httpOnly
- **Rotas Protegidas**: Middleware para páginas privadas
- **Hash de Senhas**: bcrypt para segurança de credenciais
- **Reset de Senha**: Sistema completo de recuperação (com email opcional)
- **Rate Limit**: Limite de tentativas em login, cadastro e reset
- **Proteção CSRF**: Validação de origem em mutações de API
- **Webhooks Assinados**: Stripe e Asaas com validação de assinatura/token
- **Headers de Segurança**: CSP, HSTS, X-Frame-Options e outros headers hardening

## 🛠️ Tecnologias

- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Banco de Dados**: SQLite com relacionamentos completos
- **Gráficos**: Recharts para visualizações interativas
- **Ícones**: Lucide React
- **Validação**: Hooks customizados com TypeScript
- **Build**: Turbopack para desenvolvimento rápido

## 📦 Instalação e Uso

### Pré-requisitos
- Node.js 18.x ou superior
- npm ou yarn

### Instalação

1. **Clone o repositório**:
```bash
git clone https://github.com/squallmar/DespFamiliar.git
cd DespFamiliar
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
# Edite o arquivo .env e configure JWT_SECRET, DATABASE_URL,
# ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e chaves do Stripe
```

4. **Inicialize o banco de dados**:
```bash
node init_db.js
```

5. **Execute a aplicação**:
```bash
npm run dev
```

6. **Acesse**: `http://localhost:3000`

### Primeiro Acesso

1. Clique em "Registrar" e crie sua conta
2. Faça login com suas credenciais
3. Comece a adicionar suas despesas!

### Criar Usuário Admin (Opcional)

```bash
# Usando o script TypeScript
npm run create-admin

# Ou diretamente
node create_admin.ts
```

## 🏗️ Comandos Disponíveis

```bash
npm run dev         # Desenvolvimento com hot-reload
npm run build       # Build otimizado para produção
npm run start       # Executa build de produção
npm run lint        # Verificação de código
```

## 📱 Páginas e Funcionalidades

### 🏠 Dashboard Principal (`/`)
- **Estatísticas Mensais**: Total atual, anterior, mudança percentual
- **Adição Rápida**: Formulário para nova despesa
- **Top Categorias**: Ranking visual dos maiores gastos
- **Últimas Despesas**: Lista das transações recentes
- **Projeções**: Estimativas baseadas no consumo atual

### 📊 Gestão de Despesas (`/expenses`)
- **Lista Completa**: Todas as despesas com paginação
- **CRUD Completo**: Criar, editar e excluir despesas
- **Busca Avançada**: Por descrição, categoria e data
- **Filtros Dinâmicos**: Categorias e períodos personalizados
- **Modal de Edição**: Interface intuitiva para modificações
- **Despesas Recorrentes**: Configuração de repetição automática

### 📈 Projeções Financeiras (`/projections`)
- **Gráficos de Tendência**: Histórico vs projetado
- **Distribuição Categórica**: Análise visual por tipo de gasto
- **Recomendações**: Sugestões baseadas em padrões identificados
- **Metas de Economia**: Acompanhamento de objetivos financeiros

## 🗄️ Estrutura do Banco de Dados

### Tabelas Implementadas:
- **`users`**: Dados dos usuários (estrutura pronta)
- **`categories`**: Categorias com cores e ícones
- **`expenses`**: Despesas com relacionamentos
- **`budgets`**: Orçamentos por categoria (estrutura pronta)
- **`financial_goals`**: Metas financeiras (estrutura pronta)

### Relacionamentos:
- Foreign keys entre todas as tabelas
- Índices otimizados para consultas rápidas
- Constraints de integridade referencial

## 🔌 APIs Disponíveis

### Despesas
- `GET /api/expenses` - Listar despesas
- `POST /api/expenses` - Criar nova despesa
- `PUT /api/expenses` - Atualizar despesa
- `DELETE /api/expenses` - Excluir despesa

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria

### Estatísticas
- `GET /api/stats` - Estatísticas gerais

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual
- `PUT /api/auth/profile` - Atualizar perfil

### Contas/Bills
- `GET /api/bills` - Listar contas
- `POST /api/bills` - Criar conta
- `PUT /api/bills` - Atualizar conta
- `DELETE /api/bills` - Excluir conta

### Conquistas
- `GET /api/achievements` - Listar conquistas do usuário

### Relatórios
- `GET /api/reports` - Gerar relatórios
- `GET /api/reports/summary` - Resumo de relatórios

### Admin (apenas para administradores)
- `GET /api/admin/users` - Gerenciar usuários
- `GET /api/admin/feedbacks` - Ver feedbacks

## 📸 Screenshots

| Dashboard | Projeções | Conquistas |
|-----------|-----------|------------|
| ![Dashboard](https://via.placeholder.com/300x200/4F46E5/ffffff?text=Dashboard) | ![Projections](https://via.placeholder.com/300x200/10B981/ffffff?text=Projections) | ![Achievements](https://via.placeholder.com/300x200/F59E0B/ffffff?text=Achievements) |

| Contas | Membros da Família | Relatórios |
|--------|-------------------|------------|
| ![Bills](https://via.placeholder.com/300x200/EF4444/ffffff?text=Bills) | ![Family](https://via.placeholder.com/300x200/8B5CF6/ffffff?text=Family) | ![Reports](https://via.placeholder.com/300x200/06B6D4/ffffff?text=Reports) |

## 🎯 Roadmap

- [ ] Integração com bancos (Open Banking)
- [ ] App mobile nativo (React Native)
- [ ] Cloud sync entre dispositivos
- [ ] Importação de extratos bancários (OFX, CSV)
- [ ] OCR para leitura de notas fiscais
- [ ] Notificações push de vencimentos
- [ ] Dashboard analítico avançado com BI
- [ ] Sistema de tags personalizadas
- [ ] Modo escuro (Dark mode)
- [ ] Exportação para PDF/Excel

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Marcel (squallmar)**
- GitHub: [@squallmar](https://github.com/squallmar)
- Projeto: [DespFamiliar](https://github.com/squallmar/DespFamiliar)

## 🙏 Agradecimentos

- Next.js team pela framework incrível
- Tailwind CSS pela experiência de desenvolvimento
- Lucide pela biblioteca de ícones
- Recharts pelos gráficos interativos

---

⭐ Se você gostou deste projeto, considere dar uma estrela no GitHub!

📧 Dúvidas? Abra uma [issue](https://github.com/squallmar/DespFamiliar/issues)!
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria

### Estatísticas
- `GET /api/stats` - Estatísticas completas

## 🎨 Categorias Padrão

| Categoria | Ícone | Cor | Descrição |
|-----------|-------|-----|-----------|
| 🍽️ Alimentação | #FF6B6B | Vermelho | Supermercado, restaurantes |
| 🚗 Transporte | #4ECDC4 | Azul claro | Combustível, passagens |
| 🏠 Moradia | #45B7D1 | Azul | Aluguel, contas básicas |
| ⚕️ Saúde | #96CEB4 | Verde claro | Médicos, medicamentos |
| 📚 Educação | #FECA57 | Amarelo | Cursos, livros, escola |
| 🎉 Lazer | #FF9FF3 | Rosa | Entretenimento, hobbies |
| 👕 Vestuário | #54A0FF | Azul royal | Roupas, calçados |
| 📦 Outros | #5F27CD | Roxo | Diversos |

## 🔮 Próximas Funcionalidades

### 🔐 Sistema de Autenticação
- Login e registro de usuários
- Sessões seguras com JWT
- Dados isolados por usuário

### 💹 Funcionalidades Avançadas
- **Orçamentos Inteligentes**: Alertas automáticos de limite
- **Metas Financeiras**: Acompanhamento de objetivos de economia
- **Relatórios PDF**: Exportação de dados personalizados
- **Importação Bancária**: Upload de extratos automático
- **Despesas Compartilhadas**: Divisão de gastos familiares

### 📱 Melhorias de UX
- **PWA**: Aplicativo instalável
- **Modo Escuro**: Interface adaptável
- **Notificações**: Lembretes e alertas
- **Offline**: Funcionamento sem internet
- **Backup**: Sincronização na nuvem

## � Métricas da Aplicação

- **Páginas**: 3 principais + APIs
- **Componentes**: 15+ reutilizáveis
- **APIs**: 6 endpoints RESTful
- **Banco**: 5 tabelas relacionadas
- **Tipos**: 100% TypeScript
- **Performance**: Build otimizado <220kB

## 🤝 Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature
3. Implemente suas mudanças
4. Teste thoroughly
5. Abra um Pull Request

## 📄 Licença

MIT License - Use livremente para projetos pessoais e comerciais.

---

**🎯 Desenvolvido para ajudar famílias a controlarem suas finanças com tecnologia moderna e interface intuitiva**

**🚀 Status: ✅ Totalmente Funcional - Pronto para Uso!**
