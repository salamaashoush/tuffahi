import { Component, For, Show } from 'solid-js';
import { formatArtworkUrl } from '../../lib/musickit';

interface SearchSuggestionsProps {
  suggestions: any[];
  onSelectTerm: (term: string) => void;
  onSelectItem: (item: any) => void;
}

const SearchSuggestions: Component<SearchSuggestionsProps> = (props) => {
  return (
    <div class="absolute top-full left-0 right-0 mt-1 bg-surface-secondary rounded-xl border border-white/10 shadow-xl z-50 max-h-80 overflow-y-auto">
      <For each={props.suggestions}>
        {(suggestion) => (
          <Show
            when={suggestion.kind === 'terms'}
            fallback={
              // Top result
              <Show when={suggestion.content}>
                <button
                  onClick={() => props.onSelectItem(suggestion.content)}
                  class="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-smooth text-left"
                >
                  <Show when={suggestion.content?.attributes?.artwork}>
                    <img
                      src={formatArtworkUrl(suggestion.content.attributes.artwork, 80)}
                      alt=""
                      class="w-10 h-10 rounded-sm object-cover"
                    />
                  </Show>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-white truncate">{suggestion.content?.attributes?.name}</p>
                    <p class="text-xs text-white/60 truncate">
                      {suggestion.content?.attributes?.artistName || suggestion.content?.type}
                    </p>
                  </div>
                </button>
              </Show>
            }
          >
            {/* Term suggestion */}
            <button
              onClick={() => props.onSelectTerm(suggestion.searchTerm || suggestion.displayTerm || '')}
              class="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-smooth text-left"
            >
              <svg class="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span class="text-sm text-white">{suggestion.searchTerm || suggestion.displayTerm}</span>
            </button>
          </Show>
        )}
      </For>
      <Show when={props.suggestions.length === 0}>
        <div class="p-3 text-sm text-white/40 text-center">No suggestions</div>
      </Show>
    </div>
  );
};

export default SearchSuggestions;
