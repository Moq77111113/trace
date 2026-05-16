export type SnippetMode = 'append' | 'replace';

export type Snippet = {
  key:     string;
  label:   string;
  content: string;
  mode:    SnippetMode;
};

const TEMPLATE = (name: string) => `@draft
Feature: ${name}

  As a <role>, I want <capability> so that <benefit>.

  Scenario: <happy path>
    Given <context>
    When <action>
    Then <observable outcome>
`;

const SCENARIO = `  Scenario: <name>
    Given <context>
    When <action>
    Then <observable outcome>
`;

const OUTLINE = `  Scenario Outline: <name>
    Given <context with <param>>
    When <action>
    Then <expected for <param>>

    Examples:
      | param |
      | A     |
      | B     |
`;

const BACKGROUND = `  Background:
    Given <common precondition>
`;

/** Full Feature template used both for new-feature creation and the Insert menu's "Template" entry. */
export function featureTemplate(name: string): string {
  return TEMPLATE(name);
}

/**
 * Snippets exposed in the editor's Insert menu.
 *
 * - `Template` replaces the whole document — the user has emptied it and wants
 *   the starter back.
 * - The block snippets (`Scenario`, `Scenario Outline`, `Background`) append
 *   at the end of the document. Inserting at cursor would shove the block
 *   before `Feature:` when the editor is freshly focused, producing invalid
 *   Gherkin; appending keeps the document parseable.
 */
export function buildSnippets(featureName: string): Snippet[] {
  return [
    { key: 'template',   label: 'Template',         content: featureTemplate(featureName), mode: 'replace' },
    { key: 'scenario',   label: 'Scenario',         content: SCENARIO,                     mode: 'append'  },
    { key: 'outline',    label: 'Scenario Outline', content: OUTLINE,                      mode: 'append'  },
    { key: 'background', label: 'Background',       content: BACKGROUND,                   mode: 'append'  },
  ];
}
