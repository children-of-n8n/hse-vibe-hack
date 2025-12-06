# Тестирование Elysia через bun:test

Инструкции по написанию unit-тестов для `apps/backend` на Elysia с использованием встроенного раннера `bun:test`.

## Где держать тесты
- Создавайте `*.test.ts` рядом с проверяемым кодом или в `apps/backend/test` для интеграционных сценариев.
- Используйте `@acme/backend/*` алиасы вместо глубоких относительных импортов, как и в основном коде.
- Избегайте сетевых вызовов в юнитах: мокайте внешние зависимости.

## Быстрый старт
1. Убедитесь, что зависимости установлены: `bun install` в корне монорепозитория.
2. Перейдите в `apps/backend` и запустите тесты: `bun test`.

## Базовый unit-тест Elysia
Метод `Elysia.handle` принимает стандартный `Request` и возвращает `Response`, поэтому можно симулировать HTTP-запросы без сервера.

```typescript
// apps/backend/test/index.test.ts
import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";

describe("Elysia", () => {
  it("возвращает текстовый ответ", async () => {
    const app = new Elysia().get("/", () => "hi");

    const response = await app.handle(new Request("http://localhost/"));

    expect(await response.text()).toBe("hi");
  });
});
```

- Запрос должен содержать полноценный URL (`http://localhost/user`), относительные пути вроде `/user` не работают.
- Тесты можно запускать по пути, например: `bun test apps/backend/test/index.test.ts`.

## Eden Treaty (опционально)
Для end-to-end проверки типобезопасности можно использовать `@elysiajs/eden`:

```typescript
// apps/backend/test/eden.test.ts
import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { treaty } from "@elysiajs/eden";

const app = new Elysia().get("/hello", "hi");
const api = treaty(app);

describe("Eden Treaty", () => {
  it("возвращает типобезопасный ответ", async () => {
    const { data, error } = await api.hello.get();

    expect(error).toBeNull();
    expect(data).toBe("hi");
  });
});
```

## Дополнительные советы
- Поддерживайте Biome-стиль (2 пробела, двойные кавычки, точки с запятой, сортировка импортов).
- Добавляйте тесты для сервисов и контроллеров в первую очередь; макросы/контракты можно проверять через HTTP-хэндлы как в примере выше.
- При добавлении новых зависимостей для тестов убедитесь, что они устанавливаются в `apps/backend` и не требуют сетевых вызовов во время выполнения тестов.
