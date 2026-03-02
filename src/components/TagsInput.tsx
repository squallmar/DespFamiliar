'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export default function TagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Adicione tags (pressione Enter)',
  maxTags = 10,
}: TagsInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (input.length > 0) {
      const filtered = suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !value.includes(s)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [input, suggestions, value]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (
      trimmed &&
      !value.includes(trimmed) &&
      value.length < maxTags
    ) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="w-full">
      <div className="border rounded-lg p-3 focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm"
            >
              <span>#{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-indigo-900 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input.length > 0 && setShowSuggestions(true)}
          placeholder={
            value.length >= maxTags
              ? `Máximo de ${maxTags} tags atingido`
              : placeholder
          }
          disabled={value.length >= maxTags}
          className="w-full outline-none text-sm disabled:opacity-50"
        />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="mt-2 border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition text-sm"
            >
              <Plus size={14} className="inline mr-2" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-gray-500 mt-2">
        {value.length}/{maxTags} tags
      </p>
    </div>
  );
}
