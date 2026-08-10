interface PositionSearchProps {
  query: string
  onQueryChange: (query: string) => void
  onClear: () => void
}

export function PositionSearch({
  query,
  onQueryChange,
  onClear,
}: PositionSearchProps) {
  return (
    <search className="position-search">
      <label htmlFor="position-search-input">Search positions</label>
      <div className="search-control">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <input
          id="position-search-input"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search positions..."
          autoComplete="off"
        />
        {query.length > 0 && (
          <button type="button" onClick={onClear} aria-label="Clear search">
            Clear
          </button>
        )}
      </div>
    </search>
  )
}
