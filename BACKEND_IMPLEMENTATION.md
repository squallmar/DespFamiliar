# Backend Services - Complete Implementation Guide

This document provides comprehensive documentation for all backend services, including setup, API endpoints, and usage examples.

## 📦 New Backend Features

### 1. **AI-Powered Insights** (OpenAI GPT-4o-mini)
- **Library**: `src/lib/ai.ts`
- **Endpoints**: `/api/insights`, `/api/anomalies`
- **Features**:
  - Personalized financial insights
  - Anomaly detection (statistical + AI)
  - Spending pattern analysis
  - Portuguese language responses

### 2. **Push Notifications** (Web Push API + VAPID)
- **Library**: `src/lib/push-notifications.ts`  
- **Endpoints**: `/api/notifications/subscribe`, `/api/notifications/unsubscribe`
- **Features**:
  - Budget alerts
  - AI insight notifications
  - Anomaly detection alerts
  - Multi-device support

### 3. **Email Scheduling** (node-cron + nodemailer)
- **Library**: `src/lib/email-scheduler.ts`
- **Endpoints**: `/api/reports/email/subscribe`
- **Features**:
  - Daily/weekly/monthly reports
  - Summary, detailed, and charts formats
  - Automatic scheduling (cron jobs)
  - Customizable category filters

### 4. **File Storage** (AWS S3 with local fallback)
- **Library**: `src/lib/storage.ts`
- **Endpoints**: `/api/upload/receipt`
- **Features**:
  - Receipt uploads to S3 or local filesystem
  - Presigned URLs for temporary access
  - Batch uploads
  - Automatic fallback when S3 not configured

### 5. **Real-time Collaboration** (WebSocket)
- **Library**: `src/lib/websocket-server.ts`
- **Server**: `websocket-server.mts`
- **Features**:
  - Live expense updates
  - Presence tracking
  - Typing indicators
  - Conflict resolution

### 6. **Bank Statement Import Processing**
- **Endpoint**: `/api/import/process`
- **Features**:
  - CSV, OFX, QIF parsing
  - Duplicate detection
  - Auto-categorization
  - Batch processing

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Required packages are already in package.json:
- `openai` - OpenAI API client
- `web-push` - Web Push notifications
- `node-cron` - Email scheduling
- `@aws-sdk/client-s3` - AWS S3 file storage
- `@aws-sdk/s3-request-presigner` - S3 presigned URLs
- `ws` - WebSocket server
- `nodemailer` - Email sending

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required for AI Features:**
```env
OPENAI_API_KEY=sk-proj-xxxxx
```
Get your API key at: https://platform.openai.com/api-keys

**Required for Push Notifications:**
```bash
npx web-push generate-vapid-keys
```
Then add to `.env`:
```env
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_SUBJECT=mailto:admin@despfamiliar.com
```

**Required for Email Reports:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@despfamiliar.com
```

**Optional for S3 File Storage:**
```env
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=despfamiliar-receipts
```
> If not configured, files will be saved to `/public/uploads/`

**WebSocket Server:**
```env
WS_PORT=3001
```

### 3. Database Migrations

The database schema includes all new tables. Run initialization:

```bash
npx tsx init_db.mts
```

New tables created:
- `financial_goals` (enhanced)
- `shared_expenses` + `shared_expense_participants`
- `settlements`
- `push_subscriptions`
- `email_subscriptions`
- `receipts` (with `storage_type` column)
- `insights`
- `anomalies`

### 4. Start Services

**Option A: Separate Servers (Recommended)**

Terminal 1 - Next.js:
```bash
npm run dev
```

Terminal 2 - WebSocket + Email Scheduler:
```bash
npx tsx websocket-server.mts
```

**Option B: Integrated (Future Enhancement)**

Modify `next.config.ts` to integrate WebSocket server with Next.js custom server.

---

## 📚 API Documentation

### 🤖 AI Insights

#### Generate Insights
```http
POST /api/insights
Content-Type: application/json
x-user-id: user-123

{
  "periodDays": 30,
  "categories": ["Alimentação", "Transporte"],
  "focus": "savings"
}
```

**Response:**
```json
{
  "insights": [
    {
      "id": "insight-abc",
      "userId": "user-123",
      "type": "savings",
      "title": "Oportunidade de Economia",
      "description": "Você gastou 30% a mais com transporte...",
      "recommendation": "Considere usar transporte público...",
      "estimatedSavings": 150.00,
      "confidence": 0.85,
      "expiresAt": "2024-01-08T00:00:00Z"
    }
  ]
}
```

#### Get Active Insights
```http
GET /api/insights?type=savings&minConfidence=0.7
x-user-id: user-123
```

---

### 🔔 Push Notifications

#### Subscribe to Notifications
```http
POST /api/notifications/subscribe
Content-Type: application/json
x-user-id: user-123

