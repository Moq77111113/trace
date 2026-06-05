import { XMLParser } from 'fast-xml-parser';
import type { ImportIR, ImportedScenario, ImportedStep, SourceId } from '$lib/shared/import-manual/ir';
import { htmlToText } from '../html-to-text';

/** The file bytes plus its name, handed to every adapter. */
export type SourceFile = { filename: string; bytes: Buffer };

/** A source-format adapter: detects a single export format and parses it into the neutral import IR. */
export type SourceAdapter = {
  id:     SourceId;
  label:  string;
  detect: (file: SourceFile) => boolean;
  parse:  (file: SourceFile) => ImportIR;
};

const DETECT_SNIFF_BYTES = 4096;

const parser = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@_',
  cdataPropName:       '__cdata',
  parseTagValue:       false,
  trimValues:          true,
});

function text(node: unknown): string | null {
  if (node === null || node === undefined) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'object' && '__cdata' in node) {
    const raw = (node as { __cdata: unknown }).__cdata;
    return typeof raw === 'string' ? raw : null;
  }
  return null;
}

function htmlField(node: unknown): string | null {
  const raw = text(node);
  if (raw === null) return null;
  const out = htmlToText(raw);
  return out.length > 0 ? out : null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function stepsFrom(testScript: Record<string, unknown> | undefined): ImportedStep[] {
  const steps = (testScript?.steps as Record<string, unknown> | undefined)?.step;
  return asArray(steps as Record<string, unknown> | Record<string, unknown>[] | undefined)
    .map((step) => ({ action: htmlField(step.description) ?? '', expected: htmlField(step.expectedResult) }))
    .filter((step) => step.action.length > 0);
}

function issueSummary(testCase: Record<string, unknown>): string | null {
  const issues = (testCase.issues as Record<string, unknown> | undefined)?.issue;
  const first  = asArray(issues as Record<string, unknown> | Record<string, unknown>[] | undefined)[0];
  return first ? text(first.summary) : null;
}

function scenarioFrom(testCase: Record<string, unknown>, index: number): ImportedScenario {
  const externalKey = typeof testCase['@_key'] === 'string' ? testCase['@_key'] : null;
  return {
    ref:         externalKey ?? `row-${index}`,
    externalKey,
    name:        text(testCase.name) ?? '(unnamed)',
    description: htmlField(testCase.objective),
    steps:       stepsFrom(testCase.testScript as Record<string, unknown> | undefined),
    grouping: {
      folder:    null,
      component: text(testCase.component),
      issue:     issueSummary(testCase),
    },
  };
}

/** Adapter for Adaptavist Test Management / Zephyr Scale Jira XML exports. */
export const zephyrAtmAdapter: SourceAdapter = {
  id:    'zephyr-atm',
  label: 'Jira (Zephyr Scale / ATM)',

  detect: (file) => {
    if (!file.filename.toLowerCase().endsWith('.xml')) return false;
    const head = file.bytes.subarray(0, DETECT_SNIFF_BYTES).toString('utf-8');
    return /<project[\s>]/.test(head) && head.includes('<testCases');
  },

  parse: (file) => {
    const root = parser.parse(file.bytes.toString('utf-8')) as Record<string, unknown>;
    const project = root.project as Record<string, unknown> | undefined;
    const testCases = (project?.testCases as Record<string, unknown> | undefined)?.testCase;
    const scenarios = asArray(testCases as Record<string, unknown> | Record<string, unknown>[] | undefined)
      .map(scenarioFrom);
    return { sourceId: 'zephyr-atm', scenarios };
  },
};
