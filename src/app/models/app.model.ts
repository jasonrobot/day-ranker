// Score type: -3 to +3
export type Score = -3 | -2 | -1 | 0 | 1 | 2 | 3;

// State for a single day
export interface DayState {
  score: Score;
  comment: string;
}

// State for a month: array of DayState, one for each day
export interface MonthState {
  days: DayState[];
}

// State for the year: array of MonthState, one for each month
export interface YearState {
  months: MonthState[];
}
