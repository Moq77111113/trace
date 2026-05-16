import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "../$types";

export const load = (() => {
    return redirect(303, "/");
}) satisfies PageServerLoad;
