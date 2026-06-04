/** Render contract for a single step row; the frozen step row (`FrozenStep`) structurally satisfies it. */
export type StepView = {
  id?:       string;
  keyword:   string | null;
  text:      string;
  expected?: string | null;
  verdict?:  string | null;
  note?:     string | null;
};
