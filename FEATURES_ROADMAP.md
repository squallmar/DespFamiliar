# 🚀 Roadmap de Novas Features - DespFamiliar

**Data**: 02/03/2026  
**Status**: Implementação em Progresso  
**Versão**: 2.0 Beta

---

## ✅ IMPLEMENTADO

### 🎯 Quick Wins (6/6)

#### 1. ⌨️ Atalhos de Teclado
- **Hook**: `useKeyboardShortcuts.ts`
- **Atalhos padrão**:
  - `Ctrl+N` → Nova despesa
  - `Ctrl+K` → Buscar/Busca
  - `Esc` → Fechar modal
- **Componente**: `ShortcutsModal.tsx` para exibir ajuda
- **Localização**: Qualquer página

#### 2. 🗜️ Modo Compacto
- **Hook**: `useCompactMode.ts`
- **Funcionalidade**: Toggle de visualização compacta vs. espaçada
- **Persistência**: localStorage
- **Evento**: `compactModeChange` para componentes reagirem

#### 3. 📸 Exportar Gráficos como PNG
- **Hook**: `useExportChart.ts`
- **Biblioteca**: html2canvas
- **Funcionalidade**: Download de gráficos em resolução 2x
- **Formatos**: PNG automático

#### 4. 🔄 Duplicar Despesa
- **Componente**: `RecentExpensesWidget.tsx`
- **Funcionalidade**: Button de duplicar com um clique
- **Dados**: Copia todos os campos exceto ID e data

#### 5. 🕐 Widget - Últimas Despesas
- **Componente**: `RecentExpensesWidget.tsx`
- **Features**:
  - Últimas 5 despesas adicionadas
  - Ação de duplicar e deletar
  - Data formatada locale-aware
  - Ícone da categoria

#### 6. 📊 Widget - Estatísticas do Dia
- **Componente**: `DailyStatsWidget.tsx`
- **Features**:
  - Gasto hoje vs. média diária
  - Progresso do mês
  - Barra colorida de progresso
  - Alerta se passou orçamento
  - Cálculo automático de percentuais

---

### 🌐 PWA & Notificações (2/2)

#### 7. 📱 Progressive Web App
- **Manifest**: `/public/manifest.json`
  - Icons: 192px + 512px (standard + maskable)
  - Screenshots: narrow + wide
  - Shortcuts: Nova despesa + Relatórios
  - Tema color + background color
  - Categories + display standalone
  
- **Service Worker**: `/public/service-worker.js`
  - Cache strategy: Network first
  - Offline support com fallback
  - Push notification handler
  - Cache invalidation automática
  
- **Registro**: `ServiceWorkerRegistration.tsx`
  - Auto-registration no layout
  - Error handling graceful

- **Metadata**: Layout.tsx atualizado
  - apple-web-app-capable
  - Manifest link
  - Theme colors

#### 8. 🔔 Push Notifications
- **Hook**: `usePushNotifications.ts`
- **Functions**:
  - `subscribeToNotifications()` - inscrever usuário
  - `unsubscribeFromNotifications()` - desinscrever
  - `sendNotification(payload)` - enviar local
  - `requestPermission()` - solicitar permissão
  
- **VAPID Keys**: Suporte (environment variables)
- **Persistência**: Subscription storage

---

### 📋 Componentes & Features (5/5)

#### 9. 💾 Despesas Parceladas
- **Componente**: `InstallmentExpenseModal.tsx`
- **Features**:
  - Descrição + Categoria + Valor total
  - Número de parcelas (3, 6, 12, 24, 36)
  - Data da primeira parcela
  - Observações adicionais
  - Preview: "Nxm de R$ XXX"
  - Cria automaticamente N despesas mensais

#### 10. 🏷️ Tags Customizadas
- **Componente**: `TagsInput.tsx`
- **Features**:
  - Adicionar tags com Enter
  - Sugestões com autocomplete
  - Limite configurável (padrão: 10)
  - Remove com backspace ou botão X
  - Visual: badges com "#tag"
  - Contador de tags

#### 11. 📅 Calendário Visual de Despesas
- **Componente**: `CalendarExpenses.tsx`
- **Features**:
  - Navegação com setas (prev/next month)
  - Visualiza despesas por dia
  - Total do dia destacado em índigo
  - Mostrar primeiras 2 despesas + contador
  - Clique no dia → callback
  - Clique na despesa → callback

#### 12. 🎨 Temas Customizáveis
- **Hook**: `useTheme.ts`
- **Features**:
  - Light/Dark/Auto (detecta preferência sistema)
  - 8 preset colors (Indigo, Blue, Green, Purple, Pink, Red, Orange, Teal)
  - Color picker para cor personalizada
  - CSS Variables para aplicar globalmente
  - Persistência em localStorage
  
- **Componente**: `ThemeSettings.tsx`
  - Modal de seleção
  - Radio buttons para temas
  - Grid de cores
  - Input color picker

#### 13. 📊 Comparativo com Histórico
- **Hook**: `useCategoryComparison.ts`
- **Features**:
  - Compare gasto atual vs. média do usuário
  - Cálculo de variância (%)
  - Status: below/average/above
  - Dados para API future

