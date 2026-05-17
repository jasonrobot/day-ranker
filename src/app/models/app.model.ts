export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export function isScore(value: number): value is Score {
  return value >= -3 && value <= 3;
}

export interface BaseFieldDefinition {
  label: string;
  hidden: boolean;
  order: number;
}

export interface TextFieldDefinition extends BaseFieldDefinition {
  type: 'text';
}

export interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: 'boolean';
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: 'number';
  range: [number, number];
}

export type FieldDefinition = TextFieldDefinition | BooleanFieldDefinition | NumberFieldDefinition;
export type FieldType = 'text' | 'boolean' | 'number';

export function isTextField(f: FieldDefinition): f is TextFieldDefinition {
  return f.type === 'text';
}

export function isBooleanField(f: FieldDefinition): f is BooleanFieldDefinition {
  return f.type === 'boolean';
}

export function isNumberField(f: FieldDefinition): f is NumberFieldDefinition {
  return f.type === 'number';
}

export interface AppSettings {
  customFields: FieldDefinition[];
}

// customFields is optional for backwards compatibility with data saved before this feature.
// Treat absent customFields as {}.
export interface DayState {
  score: Score | null;
  comment: string;
  customFields?: Record<string, string | boolean | number>;
}

export interface MonthState {
  days: DayState[];
}

export interface YearState {
  months: MonthState[];
}
