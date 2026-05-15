const GROUP_META_LINE = /^[ \t]*#[ \t]*trace-group:[ \t]*(.+?)[ \t]*$/m;
const FEATURE_LINE    = /^[ \t]*Feature:/m;

/**
 * Extracts the group name from a `# trace-group: <name>` meta-comment placed
 * before the `Feature:` line. Returns null when no meta line is present, when
 * the meta appears after `Feature:`, or when the captured name is empty.
 */
export function extractGroupName(content: string): string | null {
  const meta = GROUP_META_LINE.exec(content);
  if (!meta) return null;

  const featureMatch = FEATURE_LINE.exec(content);
  if (featureMatch && meta.index > featureMatch.index) return null;

  const name = meta[1]?.trim();
  return name && name.length > 0 ? name : null;
}

export function prependGroupMeta(content: string, groupName: string): string {
  return `# trace-group: ${groupName}\n${content}`;
}
