import type { ParseError } from '$lib/shared/gherkin/types';

export type PreviewRowStatus = 'new' | 'collision' | 'parse-error';

export type PreviewRow = {
  rowId:          string;
  filename:       string;
  featureName:    string | null;
  groupName:      string | null;
  scenarioCount:  number;
  tags:           string[];
  status:         PreviewRowStatus;
  parseErrors:    ParseError[];
  collidesWithId: string | null;
};

export type BatchSummary = {
  new:         number;
  collisions:  number;
  parseErrors: number;
  total:       number;
};

export type BatchPreview = {
  previewId: string;
  projectId: string;
  rows:      PreviewRow[];
  summary:   BatchSummary;
  createdAt: Date;
};

export type ImportBuffer = { filename: string; bytes: Buffer };
