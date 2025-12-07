import { Elysia, StatusMap, t } from "elysia";
import { Bot, InlineKeyboard } from "grammy";
import type { ParseMode } from "grammy/types";

type NotifyRequest = {
  chatId: number | string;
  text: string;
  parseMode?: ParseMode;
  threadId?: number;
  disableLinkPreview?: boolean;
};

const botToken = process.env.BOT_TOKEN;
const notifySecret = process.env.BOT_NOTIFY_SECRET;
const webAppUrl =
  process.env.WEB_APP_URL ?? "https://hsevibehack.hacks.intezya.ru";
const port = Number(process.env.PORT ?? 4001);

if (!botToken) {
  throw new Error("BOT_TOKEN is required");
}

if (!notifySecret) {
  throw new Error("BOT_NOTIFY_SECRET is required");
}

const bot = new Bot(botToken);
const openAppKeyboard = new InlineKeyboard().webApp(
  "Открыть веб-приложение",
  webAppUrl,
);

const sendWebAppEntry = async (chatId: number | string) =>
  bot.api.sendMessage(
    chatId,
    "Открывай приложение, чтобы получить доступ к сервису.",
    {
      reply_markup: openAppKeyboard,
      disable_notification: true,
    },
  );

bot.command("start", async (ctx) => {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    return;
  }

  await sendWebAppEntry(chatId);
});

bot.command("app", async (ctx) => {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    return;
  }

  await sendWebAppEntry(chatId);
});

bot.on("message", async (ctx) => {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    return;
  }

  await ctx.reply("Нажми кнопку, чтобы открыть веб-приложение.", {
    reply_markup: openAppKeyboard,
    disable_notification: true,
  });
});

const app = new Elysia()
  .get("/health", () => "OK")
  .post(
    "/notify",
    async ({ headers, body, set }) => {
      const authHeader = headers.authorization ?? headers.Authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        set.status = "Unauthorized";
        return { message: "Missing bearer token" };
      }

      const token = authHeader.split(" ")[1];

      if (token !== notifySecret) {
        set.status = "Unauthorized";
        return { message: "Invalid bearer token" };
      }

      const { chatId, text, parseMode, threadId, disableLinkPreview } = body;

      try {
        const message = await bot.api.sendMessage(chatId, text, {
          parse_mode: parseMode,
          message_thread_id: threadId,
          link_preview_options: { is_disabled: disableLinkPreview ?? false },
        });

        return {
          ok: true,
          messageId: message.message_id,
          chatId: message.chat.id,
          date: message.date,
        };
      } catch (error) {
        set.status = "Internal Server Error";
        return {
          ok: false,
          message: "Failed to send notification",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    {
      detail: {
        summary: "Send Telegram notification",
        description:
          "Send a notification to a Telegram chat. Protected by bearer token.",
      },
      body: t.Object({
        chatId: t.Union([t.String(), t.Number()]),
        text: t.String(),
        parseMode: t.Optional(
          t.Union([
            t.Literal("HTML"),
            t.Literal("Markdown"),
            t.Literal("MarkdownV2"),
          ]),
        ),
        threadId: t.Optional(t.Number()),
        disableLinkPreview: t.Optional(t.Boolean()),
      }),
      response: {
        [StatusMap.OK]: t.Object({
          ok: t.Literal(true),
          messageId: t.Number(),
          chatId: t.Number(),
          date: t.Number(),
        }),
        [StatusMap.Unauthorized]: t.Object({
          message: t.String(),
        }),
        [StatusMap["Internal Server Error"]]: t.Object({
          ok: t.Literal(false),
          message: t.String(),
          error: t.String(),
        }),
      },
    },
  )
  .listen(port);

await bot.api.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "Открыть приложение",
    web_app: { url: webAppUrl },
  },
});

console.log(`Telegram bot HTTP API is listening on port ${port}`);
console.log("Bot is starting long polling...");

await bot.start();
