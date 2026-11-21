import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export type CopyButtonState = 'idle' | 'copied' | 'error';

export interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  size?: 'sm' | 'md';
  onCopied?: () => void;
  onError?: (error: unknown) => void;
  className?: string;
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  size = 'sm',
  onCopied,
  onError,
  className = '',
}: CopyButtonProps) {
  const [state, setState] = useState<CopyButtonState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
      onCopied?.();
    } catch (error) {
      setState('error');
      onError?.(error);
    }

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState('idle'), 1600);
  }

  const text = state === 'copied' ? copiedLabel : state === 'error' ? 'Copy failed' : label;

  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      onClick={copy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[3px] border border-(--line) bg-(--panel-raised) text-(--muted) transition-colors hover:border-(--accent) hover:text-(--ink) focus-visible:ring-1 focus-visible:ring-(--accent) ${
        size === 'sm' ? 'h-7 px-2 text-[10px]' : 'h-8 px-3 text-[11px]'
      } ${className}`}
    >
      {state === 'copied' ? (
        <Check aria-hidden="true" size={12} className="text-(--success)" />
      ) : (
        <Copy aria-hidden="true" size={12} />
      )}
      {text}
    </button>
  );
}
