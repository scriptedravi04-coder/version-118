import React, { useState, useEffect } from 'react';

interface Props {
  value: number | "";
  onChange: (val: number | "") => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function FormattedNumberInput({ value, onChange, onBlur, placeholder, className }: Props) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === "") {
      setDisplayValue("");
    } else {
      const parsed = parseShorthandNumber(displayValue);
      if (parsed !== value) {
        setDisplayValue(value.toLocaleString('en-IN'));
      }
    }
  }, [value]);

  const parseShorthandNumber = (val: string): number | "" => {
    const clean = val.replace(/,/g, '').toUpperCase();
    if (clean === '') return "";
    let multiplier = 1;
    if (clean.endsWith('K')) multiplier = 1000;
    else if (clean.endsWith('M')) multiplier = 1000000;
    else if (clean.endsWith('L')) multiplier = 100000;
    
    const numPart = parseFloat(clean.replace(/[KML]/g, ''));
    if (isNaN(numPart)) return "";
    return Math.round(numPart * multiplier);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    if (!/^[0-9,kKmMlL]*$/.test(rawVal)) {
      return;
    }

    setDisplayValue(rawVal);
    const parsed = parseShorthandNumber(rawVal);
    onChange(parsed);
  };

  const handleBlur = () => {
    if (value !== "") {
      setDisplayValue(value.toLocaleString('en-IN'));
    }
    if (onBlur) onBlur();
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
