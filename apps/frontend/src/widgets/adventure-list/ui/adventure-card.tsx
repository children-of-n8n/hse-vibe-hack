import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle, ChevronDown, List, Loader } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { AdventureWithMedia } from "@acme/backend/controllers/contracts/adventure.schemas";

import { api } from "@acme/frontend/shared/config/api";
import { Button } from "@acme/frontend/shared/ui/button";

interface AdventureCardProps {
  isOwn?: boolean;
  adventure?: AdventureWithMedia;
  onOpenList?: () => void;
  onComplete?: () => void;
  totalAdventures?: number;
  showScrollIndicator?: boolean;
}

export const AdventureCard = ({
  isOwn = false,
  adventure,
  onOpenList,
  onComplete,
  totalAdventures = 0,
  showScrollIndicator = false,
}: AdventureCardProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const addReactionMutation = useMutation({
    mutationFn: async (reaction: string) => {
      await api
        .adventures({ id: adventure?.id ?? "" })
        .reactions.post({ emoji: reaction });
      await queryClient.invalidateQueries({ queryKey: ["adventures"] });
    },
    onError: () => {
      toast.error("Ошибка добавления реакции!");
    },
    onSuccess: () => {
      toast.success("Реакция успешно добавлена!");
    },
  });

  const uploadPhotoToBackend = async (file: File): Promise<void> => {
    try {
      console.log("Starting upload for adventure:", adventure?.id);

      await api.adventures({ id: adventure?.id ?? "" }).photos.post({ file });

      console.log("Photo uploaded successfully");
      await queryClient.invalidateQueries({ queryKey: ["adventures"] });
      toast.success("Фото успешно загружено!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Ошибка загрузки фото!");
      throw error;
    }
  };

  const handlePhotoSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    setIsUploading(true);
    try {
      console.log("Selected file:", file.name, file.size, file.type);

      await uploadPhotoToBackend(file);

      onComplete?.();

      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error:", error);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  if (isOwn && adventure) {
    const isCompleted = adventure.status === "completed";
    const displayImage =
      isCompleted && adventure.photos[0]
        ? adventure.photos[0]
        : adventure.photos[0];

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <section className="adventure-card overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: `url(${displayImage})` }}
          />
          <div className="relative z-10 flex h-full w-full flex-col px-6 py-12">
            {/* Header with date and list button */}
            <div className="mb-auto flex items-center justify-between">
              <span className="rounded-full bg-background/50 py-4 text-foreground text-sm backdrop-blur-sm">
                {adventure.createdAt.toLocaleDateString("ru", {
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="flex items-center gap-1 font-medium text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Завершено
                  </span>
                ) : (
                  <span className="font-medium text-primary text-sm">
                    Ближайшее
                  </span>
                )}
                {totalAdventures > 1 && (
                  <button
                    onClick={onOpenList}
                    className="flex items-center gap-2 rounded-full bg-background/50 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-background/70"
                  >
                    <List className="h-4 w-4" />
                    <span className="text-sm">{totalAdventures}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main content */}
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              {/* Photo */}
              <div className="mb-8 h-64 w-64 overflow-hidden rounded-3xl border-2 border-border/20 shadow-2xl">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : adventure?.photos[0]?.url ? (
                  <img
                    src={adventure.photos[0]?.url}
                    alt={adventure.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <div className="h-20 w-20 rounded-2xl bg-muted/30" />
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="mb-3 font-bold text-2xl">{adventure.title}</h2>

              {/* Description */}
              {adventure.description && (
                <p className="mb-6 max-w-sm text-base text-muted-foreground">
                  {adventure.description}
                </p>
              )}
            </div>

            {adventure?.participants && adventure.participants.length > 0 && (
              <div className="avatar-stack mx-auto mb-8">
                {adventure.participants.slice(0, 4).map((p, i) => (
                  <div
                    key={i}
                    className="avatar-item"
                    style={{ zIndex: 10 - i }}
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.username}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{p.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                ))}
                {adventure.participants.length > 4 && (
                  <div className="avatar-item bg-primary text-primary-foreground">
                    +{adventure.participants.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Bottom actions */}
            <div className="mt-auto flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {!isCompleted && (
                  <button
                    onClick={handleCameraClick}
                    disabled={isUploading}
                    className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span>Завершить</span>
                      </>
                    )}
                  </button>
                )}

                {totalAdventures > 0 && (
                  <button
                    onClick={onOpenList}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <List className="h-5 w-5" />
                    <span>Все ({totalAdventures})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {showScrollIndicator && (
            <div className="-translate-x-1/2 absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-muted-foreground">
              <span className="text-sm">Приключения друзей</span>
              <ChevronDown className="scroll-indicator h-6 w-6" />
            </div>
          )}
        </section>
      </>
    );
  }

  // Card with friend's adventure content
  return (
    <section className="adventure-card overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${adventure?.photos[0]?.url})` }}
      />
      <div className="relative z-10 flex h-full w-full flex-col px-6 py-12">
        {/* Header with date */}
        {adventure?.createdAt && (
          <div className="mb-auto flex items-center justify-between">
            <span className="rounded-full bg-background/50 py-4 text-foreground text-sm backdrop-blur-sm">
              {adventure.createdAt.toLocaleDateString("ru", {
                day: "numeric",
                month: "long",
              })}
            </span>
            {adventure.creator && (
              <span className="rounded-full bg-background/50 py-4 text-foreground text-sm backdrop-blur-sm">
                от {adventure.creator.username}
              </span>
            )}
          </div>
        )}

        {/* Main content - centered */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Adventure image */}

          {/* Title */}
          <h2 className="mb-3 font-bold text-2xl">
            {adventure?.title || "Приключение"}
          </h2>

          {/* Description */}
          <p className="mb-6 max-w-sm text-base text-muted-foreground">
            {adventure?.description || "Описание приключения"}
          </p>

          {/* Participants */}
          {adventure?.participants && adventure.participants.length > 0 && (
            <div className="avatar-stack mb-8">
              {adventure.participants.slice(0, 4).map((p, i) => (
                <div key={i} className="avatar-item" style={{ zIndex: 10 - i }}>
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt={p.username}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{p.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ))}
              {adventure.participants.length > 4 && (
                <div className="avatar-item bg-primary text-primary-foreground">
                  +{adventure.participants.length - 4}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {["🔥", "❤️", "😍", "😂", "🤔"].map((emoji) => {
              // Подсчитываем количество реакций с этим эмодзи
              const count = (adventure?.reactions || []).filter(
                (r) => r.emoji === emoji,
              ).length;

              return (
                <div key={emoji} className="relative">
                  <Button
                    variant="outline"
                    className="size-12 cursor-pointer rounded-full text-3xl transition-transform hover:scale-110"
                    onClick={() => addReactionMutation.mutate(emoji)}
                    disabled={addReactionMutation.isPending}
                  >
                    {emoji}
                  </Button>
                  {count > 0 && (
                    <span className="-top-2 -right-2 absolute flex size-5 items-center justify-center rounded-full bg-red-500 font-bold text-[10px] text-white">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Scroll indicator */}
      {showScrollIndicator && (
        <div className="-translate-x-1/2 absolute bottom-8 left-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <ChevronDown className="scroll-indicator h-6 w-6" />
        </div>
      )}
    </section>
  );
};
