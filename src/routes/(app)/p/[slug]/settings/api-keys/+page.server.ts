import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { createApiKey, listApiKeys, revokeApiKey, rotateApiKey } from '$lib/server/api-keys';
import { requireProject } from '$lib/server/projects/authz';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, locals, parent }) => {
  await requireProject(locals.authz, params.slug, 'project.manage');
  const { project, breadcrumbs } = await parent();
  return {
    projectId:   project.id,
    keys:        await listApiKeys(project.id),
    breadcrumbs: appendCrumb(
      breadcrumbs,
      { label: m.nav_settings() },
      { label: m.nav_api_keys() },
    ),
  };
}) satisfies PageServerLoad;

const CreateForm = z.object({
  name:      z.string().trim().min(1, 'Name required').max(60, 'Name too long'),
  expiresAt: z.string().trim().optional(),
});

const RevokeForm = z.object({
  id: z.uuid({ version: 'v7' }),
});

const RotateForm = z.object({
  id: z.uuid({ version: 'v7' }),
});

export const actions = {
  create: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'unauthorized');
    const project = await requireProject(locals.authz, params.slug, 'project.manage');
    const projectId = project.id;

    const parsed = CreateForm.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? m.error_invalid_input() });
    }

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return fail(400, { error: m.error_invalid_expiry() });
    }

    const created = await createApiKey({
      projectId,
      name:      parsed.data.name,
      userId:    locals.user.id,
      expiresAt,
    });

    return { createdKey: created };
  },

  revoke: async ({ request, params, locals }) => {
    const project = await requireProject(locals.authz, params.slug, 'project.manage');
    const projectId = project.id;

    const parsed = RevokeForm.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? m.error_invalid_input() });
    }

    try {
      await revokeApiKey(parsed.data.id, projectId);
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : m.error_revoke_failed() });
    }

    return { revoked: true };
  },

  rotate: async ({ request, params, locals }) => {
    if (!locals.user) throw error(401, 'unauthorized');
    const project = await requireProject(locals.authz, params.slug, 'project.manage');
    const projectId = project.id;

    const parsed = RotateForm.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) {
      return fail(400, { error: parsed.error.issues[0]?.message ?? m.error_invalid_input() });
    }

    try {
      const created = await rotateApiKey({
        id:        parsed.data.id,
        projectId,
        userId:    locals.user.id,
      });
      return { createdKey: created };
    } catch (e) {
      return fail(400, { error: e instanceof Error ? e.message : m.error_revoke_failed() });
    }
  },
} satisfies Actions;
