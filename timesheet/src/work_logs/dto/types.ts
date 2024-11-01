type WorkDayObjectTypee = {
  day?: number;
  night?: number;
  overwork?: number;
  total?: number;
};

export type WorkDaysType = Record<string, string | WorkDayObjectTypee>;
