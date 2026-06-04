/** One attachment as it reaches read-only views. */
export type StepAttachmentView = {
  id:        string;
  filename:  string;
  mimeType:  string;
  sizeBytes: number;
};

/** Attachments split into per-step buckets and the scenario-wide remainder (null step id). */
export type PartitionedAttachments<A> = {
  byStep:       Record<string, A[]>;
  scenarioWide: A[];
};

/** Groups attachments by their step pointer; those with no step id fall into scenarioWide. */
export function partitionAttachmentsByStep<A extends { scenarioResultStepId: string | null }>(
  attachments: A[],
): PartitionedAttachments<A> {
  const byStep: Record<string, A[]> = {};
  const scenarioWide: A[] = [];
  for (const a of attachments) {
    if (a.scenarioResultStepId) (byStep[a.scenarioResultStepId] ??= []).push(a);
    else scenarioWide.push(a);
  }
  return { byStep, scenarioWide };
}
