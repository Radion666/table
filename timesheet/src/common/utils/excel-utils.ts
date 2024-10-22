export const generateColumns = (
  start: string = 'D',
  end: string = 'BA',
): string[] => {
  const columns: string[] = [];

  let current = start;
  while (current !== incrementColumn(end)) {
    columns.push(current);
    current = incrementColumn(current);
  }

  return columns;
};

export const incrementColumn = (column: string): string => {
  let carry = 1;
  let result = '';

  for (let i = column.length - 1; i >= 0; i--) {
    const charCode = column.charCodeAt(i) - 65 + carry;
    carry = charCode >= 26 ? 1 : 0;
    result = String.fromCharCode((charCode % 26) + 65) + result;
  }

  return carry ? 'A' + result : result;
};
