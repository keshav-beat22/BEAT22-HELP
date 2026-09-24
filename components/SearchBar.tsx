'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/lib/posts';

interface Props {
  categories: Category[];
  placeholder?: string;
  initialQuery?: string;
  /** Header variant: 36px tall instead of the hero's 45px. */
  compact?: boolean;
}

/**
 * Port of the [beat24_cat_search_box] shortcode.
 *
 * Original behaviour, preserved:
 *  - picking a category with an empty keyword navigates straight to that archive
 *  - submitting with a keyword runs a search
 *  - on screens under 480px the submit button is hidden and picking a
 *    category submits immediately
 *
 * Improved: the dropdown is a real button with a listbox, keyboard support and
 * screen-reader semantics, rather than a div with a click handler.
 */
export default function SearchBar({
  categories,
  placeholder = 'Search our help center...',
  initialQuery = '',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Category | null>(null);
  // Which option the arrow keys are sitting on while the listbox is open.
  const [activeIndex, setActiveIndex] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const router = useRouter();

  // The hero and the header both render a SearchBar, so ids must be unique.
  const uid = useId();
  const inputId = `search-${uid}`;
  const listId = `categories-${uid}`;
  const optionId = (i: number) => `option-${uid}-${i}`;

  // Index 0 is the "General" (no filter) option; categories follow.
  const options: (Category | null)[] = [null, ...categories];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Move focus into the listbox when it opens so the arrow keys have a target.
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  function go(term: string, category: Category | null) {
    const trimmed = term.trim();
    if (!trimmed && category) {
      router.push(`/category/${category.slug}/`);
      return;
    }
    if (!trimmed) return;
    const params = new URLSearchParams({ q: trimmed });
    if (category) params.set('category', category.slug);
    router.push(`/search/?${params.toString()}`);
  }

  function pick(category: Category | null) {
    setSelected(category);
    close();
    const isNarrow =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 480px)').matches;
    if (isNarrow) go(query, category);
  }

  function close(refocus = true) {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }

  function openAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    const current = options.findIndex((o) => o?.slug === selected?.slug);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openAt(current < 0 ? 0 : current);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(options.length - 1);
    }
    // Enter and Space fall through to the button's native click.
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(options[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        // Let focus leave, but do not leave an orphaned popup behind.
        close(false);
        break;
    }
  }

  return (
    <div
      className={`beat24-search-container${compact ? ' compact' : ''}`}
      ref={root}
    >
      <form
        className="beat24-search-wrapper"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(query, selected);
        }}
      >
        <label className="screen-reader-text" htmlFor={inputId}>
          Search the help centre
        </label>
        <input
          id={inputId}
          type="search"
          name="q"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* The listbox is a sibling of the trigger: interactive content is not
            allowed inside a <button>, and nesting it there broke keyboard use. */}
        <div className="beat24-dropdown-shell">
          <button
            type="button"
            ref={trigger}
            className={`beat24-dropdown${open ? ' open' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-label="Filter by category"
            onClick={(e) => {
              e.stopPropagation();
              if (open) {
                close(false);
              } else {
                const current = options.findIndex(
                  (o) => o?.slug === selected?.slug,
                );
                openAt(current < 0 ? 0 : current);
              }
            }}
            onKeyDown={onTriggerKeyDown}
          >
            <span className="label">{selected ? selected.name : 'General'}</span>
            <svg
              className="chevron"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {open && (
            <ul
              id={listId}
              ref={list}
              role="listbox"
              tabIndex={-1}
              aria-label="Categories"
              aria-activedescendant={optionId(activeIndex)}
              onKeyDown={onListKeyDown}
            >
              {options.map((c, i) => (
                <li
                  key={c ? c.slug : '__general'}
                  id={optionId(i)}
                  role="option"
                  aria-selected={
                    c ? selected?.slug === c.slug : selected === null
                  }
                  className={i === activeIndex ? 'active' : undefined}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={(e) => {
                    e.stopPropagation();
                    pick(c);
                  }}
                >
                  {c ? c.name : 'General'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      <button
        type="button"
        className="beat24-search-button"
        aria-label="Search"
        onClick={() => go(query, selected)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
    </div>
  );
}
