'use client';

import Icon from "./Icon";

// THE header/page search field. One look everywhere it appears - the shop
// header, and every other page's top bar - so the search doesn't change
// shape depending on where you are: a tall pill on the muted `sunken` fill
// that lifts to white with a peach ring on focus, search icon left, clear
// button right.
function SearchField({ value, onChange, placeholder, disabled = false, className = "", ...props }: any) {
  return (
    <div className={"relative " + className}>
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-full border border-line-strong bg-sunken py-2.5 pl-11 pr-10 text-sm text-ink outline-none transition placeholder:text-faint focus:border-brand-orange/40 focus:bg-surface focus:ring-2 focus:ring-brand-orange/15 disabled:cursor-not-allowed disabled:opacity-45"
        {...props}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-faint transition hover:bg-sunken-2 hover:text-ink"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default SearchField;
