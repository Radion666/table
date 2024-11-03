import { Worksheet } from 'exceljs';

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

export const getColumnFromRange = (range: string) => {
  const match = range.match(/^[A-Z]+/);
  return match ? match[0] : null;
};

export const setSumWithStep = (
  worksheet: Worksheet,
  targetCellId: string,
  startRow: number,
  endRow: number,
  isWeekend: boolean,
  step: number = 3,
) => {
  const column = targetCellId.match(/[A-Z]+/)[0]; // Извлекаем буквы колонки

  const formulaParts = [];
  for (let row = startRow; row < endRow; row = row + step) {
    if (!targetCellId.includes(':')) {
      const cellValue = worksheet.getCell(`${column}${row}`).value;

      console.log(cellValue, +cellValue);
      if (typeof +cellValue === 'number' && !isNaN(+cellValue)) {
        formulaParts.push(`${column}${row}`);
      } else if ((cellValue as any)?.formula) {
        formulaParts.push((cellValue as any)?.formula);
      }
    } else {
      const [firstLetter, secondLetter] = targetCellId.split(':');

      const firstCol = firstLetter.match(/[A-Z]+/)[0]; //;
      const secondCol = secondLetter.match(/[A-Z]+/)[0];

      if (firstCol) {
        const cellValue = worksheet.getCell(`${firstCol}${row}`).value;

        if (typeof cellValue === 'number') {
          formulaParts.push(`${firstCol}${row}:${secondCol}${row}`);
        } else if ((cellValue as any)?.formula) {
          formulaParts.push(cellValue);
        }
      }
    }
  }

  // Если были найдены числовые ячейки, устанавливаем формулу
  if (formulaParts.length > 0) {
    const combinedFormulas = formulaParts.map((part) => {
      // Проверяем, является ли элемент объектом с формулой
      if (typeof part === 'object' && part.formula) {
        return part.formula; // Если это формула, используем её
      }
      return part; // Если это просто ссылка на ячейку, возвращаем её
    });

    // Объединяем формулы и ссылки на ячейки с '+' между ними
    const formula = combinedFormulas.join(' + ');

    worksheet.getCell(targetCellId).value = { formula, result: 0 }; // Устанавливаем формулу в целевую ячейку
    applyAlignment(
      worksheet,
      targetCellId,
      undefined,
      undefined,
      isWeekend ? true : false,
    );
  } else {
    worksheet.getCell(targetCellId).value = 0; // Устанавливаем текст, если нет чисел
    applyAlignment(
      worksheet,
      targetCellId,
      undefined,
      undefined,
      isWeekend ? true : false,
    );
  }
};

export const applyAlignment = (
  worksheet: Worksheet,
  cellRef: string,
  value?: string,
  width?: number,
  fill?: boolean,
) => {
  const cell = worksheet.getCell(cellRef);

  if (value) {
    cell.value = value;
  }

  cell.alignment = { vertical: 'middle', horizontal: 'center' };

  if (fill) {
    const [startCell, endCell] = cellRef.split(':'); // Разделяем диапазон на начало и конец
    const startRow = parseInt(startCell.match(/\d+/)[0]); // Извлекаем номер строки
    const endRow = endCell ? parseInt(endCell.match(/\d+/)[0]) : startRow; // Если есть конец, извлекаем, иначе - стартовая строка
    const column = startCell.match(/[A-Z]+/)[0]; // Извлекаем буквы колонки

    for (let row = startRow; row <= endRow; row++) {
      const cell = worksheet.getCell(`${column}${row}`);

      cell.style = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'd1d5db' },
        },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        },
        alignment: {
          vertical: 'middle',
          horizontal: 'center',
        },
      };
    }
  }

  if (width) {
    const column = getColumnFromRange(cellRef);

    if (column) {
      worksheet.getColumn(column).width = width;
    }
  }
};
