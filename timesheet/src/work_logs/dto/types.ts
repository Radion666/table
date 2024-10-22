type WorkDayObjectTypee = {
  day: number;
  night: number;
  overwork: number;
};

export type WorkDaysType = Record<string, string | WorkDayObjectTypee>;
