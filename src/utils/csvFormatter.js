/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable import/extensions */
// csvFormatter.js

import { debug } from './debug.js';

export function formatCsv(data, headers) {
  debug('Formatting CSV data...');
  debug('Data type:', typeof data);
  debug('Data length:', Array.isArray(data) ? data.length : 'N/A');

  if (!Array.isArray(data)) {
    console.error('formatCsv received non-array data:', data);
    return '';
  }

  let csvContent = '';

  if (headers && Array.isArray(headers)) {
    csvContent += `${headers.join(',')}\n`;
  }

  data.forEach((row, index) => {
    if (Array.isArray(row)) {
      csvContent += `${row.map((cell) => {
        if (cell === null || cell === undefined) {
          return '';
        }
        return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell;
      }).join(',')}\n`;
    } else if (typeof row === 'object' && row !== null) {
      // Handle object rows
      const values = headers ? headers.map((header) => row[header] || '') : Object.values(row);
      csvContent += `${values.map((cell) => {
        if (cell === null || cell === undefined) {
          return '';
        }
        return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell;
      }).join(',')}\n`;
    } else {
      console.error(`Invalid row at index ${index} in CSV data:`, row);
    }
  });

  debug('CSV formatting completed.');
  return csvContent;
}
