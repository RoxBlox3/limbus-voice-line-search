import type { NameCount, SearchResult, TagGroups } from './types';

export async function fetchSinners(): Promise<NameCount[]> {
  const res = await fetch('/api/sinners');
  return res.json();
}

export async function fetchTags(): Promise<TagGroups> {
  const res = await fetch('/api/tags');
  return res.json();
}

export async function addCharacterTag(model: string, tag: string): Promise<void> {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, tag }),
  });
  if (!res.ok) throw new Error('Failed to add tag');
}

export interface SearchParams {
  q: string;
  sinners: Set<string>;
  tags: Set<string>;
}

export async function searchVoicelines({ q, sinners, tags }: SearchParams): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (sinners.size > 0) params.set('sinner', [...sinners].join(','));
  if (tags.size > 0) params.set('tags', [...tags].join(','));
  const res = await fetch('/api/search?' + params.toString());
  return res.json();
}
