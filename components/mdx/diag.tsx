import Link from 'next/link';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { LocaleText } from './locale-text';
import { Wide } from './wide';

export interface DProps {
  /** The diagnostic message, verbatim. `{Placeholder}` marks a runtime substitution. */
  msg: string;
  /** What triggers the diagnostic. */
  cause: ReactNode;
  /** What to do about it. */
  fix?: ReactNode;
  /** Link to the page that explains the construct. */
  href?: string;
}

/**
 * One diagnostics row. Renders nothing on its own — `<Diag>` reads its props and builds the real
 * table row, so a stray `<D>` can never break the table markup.
 */
export function D(_props: DProps): null {
  return null;
}

export interface DiagProps {
  /** `<D>` elements, one per diagnostic. */
  children?: ReactNode;
}

/**
 * Splits a message into plain runs and `{Placeholder}` runs, so the stylesheet can de-emphasise
 * the substitutions without the message text losing its verbatim spelling.
 */
function renderMessage(msg: string): ReactNode {
  return msg.split(/(\{[^{}]*\})/g).map((part, index) => {
    if (part.length === 0) {
      return null;
    }

    if (part.startsWith('{') && part.endsWith('}')) {
      return (
        <span key={index} className="ds-diag-ph">
          {part}
        </span>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function collectRows(children: ReactNode): DProps[] {
  const rows: DProps[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      continue;
    }

    const props = child.props as Partial<DProps>;

    if (typeof props.msg !== 'string') {
      continue;
    }

    rows.push({
      msg: props.msg,
      cause: props.cause,
      fix: props.fix,
      href: props.href,
    });
  }

  return rows;
}

/**
 * A diagnostics table with fixed column semantics, so every page presents errors identically.
 *
 * ```mdx
 * <Diag>
 *   <D msg="Shader must provide a Graph block." cause="…" fix="…" href="/docs/graph/statements" />
 * </Diag>
 * ```
 */
export function Diag({ children }: DiagProps) {
  const rows = collectRows(children);

  if (rows.length === 0) {
    return null;
  }

  const hasFixColumn = rows.some((row) => row.fix !== undefined || row.href !== undefined);

  return (
    <Wide>
      <table className="ds-diag">
        <thead>
          <tr>
            <th>
              <LocaleText zh="消息" en="Message" />
            </th>
            <th>
              <LocaleText zh="触发原因" en="Cause" />
            </th>
            {hasFixColumn ? (
              <th>
                <LocaleText zh="处理" en="Fix" />
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="ds-diag-msg">{renderMessage(row.msg)}</td>
              <td>{row.cause}</td>
              {hasFixColumn ? (
                <td>
                  {row.fix}
                  {row.href ? (
                    <>
                      {row.fix ? ' ' : null}
                      <Link href={row.href}>
                        <LocaleText zh="详解" en="Details" />
                      </Link>
                    </>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </Wide>
  );
}
