# 🚀 Comandos Rápidos - Setup Premium

## 1️⃣ Configurar Banco de Dados

```bash
# Windows (PowerShell)
$env:DATABASE_URL="postgresql://user:pass@localhost:5432/despfamiliar"
psql $env:DATABASE_URL -f migrations/002_pix_payments.sql

# Linux/Mac
export DATABASE_URL="postgresql://user:pass@localhost:5432/despfamiliar"
psql $DATABASE_URL -f migrations/002_pix_payments.sql
```

## 2️⃣ Adicionar ao .env

```env
ASAAS_API_KEY=seu_token_aqui
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
```

## 3️⃣ Testar a Aplicação

```bash
npm run dev
```

Acesse:
- 📊 Página de Reports: http://localhost:3000/reports
- 👨‍💼 Admin Pix: http://localhost:3000/admin/pix-payments

## 4️⃣ Criar Primeiro Admin

```bash
# No PostgreSQL
psql $env:DATABASE_URL

UPDATE users SET admin = true WHERE email = 'seu@email.com';
```

## 5️⃣ Testar Pix com cURL

```bash
curl -X POST http://localhost:3000/api/premium/pix-asaas \
  -H "Cookie: auth-token=SEU_TOKEN" \
  -H "Content-Type: application/json"
```

## 6️⃣ Ver Logs do Webhook

```bash
# No terminal do servidor
# Você verá:
# 📩 Webhook Asaas recebido: {...}
# ✅ Premium ativado via Asaas para usuário: xxx
```

---

## ✅ Checklist de Verificação

- [ ] Migrations executadas
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor rodando
- [ ] Usuário admin criado
- [ ] Paywall aparece corretamente
- [ ] Banner de upgrade visível (para não-premium)
- [ ] Ícones de cadeado nos botões
- [ ] Dashboard admin acessível
