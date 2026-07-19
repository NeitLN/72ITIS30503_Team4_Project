'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface ComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Given the current typed text, return the suggestions to show. */
  getOptions: (query: string) => string[];
  /** When false (e.g. the Vietnam location field), the value must be one of
   * getOptions()'s results — an unmatched typed value reverts on blur.
   * When true (e.g. brand), any typed text is accepted as-is. */
  allowFreeText?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Visible or visually-hidden hint tied via aria-describedby. */
  description?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A small, accessible combobox (WAI-ARIA 1.2 combobox+listbox pattern) with
 * no external dependency — shared by the Vietnam location selector and the
 * seller brand input so both get the same keyboard/ARIA behavior for free.
 */
export const Combobox = ({
  id, value, onChange, getOptions, allowFreeText = false, placeholder,
  emptyMessage = 'Không có kết quả phù hợp.', description, ariaInvalid,
  ariaDescribedBy, disabled, className = '',
}: ComboboxProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirrors an externally-changed `value` prop (e.g. a form reset) into the
  // editable input state. Adjusted during render rather than in an effect —
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes —
  // so an external reset doesn't cost an extra render pass.
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setInputValue(value);
  }

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  const listboxId = `${id}-listbox`;
  const descId = description ? `${id}-desc` : undefined;
  const describedBy = [descId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;
  const options = isOpen ? getOptions(inputValue) : [];

  const commit = (val: string) => {
    setInputValue(val);
    onChange(val);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (text: string) => {
    setInputValue(text);
    setIsOpen(true);
    setActiveIndex(-1);
    if (allowFreeText) onChange(text);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => {
      setIsOpen(false);
      if (!allowFreeText) {
        const exact = getOptions(inputValue).find(
          (o) => o.trim().toLowerCase() === inputValue.trim().toLowerCase(),
        );
        if (exact) commit(exact);
        else setInputValue(value); // revert — free text isn't allowed here
      }
      setActiveIndex(-1);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        commit(options[activeIndex]);
      } else if (allowFreeText) {
        setIsOpen(false);
        onChange(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {description && <p id={descId} className="text-[11px] text-neutral-500 mb-1">{description}</p>}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full border ${ariaInvalid ? 'border-red-500' : 'border-neutral-300'} px-3.5 py-2 pr-9 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50`}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            aria-label="Xóa"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-neutral-400 hover:text-neutral-900"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-neutral-300 bg-white shadow-lg"
        >
          {options.length === 0 ? (
            <li role="presentation" className="px-3.5 py-2 text-sm text-neutral-500">{emptyMessage}</li>
          ) : (
            options.map((opt, i) => (
              <li
                key={opt}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                className={`cursor-pointer px-3.5 py-2 text-sm ${i === activeIndex ? 'bg-neutral-900 text-white' : 'text-neutral-900 hover:bg-neutral-100'}`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
