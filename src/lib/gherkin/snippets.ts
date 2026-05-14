export type Snippet = {
  key:     string;
  label:   string;
  content: string;
};

const TEMPLATE = (name: string) => `@draft
Feature: ${name}

  As a <role>, I want <capability> so that <benefit>.

  Scenario: <happy path>
    Given <context>
    When <action>
    Then <observable outcome>
`;

const SCENARIO = `
  Scenario: <name>
    Given <context>
    When <action>
    Then <observable outcome>
`;

const OUTLINE = `
  Scenario Outline: <name>
    Given <context with <param>>
    When <action>
    Then <expected for <param>>

    Examples:
      | param |
      | A     |
      | B     |
`;

const BACKGROUND = `
  Background:
    Given <common precondition>
`;

/** Full Feature template used both for new-feature creation and the Insert menu's "Template" entry. */
export function featureTemplate(name: string): string {
  return TEMPLATE(name);
}

/** Snippets exposed in the editor's Insert menu. `Template` is inserted with the feature's own name. */
export function buildSnippets(featureName: string): Snippet[] {
  return [
    { key: 'template',   label: 'Template',         content: featureTemplate(featureName) },
    { key: 'scenario',   label: 'Scenario',         content: SCENARIO },
    { key: 'outline',    label: 'Scenario Outline', content: OUTLINE },
    { key: 'background', label: 'Background',       content: BACKGROUND },
  ];
}
