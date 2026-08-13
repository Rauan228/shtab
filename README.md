# Shtab

Кабинет владельца и CRM.  
**Фронт** — этот репозиторий, деплой на **Vercel**.  
**Агент / WhatsApp / PMS** — отдельный репо [`assistant`](https://github.com/Rauan228/assistant), VPS.

Shtab = штаб: календарь, объекты, брони. Не привязано к одной нише.

## Локально

```bash
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3001  

Пока прототип на демо-данных (логин — любой непустой пароль).  
API агента подключается через `API_URL` (rewrite `/api/admin/*`).

## Vercel

1. Import `Rauan228/shtab`
2. Framework: Next.js
3. Env:
   - `NEXT_PUBLIC_API_BASE` = `/api/admin`
   - `API_URL` = `http://YOUR_VPS:3044` (или `https://api.yourdomain.kz`)
4. Deploy

Браузер ходит на HTTPS Vercel. Next.js на сервере проксирует на VPS — mixed content нет.

На агенте выставь:

```
ADMIN_CORS_ORIGIN=https://shtab.vercel.app,https://*.vercel.app
```

(при same-origin rewrite CORS почти не нужен; нужен, если фронт дергает API напрямую.)

## Экраны

| URL | Экран |
|-----|--------|
| `/` | Вход |
| `/today` | Сегодня |
| `/calendar` | Календарь |
| `/objects` | Объекты |
| `/objects/[id]` | Карточка |
| `/settings` | Настройки |
| `/ds` | Дизайн-система |
