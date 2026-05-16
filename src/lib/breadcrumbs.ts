export type Crumb = { label: string; href?: string };

export function appendCrumb(parent: Crumb[] | undefined, ...crumbs: Crumb[]): Crumb[] {
  return [...(parent ?? []), ...crumbs];
}
