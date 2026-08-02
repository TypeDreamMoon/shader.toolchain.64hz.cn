import { LocaleText } from './locale-text';

interface GrammarRow {
  /** The meta-syntax token itself. */
  notation: string;
  /** A synopsis fragment showing the token in use. */
  example: string;
  zh: string;
  en: string;
}

/**
 * The one canonical reading of the synopsis meta-syntax. Every page that shows a `<Synopsis>` can
 * point at this table instead of restating it, so the legend cannot drift between pages.
 */
const GRAMMAR_ROWS: GrammarRow[] = [
  {
    notation: '<x>',
    example: 'Name = <string>',
    zh: '占位符——替换成实际内容，尖括号本身不写出来。',
    en: 'Placeholder — substitute a real value; the angle brackets are not typed.',
  },
  {
    notation: '[ x ]',
    example: '[, Root = <string>]',
    zh: '可选——整段可以整体省略。',
    en: 'Optional — the whole group may be left out.',
  },
  {
    notation: '{ a | b }',
    example: '{ Node( … ) | Comment( … ) }',
    zh: '多选一——从竖线分隔的写法里取其中一个。',
    en: 'Choice — take exactly one of the alternatives separated by |.',
  },
  {
    notation: '…',
    example: '<property-declaration> …',
    zh: '可重复——前一项可以出现任意多次。',
    en: 'Repetition — the preceding item may appear any number of times.',
  },
];

/**
 * Renders the shared meta-syntax legend. Takes no props; put it once on any page that introduces
 * synopsis notation.
 */
export function Grammar() {
  return (
    <table className="ds-grammar">
      <thead>
        <tr>
          <th>
            <LocaleText zh="记号" en="Notation" />
          </th>
          <th>
            <LocaleText zh="含义" en="Meaning" />
          </th>
          <th>
            <LocaleText zh="示例" en="Example" />
          </th>
        </tr>
      </thead>
      <tbody>
        {GRAMMAR_ROWS.map((row) => (
          <tr key={row.notation}>
            <td>
              <code>{row.notation}</code>
            </td>
            <td>
              <LocaleText zh={row.zh} en={row.en} />
            </td>
            <td>
              <code>{row.example}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
