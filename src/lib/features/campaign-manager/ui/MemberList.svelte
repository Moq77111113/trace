<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import MemberRow, { type CampaignMember } from './MemberRow.svelte';

  type Props = { members: CampaignMember[]; locked: boolean; slug: string };
  let { members, locked, slug }: Props = $props();

  let reorderForm: HTMLFormElement;
  let dragId = $state('');
  let pendingOrder = $state<string[] | null>(null);

  const order = $derived(pendingOrder ?? members.map((mem) => mem.featureId));

  function onDragStart(id: string): void {
    dragId = id;
  }

  async function onDrop(targetId: string): Promise<void> {
    if (!dragId || dragId === targetId) return;
    const next = members.map((mem) => mem.featureId).filter((id) => id !== dragId);
    next.splice(next.indexOf(targetId), 0, dragId);
    pendingOrder = next;
    dragId = '';
    await tick();
    reorderForm.requestSubmit();
  }
</script>

<form
  bind:this={reorderForm}
  method="POST"
  action="?/reorder"
  hidden
  use:enhance={() =>
    async ({ update }) => {
      await update();
      pendingOrder = null;
    }}
>
  {#each order as id (id)}
    <input type="hidden" name="order" value={id} />
  {/each}
</form>

<ul class="flex flex-col gap-1.5">
  {#each members as member (member.featureId)}
    <div
      role="listitem"
      draggable={!locked}
      ondragstart={() => onDragStart(member.featureId)}
      ondragover={(e) => e.preventDefault()}
      ondrop={() => onDrop(member.featureId)}
    >
      <MemberRow {member} {locked} {slug} />
    </div>
  {/each}
</ul>
