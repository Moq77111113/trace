import type { ParamMatcher } from '@sveltejs/kit';

const FEATURE_CODE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\d+$/;

/** Matches a feature code (`<prefix>-<seq>`), e.g. `auth-42`. */
export const match: ParamMatcher = (value) => FEATURE_CODE.test(value);
