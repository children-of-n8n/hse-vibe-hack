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

export const createAiClient = (): AiClient => {
  // Placeholder stub: replace with real LLM integration when ready.
  return {
    async generateAdventureDescription(input) {
      return `Идея: ${input.title}. Компания: ${names(input.participants)}. Будет весело и запомнится.`;
    },
    async generateAdventureSummary(input) {
      return `Они завершили "${input.title}": ${names(input.participants)}. Итог: ${input.description.slice(0, 120)}...`;
    },
  };
};
export const adventureDescriptionPrompt = `
Ты — дружелюбный копирайтер. На входе: название, список участников с интересами.
Сгенерируй 1 абзац до 40 слов с ярким образом, без клише, без выдуманных фактов.
Заверши эмодзи, отражающим настроение. Язык ответа: русский.
`.trim();

export const adventureSummaryPrompt = `
Ты — внимательный storyteller. На входе: название приключения, участники, краткое описание.
Напиши 2 предложения: динамичный recap + мягкий вывод. До 50 слов. Упомяни всех участников.
Не добавляй фактов, которых нет во входе. Язык ответа: русский.
`.trim();
