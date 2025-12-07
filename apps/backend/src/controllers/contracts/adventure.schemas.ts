import { Elysia, type Static, t } from "elysia";

export const adventureStatusSchema = t.Union([
  t.Literal("upcoming"),
  t.Literal("completed"),
]);

export type AdventureStatus = Static<typeof adventureStatusSchema>;

export const adventureParticipantSchema = t.Object({
  id: t.String({ format: "uuid" }),
  username: t.String({ minLength: 1, maxLength: 64 }),
  avatarUrl: t.Optional(t.String({ format: "uri" })),
});

export type AdventureParticipant = Static<typeof adventureParticipantSchema>;

export const adventureSchema = t.Object({
  id: t.String({ format: "uuid" }),
  title: t.String({ minLength: 1, maxLength: 140 }),
  description: t.String({
    minLength: 1,
    maxLength: 512,
    description: "AI-generated playful description",
  }),
  status: adventureStatusSchema,
  shareToken: t.String({
    minLength: 6,
    maxLength: 32,
    description: "Shareable token for instant join",
  }),
  participants: t.Array(adventureParticipantSchema),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

export type Adventure = Static<typeof adventureSchema>;

export const adventureCreateSchema = t.Object({
  title: adventureSchema.properties.title,
  friendIds: t.Optional(
    t.Array(t.String({ format: "uuid" }), {
      description: "Friends to invite",
    }),
  ),
});

export type AdventureCreate = Static<typeof adventureCreateSchema>;

export const adventureUpdateSchema = t.Partial(
  t.Object({
    title: adventureSchema.properties.title,
    description: adventureSchema.properties.description,
  }),
);

export type AdventureUpdate = Static<typeof adventureUpdateSchema>;

export const adventureShareSchema = t.Object({
  token: adventureSchema.properties.shareToken,
  url: t.String({ description: "Full invite link" }),
});

export type AdventureShare = Static<typeof adventureShareSchema>;

export const adventureJoinSchema = t.Object({
  token: adventureSchema.properties.shareToken,
});

export type AdventureJoin = Static<typeof adventureJoinSchema>;

export const adventurePhotoSchema = t.Object({
  id: t.String({ format: "uuid" }),
  adventureId: adventureSchema.properties.id,
  url: t.String({ format: "uri" }),
  uploader: adventureParticipantSchema,
  caption: t.Optional(t.String({ maxLength: 160 })),
  createdAt: t.Date(),
});

export type AdventurePhoto = Static<typeof adventurePhotoSchema>;

export const adventureReactionSchema = t.Object({
  id: t.String({ format: "uuid" }),
  photoId: adventurePhotoSchema.properties.id,
  userId: adventureParticipantSchema.properties.id,
  emoji: t.String({ minLength: 1, maxLength: 8 }),
  createdAt: t.Date(),
});

export type AdventureReaction = Static<typeof adventureReactionSchema>;

export const adventureReactionInputSchema = t.Object({
  emoji: adventureReactionSchema.properties.emoji,
});

export type AdventureReactionInput = Static<
  typeof adventureReactionInputSchema
>;

export const adventureContracts = new Elysia({
  name: "adventure-contracts",
}).model({
  AdventureStatus: adventureStatusSchema,
  AdventureParticipant: adventureParticipantSchema,
  Adventure: adventureSchema,
  AdventureCreate: adventureCreateSchema,
  AdventureUpdate: adventureUpdateSchema,
  AdventureShare: adventureShareSchema,
  AdventureJoin: adventureJoinSchema,
  AdventurePhoto: adventurePhotoSchema,
  AdventureReaction: adventureReactionSchema,
  AdventureReactionInput: adventureReactionInputSchema,
});
