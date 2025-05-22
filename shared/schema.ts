import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - stores basic user info
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Spotify tokens table - stores Spotify auth data
export const spotifyTokens = pgTable("spotify_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Playlists table - stores generated playlists
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  spotifyId: text("spotify_id"),
  name: text("name").notNull(),
  description: text("description"),
  mood: text("mood").notNull(),
  tracks: json("tracks").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  spotifyTokens: many(spotifyTokens),
  playlists: many(playlists)
}));

export const spotifyTokensRelations = relations(spotifyTokens, ({ one }) => ({
  user: one(users, {
    fields: [spotifyTokens.userId],
    references: [users.id]
  })
}));

export const playlistsRelations = relations(playlists, ({ one }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id]
  })
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSpotifyTokenSchema = createInsertSchema(spotifyTokens).pick({
  userId: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).pick({
  userId: true,
  spotifyId: true,
  name: true,
  description: true,
  mood: true,
  tracks: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSpotifyToken = z.infer<typeof insertSpotifyTokenSchema>;
export type SpotifyToken = typeof spotifyTokens.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;
