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
JWT_SECRET=COLOQUE_UM_SEGREDO_FORTE_COM_32+_CARACTERES
DATABASE_URL=postgres://postgres:SENHA_FORTE@localhost:5432/despfamiliar

ASAAS_API_KEY=seu_token_aqui
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=seu_token_secreto_do_webhook

STRIPE_SECRET_KEY=sk_live_ou_test
STRIPE_WEBHOOK_SECRET=whsec_xxx

ENABLE_DEV_ADMIN_BOOTSTRAP=false
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
  -H "Cookie: token=SEU_TOKEN" \
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

## 🔐 Checklist de Produção (Alta Segurança)

- [ ] JWT_SECRET com 32+ caracteres aleatórios
- [ ] ASAAS_WEBHOOK_TOKEN configurado e igual no painel Asaas
- [ ] STRIPE_WEBHOOK_SECRET configurado e validando eventos
- [ ] ENABLE_DEV_ADMIN_BOOTSTRAP=false em produção
- [ ] HTTPS ativo com certificado válido
- [ ] Banco com senha forte e acesso restrito por IP/rede
- [ ] Rotação periódica de segredos (JWT, Stripe, Asaas, SMTP)
- [ ] Monitoramento e alertas de erro (429, 401, 403, 5xx)
