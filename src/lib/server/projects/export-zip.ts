import { Readable } from 'node:stream';
import { ZipArchive } from 'archiver';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { projects, featureGroups, features } from '$lib/server/db/schema';
import { featureFilename, projectArchiveFilename } from '$lib/features/feature-import/lib/format';
import { prependGroupMeta } from '$lib/features/feature-import/lib/group-meta';

export type ProjectArchive = {
  stream:   Readable;
  filename: string;
};

export async function streamProjectZip(projectId: string): Promise<ProjectArchive | null> {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return null;

  const rows = await db.query.features.findMany({
    where: and(eq(features.projectId, projectId), eq(features.archived, false)),
  });
  if (rows.length === 0) return null;

  const groupNamesById = new Map<string, string>();
  const groupIds       = [...new Set(rows.map((f) => f.groupId).filter((id): id is string => id !== null))];
  if (groupIds.length > 0) {
    const groups = await db.query.featureGroups.findMany({ where: eq(featureGroups.projectId, projectId) });
    for (const g of groups) groupNamesById.set(g.id, g.name);
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const seen    = new Map<string, number>();

  for (const f of rows) {
    const baseName = featureFilename(f.name);
    const count    = seen.get(baseName) ?? 0;
    seen.set(baseName, count + 1);

    const entryName = count === 0
      ? baseName
      : `${baseName.replace(/\.feature$/, '')}-${f.id.slice(0, 8)}.feature`;

    const groupName = f.groupId ? groupNamesById.get(f.groupId) : null;
    const content   = groupName ? prependGroupMeta(f.content, groupName) : f.content;

    archive.append(content, { name: entryName });
  }

  archive.finalize();

  return { stream: archive, filename: projectArchiveFilename(project.name) };
}
