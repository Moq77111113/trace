/**
 * Calls the `?/moveFeature` SvelteKit form action. Pass `groupId = null` to
 * move the feature out of any group (ungrouped). The caller owns
 * `invalidateAll()` — invalidation is a UI decision, not a transport one.
 */
export async function moveFeatureToGroup(featureId: string, groupId: string | null): Promise<void> {
  const fd = new FormData();
  fd.set('featureId', featureId);
  fd.set('groupId',   groupId ?? '');
  await fetch('?/moveFeature', { method: 'POST', body: fd });
}
