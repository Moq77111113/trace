import { describe, expect, it } from 'vitest';
import { partitionAttachmentsByStep } from '$lib/entities/execution/lib/step-attachments';

type Attachment = { id: string; scenarioResultStepId: string | null };

describe('partitionAttachmentsByStep', () => {
  it('groups by step pointer and routes null pointers to scenarioWide', () => {
    const attachments: Attachment[] = [
      { id: 'a', scenarioResultStepId: 'x' },
      { id: 'b', scenarioResultStepId: 'x' },
      { id: 'c', scenarioResultStepId: 'y' },
      { id: 'd', scenarioResultStepId: null },
    ];

    const { byStep, scenarioWide } = partitionAttachmentsByStep(attachments);

    expect(byStep.x).toHaveLength(2);
    expect(byStep.y).toHaveLength(1);
    expect(scenarioWide).toHaveLength(1);
    expect(byStep.z).toBeUndefined();
  });
});
