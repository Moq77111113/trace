export type IngestedScenario = {
  name:          string;
  status:        'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs:    number | null;
  logs:          string | null;
  errorMessage:  string | null;
};

export type IngestedRun = {
  featureName:   string;
  scenarios:     IngestedScenario[];
  unknownCount:  number;
  warnings:      string[];
};
