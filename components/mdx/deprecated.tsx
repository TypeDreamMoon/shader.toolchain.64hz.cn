import type { ReactNode } from 'react';
import { LocaleText } from './locale-text';

export interface DeprecatedProps {
  /** The version the construct was deprecated in, e.g. `1.3.0`. */
  since: string;
  /** The replacement construct, when there is one. */
  use?: string;
  /** Extra prose rendered under the banner headline. */
  children?: ReactNode;
}

/**
 * Block-level banner marking a construct as deprecated.
 *
 * ```mdx
 * <Deprecated since="1.3.0" use="ShaderLayer" />
 * ```
 */
export function Deprecated({ since, use, children }: DeprecatedProps) {
  return (
    <div className="ds-deprecated" role="note">
      <p>
        <LocaleText
          zh={
            <>
              <strong>已弃用</strong>
              {since ? (
                <>
                  {' '}
                  自 <code>{since}</code> 起
                </>
              ) : null}
            </>
          }
          en={
            <>
              <strong>Deprecated</strong>
              {since ? (
                <>
                  {' '}
                  since <code>{since}</code>
                </>
              ) : null}
            </>
          }
        />
      </p>
      {use ? (
        <p>
          <LocaleText
            zh={
              <>
                请改用 <code>{use}</code>。
              </>
            }
            en={
              <>
                Use <code>{use}</code> instead.
              </>
            }
          />
        </p>
      ) : null}
      {children}
    </div>
  );
}
