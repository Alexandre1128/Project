# SportTips Pro (Web + Mobile)

Plataforma moderna para fornecer palpites desportivos semanais com subscrição mensal.

## Funcionalidades incluídas

- Registo e autenticação com email/palavra-passe e JWT.
- Área privada com palpites da semana, histórico e estatísticas de acerto.
- Painel admin (publicar, editar, apagar palpites e ver utilizadores/subscrições).
- Sistema de níveis (BASIC, PREMIUM, VIP).
- Base para pagamentos Stripe (checkout de subscrição) e transferência manual.
- Sistema de afiliados (código por utilizador + referência no registo).
- Proteção contra partilha de conta (limite por número de dispositivos/planos).
- Frontend web responsivo em React + dashboard com gráfico.
- App mobile em React Native (Expo).

## Stack

- **Frontend web:** React + Vite
- **Mobile:** React Native + Expo
- **Backend:** Node.js + Express
- **Base de dados:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Pagamentos:** Stripe (cartão) + fluxo manual de transferência

## Estrutura

```
apps/
  api/      # API Express + SQL
  web/      # Aplicação React web
  mobile/   # Aplicação React Native (Expo)
```

## Arranque rápido

1. Subir PostgreSQL:

```bash
docker compose up -d
```

2. Instalar dependências:

```bash
npm install
```

3. Configurar API:

```bash
cp apps/api/.env.example apps/api/.env
```

4. Correr API e Web em paralelo (em terminais separados):

```bash
npm run dev:api
npm run dev:web
```

5. Mobile:

```bash
npm run dev:mobile
```

## Endpoints principais

- `POST /auth/register`
- `POST /auth/login`
- `GET /user/profile`
- `GET /tips/week`
- `GET /tips/history`
- `GET /tips/stats`
- `POST /admin/tips`
- `PUT /admin/tips/:id`
- `DELETE /admin/tips/:id`
- `GET /admin/users`
- `POST /subscriptions/checkout`
- `POST /subscriptions/manual-transfer`

## Escalabilidade e segurança (próximos passos)

- Refresh tokens + rotação.
- Rate limiting + WAF + CAPTCHA no registo/login.
- Filas para notificações (RabbitMQ/SQS).
- Cache de leituras (Redis).
- Observabilidade (OpenTelemetry + dashboards).
- CI/CD com testes e migrações automáticas.
