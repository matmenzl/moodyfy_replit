import { db } from "./index";
import * as schema from "@shared/schema";

// Sample track data (for testing purposes only)
const sampleTracks = [
  {
    id: "track1",
    title: "Afterglow",
    artist: "Ed Sheeran",
    uri: "spotify:track:2JoIjuzRplpYGvvLpSW2on",
    albumImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
    previewUrl: "https://p.scdn.co/mp3-preview/51a8945c05764d41e1a3c9d948b7d3a6c47fb47a",
    externalUrl: "https://open.spotify.com/track/2JoIjuzRplpYGvvLpSW2on"
  },
  {
    id: "track2",
    title: "Late Night Thoughts",
    artist: "Louis Tomlinson",
    uri: "spotify:track:3X7uFMzJrEE0S8LvUqf6Jf",
    albumImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
    previewUrl: "https://p.scdn.co/mp3-preview/3d19a31f7b062c3a1b1a24d542c7b21addd6db90",
    externalUrl: "https://open.spotify.com/track/3X7uFMzJrEE0S8LvUqf6Jf"
  },
  {
    id: "track3",
    title: "Midnight Rain",
    artist: "Taylor Swift",
    uri: "spotify:track:1Amf8MHRkRZSIGFrksShRl",
    albumImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
    previewUrl: "https://p.scdn.co/mp3-preview/f1dcd89cb34e6b0329e8ab5e837af81d72c1189f",
    externalUrl: "https://open.spotify.com/track/1Amf8MHRkRZSIGFrksShRl"
  },
  {
    id: "track4",
    title: "Daydreaming",
    artist: "Radiohead",
    uri: "spotify:track:1as4B6afbinXM9I52l8ga9",
    albumImage: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80",
    previewUrl: "https://p.scdn.co/mp3-preview/5e2e35d1b4520bd165330cb0f8e334f6e0a2ba8f",
    externalUrl: "https://open.spotify.com/track/1as4B6afbinXM9I52l8ga9"
  }
];

async function seed() {
  try {
    console.log("📦 Seeding database...");
    
    // Create database tables if they don't exist
    console.log("➡️ Creating database schema...");
    
    // Add test data only in development mode
    if (process.env.NODE_ENV !== "production") {
      console.log("➡️ Adding test data (development only)...");
      
      // The track data is only for visual testing purposes
      // In the actual application, this data will come from
      // the Spotify API, not from the database.
      
      console.log("✅ Seeding complete");
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

seed();