{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "xxxxx",
    "auth": "xxxxx"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription added",
  "subscriptionCount": 2
}
```

#### Send Budget Alert (Server-side)
```typescript
import { notifyBudgetAlert } from '@/lib/push-notifications';

await notifyBudgetAlert(
  'user-123',
  'Alimentação',
  95.5,  // percentage
  955.00, // spent
  1000.00 // limit
);
```

---

### 📧 Email Reports

#### Subscribe to Email Reports
```http
POST /api/reports/email/subscribe
Content-Type: application/json
x-user-id: user-123

{
  "email": "user@example.com",
  "frequency": "weekly",
  "reportFormat": "summary",
  "categories": ["Alimentação", "Transporte"]
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub-123",
    "email": "user@example.com",
    "frequency": "weekly",
    "reportFormat": "summary",
    "nextReportDate": "2024-01-08T09:00:00Z"
  }
}
```

**Report Formats:**
- `summary` - Overview with category breakdown
- `detailed` - All transactions listed
- `charts` - Visual bar charts of spending

**Frequencies:**
- `daily` - Every day at 9 AM
- `weekly` - Every Monday at 9 AM  
- `monthly` - First day of month at 9 AM

---

### 📁 File Storage

#### Upload Receipt
```http
POST /api/upload/receipt
Content-Type: multipart/form-data
x-user-id: user-123

receipt: [FILE]
expenseId: expense-456
```

**Response:**
```json
{
  "id": "receipt-789",
  "userId": "user-123",
  "expenseId": "expense-456",
  "fileName": "receipt.jpg",
  "fileSize": 102400,
  "fileType": "image/jpeg",
  "fileUrl": "https://bucket.s3.amazonaws.com/receipts/...",
  "storageType": "s3",
  "fileKey": "receipts/receipt-789.jpg",
  "uploadedAt": "2024-01-01T10:00:00Z"
}
```

**Supported Formats:**
- Images: `png`, `jpeg`, `webp`
- Documents: `pdf`
- Max size: 10 MB

**Storage Fallback:**
- If S3 configured → Upload to AWS S3
- If S3 not configured → Save locally to `/public/uploads/receipts/`

---

### 💬 Real-time Collaboration (WebSocket)

#### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3001?userId=user-123&familyId=family-456');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

#### Message Types

**Expense Created:**
```javascript
ws.send(JSON.stringify({
  type: 'expense:created',
  payload: {
    expenseId: 'expense-789',
    amount: 150.00,
    description: 'Supermercado',
    category: 'Alimentação'
  }
}));
```

**Expense Editing (Lock):**
```javascript
ws.send(JSON.stringify({
  type: 'expense:editing',
  payload: { expenseId: 'expense-789' }
}));
```

**Typing Indicator:**
```javascript
ws.send(JSON.stringify({
  type: 'typing',
  payload: { isTyping: true, field: 'description' }
}));
```

**Server Broadcasts:**
- `connected` - Connection confirmation
- `user:joined` - User joined family
- `user:left` - User left family
- `expense:created` - New expense added
- `expense:updated` - Expense modified
- `expense:deleted` - Expense removed
- `alert:budget` - Budget threshold exceeded
- `insight:new` - New AI insight available
- `anomaly:detected` - Spending anomaly found

---

### 📥 Import Processing

#### Process Imported Transactions
```http
POST /api/import/process
Content-Type: application/json
x-user-id: user-123

{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Supermercado ABC",
      "amount": "150.50",
      "category": "Alimentação"
    }
  ],
  "skipDuplicates": true,
  "mapping": {
    "date": "Data",
    "description": "Descrição",
    "amount": "Valor",
    "category": "Categoria"
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "total": 10,
    "created": 8,
    "skipped": 1,
    "errors": 1
  },
  "createdIds": ["expense-123", "expense-456", ...],
  "errors": [
    {
      "transaction": { "date": "invalid", ... },
      "error": "Invalid date format"
    }
  ]
}
```

**Auto-Categorization Keywords:**
- **Alimentação**: mercado, supermercado, padaria, restaurante, ifood
- **Transporte**: uber, 99, gasolina, estacionamento, metro
- **Saúde**: farmacia, drogaria, hospital, clinica, medico
- **Educação**: escola, faculdade, curso, livro, livraria
- **Lazer**: cinema, teatro, netflix, spotify, jogo
- **Moradia**: aluguel, condominio, luz, agua, gas, internet

---

## 🧪 Testing

### Test AI Insights
```bash
curl -X POST http://localhost:3000/api/insights \
  -H "x-user-id: user-123" \
  -H "Content-Type: application/json" \
  -d '{"periodDays": 30, "focus": "savings"}'
```

### Test Push Notification VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### Test Email Configuration
```bash
curl -X POST http://localhost:3000/api/reports/email/test \
  -H "x-user-id: user-123" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test WebSocket Connection
```bash
npm install -g wscat
wscat -c "ws://localhost:3001?userId=user-123&familyId=family-456"
```

