import { useState } from 'react';
import { addCharacterTag } from '../api';
import type { SearchResult } from '../types';

interface ResultCardProps {
  result: SearchResult;
  onTagAdded: (model: string, tag: string) => void;
}

export function ResultCard({ result, onTagAdded }: ResultCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const meta = [result.chapter, result.teller, result.place].filter(Boolean).join(' · ');
  const audioUrl = '/audio?path=' + encodeURIComponent(result.audioPath);
  const customTags = result.tags.filter((t) => !t.startsWith('Arc: '));

  async function submitTag() {
    const tag = value.trim();
    if (!tag.includes(': ')) {
      setError('Use the form "Category: Value", e.g. "Role: Fixer"');
      return;
    }
    if (!result.model) return;
    setSaving(true);
    setError('');
    try {
      await addCharacterTag(result.model, tag);
      onTagAdded(result.model, tag);
      setValue('');
      setEditing(false);
    } catch {
      setError('Failed to save — is the server running?');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="result">
      <div className="meta">
        {meta} ({result.voiceId})
        {customTags.map((t) => (
          <span key={t} className="tag-badge">
            {t}
          </span>
        ))}
        {result.model && !editing && (
          <button type="button" className="add-tag-btn" onClick={() => setEditing(true)}>
            + tag
          </button>
        )}
      </div>
      {editing && (
        <div className="tag-editor">
          <input
            type="text"
            placeholder='e.g. "Role: Fixer"'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitTag();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
          />
          <button type="button" onClick={submitTag} disabled={saving}>
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError('');
            }}
          >
            Cancel
          </button>
          {error && <div className="tag-error">{error}</div>}
        </div>
      )}
      <div className="content">{result.content}</div>
      <div className="controls">
        <audio controls preload="none" src={audioUrl} />
        <a className="download" href={audioUrl + '&download=1'} download>
          Download
        </a>
      </div>
    </div>
  );
}
