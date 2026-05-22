export type ScenarioStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export type IngestedScenario = {
  name:         string;
  status:       ScenarioStatus;
  durationMs:   number | null;
  logs:         string | null;
  errorMessage: string | null;
};

export type IngestedFeatureRun = {
  featureName: string;
  tags:        string[];
  scenarios:   IngestedScenario[];
  warnings:    string[];
};
