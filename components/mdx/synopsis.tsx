import type { ReactNode } from 'react';

export interface SynopsisProps {
  /** A single fenced code block holding the grammar synopsis. */
  children?: ReactNode;
}

/**
 * Marks a fenced code block as a grammar synopsis rather than runnable code, so the stylesheet can
 * give it its own treatment. Content puts a normal fence inside.
 */
export function Synopsis({ children }: SynopsisProps) {
  return <div className="ds-synopsis">{children}</div>;
}
