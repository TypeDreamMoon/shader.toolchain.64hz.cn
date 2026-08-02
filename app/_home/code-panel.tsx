import { CornerDownRight } from 'lucide-react';
import { heroSample } from './copy';

/**
 * The hero's source sample: a real, complete `.dsm` from the manual, tokenized
 * by hand so the panel needs no highlighter at runtime. Line numbers come from
 * a CSS counter, so nothing here is selectable noise when the reader copies it.
 */
export function CodePanel({ file, result }: { file: string; result: string }) {
  return (
    <figure className="ds-code-panel">
      <figcaption className="ds-code-head">
        <span className="ds-code-file">{file}</span>
        <span className="ds-code-lang">DreamShaderLang</span>
      </figcaption>

      <pre className="ds-code-body">
        <code>
          {heroSample.map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key -- lines have no id
            <span className="ds-code-line" key={index}>
              {line.map((token, at) =>
                typeof token === 'string' ? (
                  <span key={at}>{token}</span>
                ) : (
                  <span className={`ds-t-${token[1]}`} key={at}>
                    {token[0]}
                  </span>
                ),
              )}
            </span>
          ))}
        </code>
      </pre>

      <p className="ds-code-foot">
        <CornerDownRight aria-hidden="true" />
        {result}
      </p>
    </figure>
  );
}
