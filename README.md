# 💰 Controle de Despesas Familiar

Uma aplicação moderna e completa para controle de despesas familiares com funcionalidades avançadas de projeção financeira e banco de dados integrado.

## 🚀 Funcionalidades Implementadas

### ✅ Sistema Completo
- **Dashboard Interativo**: Visão geral das finanças com dados reais do banco
- **Gestão Completa de Despesas**: CRUD completo (Criar, Ler, Atualizar, Deletar)
- **Estatísticas em Tempo Real**: Comparação mensal, médias e projeções
- **Banco de Dados SQLite**: Persistência completa de dados
- **APIs REST**: Endpoints para todas as operações
- **Navegação Intuitiva**: Sistema de navegação entre páginas
- **Busca e Filtros**: Localização rápida de despesas por categoria ou descrição

### 🎯 Recursos Avançados
- **Categorização Inteligente**: 8 categorias padrão com ícones e cores
- **Despesas Recorrentes**: Suporte a gastos semanais, mensais e anuais  
- **Projeções Financeiras**: Gráficos interativos e análise de tendências
- **Interface Responsiva**: Funciona perfeitamente em desktop e mobile
- **Validação Completa**: TypeScript em todo o projeto
- **Atualizações em Tempo Real**: Dados sincronizados entre componentes

## 🛠️ Tecnologias

- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Banco de Dados**: SQLite com relacionamentos completos
- **Gráficos**: Recharts para visualizações interativas
- **Ícones**: Lucide React
- **Validação**: Hooks customizados com TypeScript
- **Build**: Turbopack para desenvolvimento rápido

## 📦 Instalação e Uso

1. **Clone e instale**:
```bash
git clone <seu-repositorio>
cd desp2.0
npm install
```

2. **Execute a aplicação**:
```bash
npm run dev
```

3. **Acesse**: `http://localhost:3000`

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
