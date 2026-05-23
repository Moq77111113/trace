import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireProject } from '$lib/server/projects/authz';
import { listProjectAccess, listGrantableUsers, setProjectRole, removeFromProject, AccessRuleError } from '$lib/server/projects/access';
import { PROJECT_ROLES } from '$lib/server/authz/roles';
import type { SubjectRef } from '$lib/server/authz/evaluate';
import { appendCrumb } from '$lib/shared/lib/breadcrumbs';
import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ params, locals, parent }) => {
  await requireProject(locals.authz, params.slug, 'project.manage');
  const { project, breadcrumbs } = await parent();
  return {
    subjects:       await listProjectAccess(project.id),
    grantableUsers: await listGrantableUsers(project.id),
    breadcrumbs:    appendCrumb(breadcrumbs, { label: m.nav_settings() }, { label: m.nav_access() }),
  };
}) satisfies PageServerLoad;

const SubjectFields = z.object({
  subjectKind: z.enum(['user', 'any-user']),
  subjectId:   z.uuid({ version: 'v7' }).optional(),
});
const SetRoleForm = SubjectFields.extend({ role: z.enum(PROJECT_ROLES) });

function toSubject(kind: 'user' | 'any-user', id: string | undefined): SubjectRef | null {
  if (kind === 'any-user') return { kind: 'any-user' };
  return id ? { kind: 'user', id } : null;
}

function accessErrorMessage(code: AccessRuleError['code']): string {
  switch (code) {
    case 'last_manager':     return m.access_error_last_manager();
    case 'any_user_manager': return m.access_error_any_user_manager();
    default: { const exhaustive: never = code; return exhaustive; }
  }
}

export const actions = {
  setRole: async ({ request, params, locals }) => {
    const project = await requireProject(locals.authz, params.slug, 'project.manage');
    const parsed = SetRoleForm.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { error: m.error_invalid_input() });

    const subject = toSubject(parsed.data.subjectKind, parsed.data.subjectId);
    if (!subject) return fail(400, { error: m.error_invalid_input() });

    try {
      await setProjectRole(project.id, subject, parsed.data.role);
    } catch (e) {
      if (e instanceof AccessRuleError) return fail(400, { error: accessErrorMessage(e.code) });
      throw e;
    }
    return { ok: true };
  },

  remove: async ({ request, params, locals }) => {
    const project = await requireProject(locals.authz, params.slug, 'project.manage');
    const parsed = SubjectFields.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { error: m.error_invalid_input() });

    const subject = toSubject(parsed.data.subjectKind, parsed.data.subjectId);
    if (!subject) return fail(400, { error: m.error_invalid_input() });

    try {
      await removeFromProject(project.id, subject);
    } catch (e) {
      if (e instanceof AccessRuleError) return fail(400, { error: accessErrorMessage(e.code) });
      throw e;
    }
    return { ok: true };
  },
} satisfies Actions;
