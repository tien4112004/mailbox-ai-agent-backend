/**
 * Shared enums and constants for AI summary and Kanban features
 */

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  GOOGLE = 'google', // Alias for Gemini (Google's AI provider)
}

export enum SummaryLength {
  SHORT = 'short',
  MEDIUM = 'medium',
  LONG = 'long',
}

export enum SummaryTone {
  FORMAL = 'formal',
  CASUAL = 'casual',
  TECHNICAL = 'technical',
}