- **Componente**: `CategoryComparisonWidget.tsx`
  - Comparativo por categoria
  - Ícones de trending (up/down/even)
  - Barra de progresso visual
  - Insights em português

---

## 🔜 EM DESENVOLVIMENTO

### Backend APIs Necessárias

- [ ] `POST /api/notifications/subscribe` - Salvar subscription
- [ ] `POST /api/notifications/unsubscribe` - Remover subscription
- [ ] `POST /api/notifications/send` - Enviar notificação push
- [ ] `GET /api/expenses/recent?limit=5` - Últimas despesas
- [ ] `GET /api/stats/daily` - Estatísticas do dia
- [ ] `POST /api/expenses/duplicate` - Duplicar despesa
- [ ] `POST /api/expenses/installment` - Criar parcelado
- [ ] `GET /api/stats/comparison?month=YYYY-MM` - Comparativos
- [ ] `GET /api/insights` - IA insights
- [ ] `POST /api/expenses/:id/tags` - Tags por despesa
- [ ] `GET /api/expenses?tags=tag1,tag2` - Filter by tags
- [ ] `POST /api/upload/receipt` - Upload de recibo
- [ ] `GET /api/receipts/:expenseId` - Get recibos

### Database Updates

- [ ] Table: `tags` (id, name, color, user_id)
- [ ] Table: `expense_tags` (expense_id, tag_id)
- [ ] Table: `installment_expenses` (id, original_expense_id, installment_number, total_number)
- [ ] Table: `push_subscriptions` (id, user_id, subscription, created_at)
- [ ] Table: `notifications` (id, user_id, title, body, read, created_at)
- [ ] Table: `receipts` (id, expense_id, file_url, created_at)
- [ ] Table: `expense_insights` (id, user_id, title, message, type, acknowledged)
- [ ] Column: `expenses.tags` (JSON array)
- [ ] Column: `users.theme_config` (JSON)

---

## 📅 Próximas Features

### Fase 3: Features Maiores

- [ ] **Anexar Recibos/Notas** - Upload de imagens
- [ ] **Melhorar Importação** - OFX, QIF, auto-categorização
- [ ] **Metas Visuais** - Animated progress bars
- [ ] **Modo Colaborativo** - WebSocket multi-user real-time
- [ ] **IA - Sugestões** - OpenAI insights
- [ ] **Relatórios por Email** - Cron jobs
- [ ] **Testes Automatizados** - Jest + RTL
- [ ] **Open Banking** - Integração bancária

### Componentes Criados Hoje

```typescript
// Hooks
✅ useKeyboardShortcuts.ts
✅ useCompactMode.ts
✅ useExportChart.ts
✅ usePushNotifications.ts
✅ useTheme.ts
✅ useCategoryComparison.ts

// Componentes
✅ RecentExpensesWidget.tsx
✅ DailyStatsWidget.tsx
✅ InstallmentExpenseModal.tsx
✅ TagsInput.tsx
✅ CalendarExpenses.tsx
✅ ThemeSettings.tsx
✅ ShortcutsModal.tsx
✅ CategoryComparisonWidget.tsx
✅ ServiceWorkerRegistration.tsx

// Public Files
✅ /manifest.json
✅ /service-worker.js

// Config Updates
✅ package.json (html2canvas adicionado)
✅ translations.ts (17+ novas chaves)
✅ layout.tsx (PWA + SW setup)
```

---

## 🎯 Próximos Passos

1. **Integração Dashboard**
   - Adicionar widgets ao Dashboard home
   - Conectar atalhos de teclado
   - Implementar modo compacto visual

2. **Backend APIs**
   - Criar endpoints para cada feature
   - Adicionar migrações de database
   - Implementar validações

3. **Testing**
   - Testar PWA offline
   - Testar notificações push
   - Validar persistence localStorage

4. **Mobile Optimization**
   - Testar em iOS Safari
   - Testar em Android Chrome
   - Verificar viewport behavior

---

## 📊 Estatísticas

- **Componentes Novos**: 9
- **Hooks Novos**: 6
- **Linhas de Código**: ~2.500+
- **Tradução**: 17+ keys (PT-BR, EN-US, ES-ES)
- **Tempo Estimado para Completar Todos**: 2-3 semanas
- **Complexidade**: Média a Alta

---

## 🔧 Tecnologias Utilizadas

- **PWA**: Manifest + Service Worker
- **Notifications**: Web Push API + Service Worker
- **Storage**: localStorage + indexedDB (future)
- **Export**: html2canvas para gráficos
- **UI**: Tailwind CSS + Lucide Icons
- **State**: React Hooks + SWR
- **Dates**: Intl API (locale-aware)

---

## ✨ Benefícios

✅ **UX Melhorada**: Atalhos de teclado, widgets úteis  
✅ **Offline**: PWA permite uso sem internet  
✅ **Notificações**: Alertas em tempo real  
✅ **Flexibilidade**: Temas personalizáveis  
✅ **Dados Better**: Despesas parceladas, tags, comparativos  
✅ **Acessibilidade**: Modo compacto, keyboard navigation  

---

**Próximo Update**: Integração completa com Dashboard + Backend APIs
