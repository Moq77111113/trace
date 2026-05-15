import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { featureGroups, features } from '$lib/server/db/schema';
import { featureFilename } from '$lib/import/format';
import { prependGroupMeta } from '$lib/import/group-meta';

export type ExportedFeature = {
  filename: string;
  content:  string;
  mimeType: 'text/plain';
};

export async function exportFeature(featureId: string): Promise<ExportedFeature | null> {
  const row = await db.query.features.findFirst({
    where: and(eq(features.id, featureId), eq(features.archived, false)),
  });

  if (!row) return null;

  let content = row.content;
  if (row.groupId) {
    const group = await db.query.featureGroups.findFirst({ where: eq(featureGroups.id, row.groupId) });
    if (group) content = prependGroupMeta(content, group.name);
  }

  return {
    filename: featureFilename(row.name),
    content,
    mimeType: 'text/plain',
  };
}