### Test File Upload
```bash
curl -X POST http://localhost:3000/api/upload/receipt \
  -H "x-user-id: user-123" \
  -F "receipt=@receipt.jpg" \
  -F "expenseId=expense-456"
```

---

## 🔒 Security Considerations

### Authentication
All endpoints use `x-user-id` header for authentication. In production, replace with proper JWT tokens:

```typescript
// middleware.ts
import { verifyToken } from '@/lib/auth';

const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const user = await verifyToken(token);
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### WebSocket Authentication
Implement token-based auth:

```javascript
const ws = new WebSocket(`ws://localhost:3001?token=${jwtToken}`);
```

Then validate in `websocket-server.ts`:
```typescript
const token = url.searchParams.get('token');
const user = await verifyToken(token);
if (!user) {
  ws.close(1008, 'Invalid token');
  return;
}
```

### S3 Security
- Use IAM roles with least privilege
- Enable bucket encryption
- Set CORS policies
- Use presigned URLs for temporary access

### VAPID Keys
- **NEVER** commit VAPID private keys to Git
- Rotate keys periodically
- Store securely in environment variables

---

## 📊 Monitoring

### WebSocket Statistics
```typescript
import { getWebSocketStats } from '@/lib/websocket-server';

const stats = getWebSocketStats();
console.log(`Total connections: ${stats.totalConnections}`);
console.log(`Total families: ${stats.totalFamilies}`);
```

### Email Scheduler Logs
```
✓ Email scheduler started (daily @ 9am, weekly @ Mon 9am, monthly @ 1st 9am)
Processing 5 daily reports...
✓ Report sent to user@example.com (daily)
```

### Push Notification Logs
```
✓ Push notification sent to 3 devices (user-123)
✗ Failed to send to device (expired subscription removed)
```

---

## 🚨 Troubleshooting

### "SMTP not configured"
- Verify `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env`
- Test SMTP credentials with email provider
- Check firewall rules for port 587

### "VAPID keys not configured"
- Run `npx web-push generate-vapid-keys`
- Add keys to `.env`
- Restart Next.js server

### "OpenAI API rate limit exceeded"
- Upgrade OpenAI plan or reduce usage
- Insights have 7-day cache to minimize calls
- Anomalies use statistical analysis as fallback

### "S3 upload failed"
- Verify AWS credentials in `.env`
- Check bucket permissions (s3:PutObject, s3:GetObject)
- Ensure bucket name is correct
- Files will fallback to local storage automatically

### "WebSocket connection refused"
- Start WebSocket server: `npx tsx websocket-server.mts`
- Check `WS_PORT` in `.env` (default: 3001)
- Verify firewall allows connections

---

## 📈 Performance Optimization

### Caching
- AI insights cached for 7 days
- Anomalies cached for 1 day
- Budget alerts calculated on-demand

### Rate Limiting
Consider adding rate limits to prevent abuse:

```typescript
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });
await limiter.check(req, 10, userId); // 10 requests per minute
```

### Database Indexing
All foreign keys are indexed. For additional performance:

```sql
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_receipts_expense ON receipts(expense_id);
CREATE INDEX idx_insights_user_expires ON insights(user_id, expires_at);
```

---

## 🎯 Next Steps

### Production Deployment
1. Set up PostgreSQL database (e.g., Heroku Postgres, AWS RDS)
2. Configure Redis for session management
3. Deploy Next.js to Vercel/Netlify
4. Deploy WebSocket server to separate service (e.g., Railway, Fly.io)
5. Set up S3 bucket with proper CORS
6. Configure domain for VAPID subject
7. Set up monitoring (Sentry, LogRocket)

### Feature Enhancements
- OCR text extraction from receipts (Tesseract.js, AWS Textract)
- Automatic category learning (ML model)
- Multi-language support for AI insights
- Voice input for expenses
- Expense forecasting (predictive analytics)
- Integration with bank APIs (Plaid, Salt Edge)

---

## 📝 Changelog

### v2.0.0 - Backend Services Complete
- ✅ AI-powered insights (OpenAI GPT-4o-mini)
- ✅ Anomaly detection (statistical + AI)
- ✅ Push notifications (Web Push API + VAPID)
- ✅ Email scheduling (node-cron + nodemailer)
- ✅ File storage (AWS S3 with local fallback)
- ✅ Real-time collaboration (WebSocket)
- ✅ Bank statement import processing
- ✅ Database schema extensions (8 new tables)
- ✅ Complete API documentation

---

## 🤝 Contributing

When adding new features:
1. Create library in `src/lib/` for reusable logic
2. Add API routes in `src/app/api/`
3. Update `.env.example` with new variables
4. Document endpoints in this README
5. Add TypeScript types in `src/types/`
6. Write tests (future enhancement)

---

## 📄 License

MIT License - See LICENSE file for details
