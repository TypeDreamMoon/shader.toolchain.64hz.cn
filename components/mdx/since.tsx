export interface SinceProps {
  /** The version the feature arrived in, e.g. `1.5.0`. */
  v: string;
  /**
   * Render an engine version instead of a plugin version: `since UE 5.4`.
   *
   * @defaultValue false
   */
  ue?: boolean;
}

/**
 * Inline version pill. Safe inside a heading, a table cell, or a sentence.
 *
 * ```mdx
 * ### Group scopes <Since v="1.5.0" />
 * ```
 */
export function Since({ v, ue = false }: SinceProps) {
  return (
    <span className={ue ? 'ds-since ds-since-ue' : 'ds-since'}>
      {ue ? `since UE ${v}` : `since ${v}`}
    </span>
  );
}
