import { FileCode2, Terminal } from 'lucide-react';
import { CodePanel } from './code-panel';
import type { HomeCopy } from './copy';
import { HomeSection, SectionHead } from './section';

/**
 * The source sample, on a band of its own.
 *
 * It used to share the hero with the headline, which cost it half the width and cost
 * the reader the line breaks. Code is the page's evidence, so it gets the full column
 * and the command that turns it into an asset directly underneath.
 */
export function SampleSection({ copy }: { copy: HomeCopy }) {
  return (
    <HomeSection id="sample">
      <SectionHead
        icon={FileCode2}
        kicker={copy.sample.kicker}
        lead={copy.sample.lead}
        title={copy.sample.title}
      />

      <div className="ds-sample">
        <CodePanel file={copy.sample.file} result={copy.sample.result} />

        <p className="ds-command">
          <Terminal aria-hidden="true" />
          <code>{copy.sample.command}</code>
        </p>
      </div>
    </HomeSection>
  );
}
