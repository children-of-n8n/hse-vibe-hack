import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarIcon,
  Check,
  Compass,
  Copy,
  Mountain,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { Adventure } from "@acme/backend/controllers/contracts/adventure.schemas.ts";

import { api } from "@acme/frontend/shared/config/api.ts";
import { cn } from "@acme/frontend/shared/lib/utils.ts";
import { Button } from "@acme/frontend/shared/ui/button.tsx";
import { Calendar } from "@acme/frontend/shared/ui/calendar.tsx";
import { Input } from "@acme/frontend/shared/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@acme/frontend/shared/ui/popover.tsx";

export const CreateAdventure = () => {
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date>();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [copied, setCopied] = useState(false);
  const useCreateAdventure = useMutation({
    mutationFn: async () =>
      (
        await api.adventures.post({
          title: name,
          startsAt: date,
        })
      ).data,
  });

  const handleCreate = () => {
    if (!name.trim() || !date) {
      toast("Заполните все поля");
      return;
    }

    useCreateAdventure.mutateAsync().then((data) => {
      setAdventure(data);
    });
    toast("Приключение создано!");
  };

  const getShareUrl = () => {
    return `https://${window.location.host}/join/${useCreateAdventure?.data?.shareToken ?? ""}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: adventure?.title,
          text: `Присоединяйся к приключению "${adventure?.title}"!`,
          url: getShareUrl(),
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const resetForm = () => {
    setAdventure(null);
    setName("");
    setDate(undefined);
    setCopied(false);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-safe">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <header className="mb-8 animate-fade-in text-center">
          <div className="gradient-hero mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow">
            <Mountain className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-2xl text-foreground">
            {adventure ? "Приключение создано!" : "Новое приключение"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {adventure
              ? "Пригласите друзей присоединиться"
              : "Создайте путешествие и пригласите друзей"}
          </p>
        </header>

        {!adventure ? (
          /* Create Form */
          <div className="animate-slide-up space-y-5">
            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <div className="space-y-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="font-medium text-foreground text-sm">
                    Название
                  </label>
                  <div className="relative">
                    <Compass className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Поход на Эльбрус"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="font-medium text-foreground text-sm">
                    Дата начала
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        {date ? (
                          format(date, "d MMMM yyyy", { locale: ru })
                        ) : (
                          <span>Выберите дату</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Create Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleCreate}
              disabled={useCreateAdventure.isPending}
            >
              Создать приключение
            </Button>
          </div>
        ) : (
          /* Success State */
          <div className="animate-scale-in space-y-5">
            {/* Adventure Card */}
            <div className="rounded-2xl bg-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-3">
                <div className="gradient-warm flex h-12 w-12 items-center justify-center rounded-xl">
                  <Compass className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    {adventure.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {format(adventure.startsAt, "d MMMM yyyy", { locale: ru })}
                  </p>
                </div>
              </div>

              {/* Share Link */}
              <div className="space-y-3">
                <label className="font-medium text-muted-foreground text-sm">
                  Ссылка для друзей
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 truncate rounded-lg border-2 border-input bg-muted/50 px-4 py-3 text-foreground text-sm">
                    {getShareUrl()}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Share Button */}
            <Button size="lg" className="w-full" onClick={handleNativeShare}>
              <Share2 className="h-5 w-5" />
              Поделиться с друзьями
            </Button>

            {/* New Adventure Button */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={resetForm}
            >
              Создать ещё одно
            </Button>
          </div>
        )}
      </div>
      {/* Back Button - Always at bottom */}
      <div className="mt-6 border-border border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
      </div>
    </main>
  );
};
