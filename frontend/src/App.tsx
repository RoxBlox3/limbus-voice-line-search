import { useEffect, useRef, useState } from 'react';
import { fetchSinners, fetchTags, searchVoicelines } from './api';
import { ChipGroup } from './components/ChipGroup';
import { ResultCard } from './components/ResultCard';
import type { NameCount, SearchResult, TagGroups } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [sinners, setSinners] = useState<NameCount[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroups>({});
  const [activeSinners, setActiveSinners] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    fetchSinners().then(setSinners);
    fetchTags().then(setTagGroups);
  }, []);

  useEffect(() => {
    async function runSearch() {
      const trimmed = query.trim();
      if (!trimmed && activeSinners.size === 0 && activeTags.size === 0) {
        setResults([]);
        setStatus('');
        return;
      }
      setStatus('Searching...');
      const data = await searchVoicelines({ q: trimmed, sinners: activeSinners, tags: activeTags });
      setStatus(data.length + ' result(s)' + (data.length === 200 ? ' (showing first 200)' : ''));
      setResults(data);
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(runSearch, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, activeSinners, activeTags]);

  function toggleSinner(name: string) {
    setActiveSinners((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleTag(value: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clearFilters() {
    setActiveSinners(new Set());
    setActiveTags(new Set());
    setQuery('');
  }

  function handleTagAdded(model: string, tag: string) {
    setResults((prev) =>
      prev.map((r) => (r.model === model && !r.tags.includes(tag) ? { ...r, tags: [...r.tags, tag] } : r)),
    );
    fetchTags().then(setTagGroups);
  }

  return (
    <>
      <h1>Limbus Voiceline Search</h1>
      <input
        id="q"
        type="text"
        placeholder="Search dialogue text, e.g. Lion struggled against"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ChipGroup title="Sinners" items={sinners} activeValues={activeSinners} onToggle={toggleSinner} />
      {Object.entries(tagGroups).map(([category, items]) => (
        <ChipGroup
          key={category}
          title={category}
          items={items}
          activeValues={activeTags}
          onToggle={toggleTag}
          getValue={(item) => `${category}: ${item.name}`}
        />
      ))}
      <div id="filters">
        <button type="button" id="clearFilters" onClick={clearFilters}>
          Clear filters
        </button>
      </div>
      <div id="status">{status}</div>
      <div id="results">
        {results.map((r) => (
          <ResultCard key={`${r.chapter}-${r.id}`} result={r} onTagAdded={handleTagAdded} />
        ))}
      </div>
    </>
  );
}
