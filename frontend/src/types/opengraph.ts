/**
 * TypeScript types for OpenGraph metadata validation
 */

// Valid OpenGraph types according to the official specification
// https://ogp.me/#types
export type OpenGraphType =
  | "website"
  | "article"
  | "profile"
  | "book"
  | "video.movie"
  | "video.episode"
  | "video.tv_show"
  | "video.other"
  | "music.song"
  | "music.album"
  | "music.playlist"
  | "music.radio_station";

// Valid Twitter Card types
export type TwitterCardType =
  | "summary"
  | "summary_large_image"
  | "app"
  | "player";

// OpenGraph metadata interface
export interface OpenGraphMetadata {
  title: string;
  description: string;
  type: OpenGraphType;
  siteName: string;
  images?: string[];
  url?: string;
}

// Twitter metadata interface
export interface TwitterMetadata {
  card: TwitterCardType;
  title: string;
  description: string;
  images?: string[];
  site?: string;
  creator?: string;
}

// Complete metadata interface for Next.js
export interface PageMetadata {
  title: string;
  description: string;
  openGraph?: OpenGraphMetadata;
  twitter?: TwitterMetadata;
  keywords?: string[];
  robots?: string;
  viewport?: string;
}