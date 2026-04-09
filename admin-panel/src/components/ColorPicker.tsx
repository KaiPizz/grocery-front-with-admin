'use client';

import { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  cssVar?: string;
}

export function ColorPicker({ label, value, onChange, cssVar }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTextValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTextValue(v);
    if (/^#[0-9a-fA-F]{6,8}$/.test(v)) {
      onChange(v);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {cssVar && <span className="ml-1 text-gray-400 font-normal">({cssVar})</span>}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded-md border border-gray-300 shrink-0 cursor-pointer"
          style={{ backgroundColor: value }}
          title={value}
        />
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-mono text-gray-700 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
          placeholder="#000000"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 p-2 bg-white rounded-lg border border-gray-200 shadow-lg">
          <input
            type="color"
            value={value.slice(0, 7)}
            onChange={(e) => {
              onChange(e.target.value);
              setTextValue(e.target.value);
            }}
            className="w-48 h-40 cursor-pointer border-0"
          />
        </div>
      )}
    </div>
  );
}
