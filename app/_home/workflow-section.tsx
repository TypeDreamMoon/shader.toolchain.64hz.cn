import { Braces } from 'lucide-react';
import type { HomeCopy } from './copy';
import { HomeSection, SectionHead } from './section';

export function WorkflowSection({ copy }: { copy: HomeCopy }) {
  return (
    <HomeSection id="workflow">
      <SectionHead
        icon={Braces}
        kicker={copy.workflow.kicker}
        lead={copy.workflow.lead}
        title={copy.workflow.title}
      />

      <ol className="ds-steps">
        {copy.workflow.steps.map(([index, title, text]) => (
          <li className="ds-step" key={index}>
            <span className="ds-step-index" aria-hidden="true">
              {index}
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </HomeSection>
  );
}
