export type ParseError = { line: number; column?: number; message: string };

export type ParsedScenario = { name: string; line: number; tags: string[] };

export type ParseResult = {
	name:      string | null;
	scenarios: ParsedScenario[];
	tags:      string[];
	errors:    ParseError[];
};
