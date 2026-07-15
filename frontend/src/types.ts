export interface SearchResult {
  chapter: string;
  id: number;
  teller: string | null;
  model: string | null;
  title: string | null;
  place: string | null;
  content: string;
  voiceId: string;
  audioPath: string;
  sinner: string | null;
  tags: string[];
}

export interface NameCount {
  name: string;
  count: number;
}

export type TagGroups = Record<string, NameCount[]>;
