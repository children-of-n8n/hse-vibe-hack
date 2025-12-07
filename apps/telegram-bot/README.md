# @acme/telegram-bot

Телеграм-бот, который показывает кнопку для запуска веб‑приложения и
принимает HTTP-запросы для отправки уведомлений пользователям.

## Запуск
- Скопируйте `.env.example` в `.env` и заполните переменные.
- Локально: `bun run --filter @acme/telegram-bot dev`.
- Прод: `bun run --filter @acme/telegram-bot start`.

## Переменные окружения
- `BOT_TOKEN` — токен бота (обязателен).
- `BOT_NOTIFY_SECRET` — bearer-токен для защиты `POST /notify` (обязателен).
- `WEB_APP_URL` — адрес веб-приложения (по умолчанию
  `https://hsevibehack.hacks.intezya.ru`).
- `PORT` — порт HTTP API (по умолчанию `4001`).

## Docker
- Dockerfile: `apps/telegram-bot/Dockerfile` (сборка бинарника Bun).
- GitHub Actions билдит и пушит образ
  `ghcr.io/<owner>/hse-vibe-hack-telegram-bot:latest` и дергает Dokploy при
  наличии секретов `DOKPLOY_API_KEY` и `DOKPLOY_TELEGRAM_BOT_APPLICATION_ID`.

## Команды бота
- `/start` и `/app` — отправляют кнопку «Открыть веб-приложение» с web app
  кнопкой Telegram.

## HTTP API
- `GET /health` — проверка живости.
- `POST /notify` — отправка сообщения:
  - Headers: `Authorization: Bearer <BOT_NOTIFY_SECRET>`
  - Body (JSON):
    - `chatId` — id чата/пользователя,
    - `text` — текст уведомления,
    - `parseMode` — `HTML` | `Markdown` | `MarkdownV2` (опционально),
    - `threadId` — id топика (опционально),
    - `disableLinkPreview` — выключить превью ссылок (опционально).
