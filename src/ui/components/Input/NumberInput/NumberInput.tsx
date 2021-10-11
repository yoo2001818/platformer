import React, {useCallback, useState} from 'react';

import {TextInput} from '../TextInput';

export interface NumberInputProps {
  className?: string;
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
  fraction?: number;
}

export function NumberInput(
  props: NumberInputProps,
): React.ReactElement {
  const {value, onChange, fraction = 4, ...restProps} = props;
  const [inputValue, setInputValue] = useState<string | null>(null);
  const handleChange = useCallback((value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  }, [onChange]);
  const handleBlur = useCallback(() => {
    setInputValue(null);
    if (inputValue != null) {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  }, [inputValue, onChange]);
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if ('requestPointerLock' in target) {
      target.requestPointerLock();
    }
    let pos = e.clientY + e.clientX;
    let currentValue = value ?? 0;
    const handleMouseMove = (e: MouseEvent): void => {
      let delta;
      if ('movementX' in e) {
        delta = e.movementY + e.movementX;
        if (Math.abs(delta) > 100) {
          delta = 0;
        }
      } else {
        const currentPos = e.clientY + e.clientX;
        delta = currentPos - pos;
        pos = currentPos;
      }
      let modifier = 1;
      if (e.ctrlKey) {
        modifier = 0.1;
      }
      currentValue += delta * 0.01 * modifier;

      let snappedValue = currentValue;
      if (e.shiftKey) {
        snappedValue = Math.round(currentValue / modifier) * modifier;
      }
      onChange(snappedValue);
    };
    const handleMouseUp = (e: MouseEvent): void => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if ('exitPointerLock' in document) {
        if (document.pointerLockElement === target) {
          document.exitPointerLock();
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, onChange]);
  return (
    <TextInput
      value={inputValue ?? (value != null ? value.toFixed(fraction) : '')}
      onChange={handleChange}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      {...restProps}
    />
  );
}
