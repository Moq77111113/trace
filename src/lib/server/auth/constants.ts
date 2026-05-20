import { PASSWORD_RESET_TTL_MIN } from '$lib/shared/auth/constants';

export { PASSWORD_MIN_LENGTH, PASSWORD_RESET_TTL_MIN } from '$lib/shared/auth/constants';

export const PASSWORD_RESET_TTL_S        = PASSWORD_RESET_TTL_MIN * 60;
export const PASSWORD_RESET_RATE_PER_MIN = 10;
