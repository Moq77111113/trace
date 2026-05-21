export type ParseError = { line: number; column?: number; message: string };

export type Feature = {
  id:          string;
  name:        string;
  codeSeq:     number;
  content:     string;
  description: string | null;
  version:     number;
  parseErrors: ParseError[] | null;
  groupId:     string | null;
};
