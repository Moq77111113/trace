import { db } from '$lib/server/db/client';
import { policies } from '$lib/server/db/schema';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Grants a project's creator full authority over that project: `(user, *, project)` allow. */
export async function grantCreator(tx: Tx, userId: string, projectId: string): Promise<void> {
  await tx.insert(policies).values({
    subjectKind: 'user',
    subjectId:   userId,
    action:      '*',
    scopeKind:   'project',
    scopeId:     projectId,
    effect:      'allow',
  });
}
