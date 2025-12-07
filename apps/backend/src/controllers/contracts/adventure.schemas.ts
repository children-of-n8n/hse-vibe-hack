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

export const adventurePhotoWithReactionsSchema = t.Object({
  ...adventurePhotoSchema.properties,
  reactions: t.Array(adventureReactionSchema),
});

export type AdventurePhotoWithReactions = Static<
  typeof adventurePhotoWithReactionsSchema
>;

export const adventureWithMediaSchema = t.Object({
  ...adventureSchema.properties,
  photos: t.Array(adventurePhotoWithReactionsSchema, { default: [] }),
});

export type AdventureWithMedia = Static<typeof adventureWithMediaSchema>;

export const adventurePhotoUploadRequestSchema = t.Object({
  filename: t.String({ minLength: 1, maxLength: 256 }),
  contentType: t.Optional(t.String({ maxLength: 128 })),
});

export type AdventurePhotoUploadRequest = Static<
  typeof adventurePhotoUploadRequestSchema
>;

export const adventurePhotoUploadResponseSchema = t.Object({
  uploadUrl: t.String({ format: "uri" }),
  photoUrl: t.String({ format: "uri" }),
  expiresIn: t.Integer({ minimum: 1 }),
  key: t.String(),
});

export type AdventurePhotoUploadResponse = Static<
  typeof adventurePhotoUploadResponseSchema
>;

export const adventurePhotoConfirmSchema = t.Object({
  photoUrl: t.String({ format: "uri" }),
  caption: t.Optional(t.String({ maxLength: 160 })),
});

export type AdventurePhotoConfirm = Static<typeof adventurePhotoConfirmSchema>;

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
  AdventurePhotoWithReactions: adventurePhotoWithReactionsSchema,
  AdventureWithMedia: adventureWithMediaSchema,
  AdventureReaction: adventureReactionSchema,
  AdventureReactionInput: adventureReactionInputSchema,
  AdventurePhotoUploadRequest: adventurePhotoUploadRequestSchema,
  AdventurePhotoUploadResponse: adventurePhotoUploadResponseSchema,
  AdventurePhotoConfirm: adventurePhotoConfirmSchema,
});
