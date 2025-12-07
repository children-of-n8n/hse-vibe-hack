import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatMistralAI } from "@langchain/mistralai";

type Participant = { username: string };

export type AiClient = {
  generateAdventureDescription: (input: {
    title: string;
    participants: Participant[];
  }) => Promise<string>;
  generateAdventureSummary: (input: {
    title: string;
    participants: Participant[];
    description: string;
  }) => Promise<string>;
};

const names = (participants: Participant[]) =>
  participants.map((p) => p.username).join(", ") || "друзья";

const mockAdventureDescription = (input: {
  title: string;
  participants: Participant[];
}) =>
  [
    `Идея: ${input.title}.`,
    `Компания: ${names(input.participants)}.`,
    "Будет весело и запомнится.",
  ].join(" ");

const mockAdventureSummary = (input: {
  title: string;
  participants: Participant[];
  description: string;
}) =>
  [
    `Они уже завершили "${input.title}": ${names(input.participants)}.`,
    `Итог: выполнили задуманное и побывали там, где планировали: ${input.description.slice(0, 120)}...`,
  ].join(" ");

const fallbackClient: AiClient = {
  async generateAdventureDescription(input) {
    return mockAdventureDescription(input);
  },
  async generateAdventureSummary(input) {
    return mockAdventureSummary(input);
  },
};

const extractText = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => extractText(item))
      .filter(Boolean)
      .join(" ");
  }
  if (content && typeof content === "object" && "text" in content) {
    const maybe = (content as { text?: string }).text;
    if (typeof maybe === "string") return maybe;
  }
  return "";
};

const isTestRuntime = Boolean(
  process.env.NODE_ENV === "test" ||
    process.env.CI === "true" ||
    process.argv.some((arg) => arg === "test" || arg.endsWith("/bun-test")),
);

const runMistral = async (
  llm: ChatMistralAI,
  messages: [SystemMessage, HumanMessage],
  fallback: string,
) => {
  try {
    const response = await llm.invoke(messages);
    const text = extractText(response.content).trim();
    return text.length ? text : fallback;
  } catch (error) {
    console.error("Mistral AI request failed", error);
    return fallback;
  }
};

export const createAiClient = (): AiClient => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey || isTestRuntime) {
    console.warn(
      "Mistral is disabled (no key or test/CI), using fallback AI responses.",
    );
    return fallbackClient;
  }

  const llm = new ChatMistralAI({
    apiKey,
    model: process.env.MISTRAL_MODEL ?? "mistral-small-latest",
    temperature: 0.6,
    maxRetries: 2,
  });

  return {
    async generateAdventureDescription(input) {
      const payload: [SystemMessage, HumanMessage] = [
        new SystemMessage(adventureDescriptionPrompt),
        new HumanMessage(
          [
            `Название: ${input.title}`,
            `Участники: ${names(input.participants)}`,
            "Формат: до 40 слов, эмодзи в конце.",
          ].join("\n"),
        ),
      ];

      return runMistral(llm, payload, mockAdventureDescription(input));
    },
    async generateAdventureSummary(input) {
      const payload: [SystemMessage, HumanMessage] = [
        new SystemMessage(adventureSummaryPrompt),
        new HumanMessage(
          [
            `Название: ${input.title}`,
            `Участники: ${names(input.participants)}`,
            `Описание: ${input.description}`,
            "Формат: 2 предложения <=50 слов, без новых фактов, прошедшее время.",
            "Отрази, что участники уже сделали задуманное и побывали в описанных местах.",
          ].join("\n"),
        ),
      ];

      return runMistral(llm, payload, mockAdventureSummary(input));
    },
  };
};
export const adventureDescriptionPrompt = [
  "Ты — дружелюбный копирайтер.",
  "На входе: название и список участников.",
  "Сгенерируй абзац (до 40 слов) с ярким образом без клише.",
  "Заверши эмодзи, отражающим настроение.",
  "Язык ответа: русский.",
].join("\n");

export const adventureSummaryPrompt = [
  "Ты — внимательный storyteller.",
  "На входе: название, участники, описание.",
  "Напиши 2 предложения: динамичный recap + мягкий вывод (<=50 слов).",
  "Пиши в прошедшем времени: упомяни всех участников, что они уже сделали и где побывали, опираясь только на описание.",
  "Не добавляй новых фактов.",
  "Язык ответа: русский.",
].join("\n");
