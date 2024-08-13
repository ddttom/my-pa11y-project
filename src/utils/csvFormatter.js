/* eslint-disable import/prefer-default-export */
/* eslint-disable import/extensions */
// csvFormatter.js

function escapeCell(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }
  return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function formatCsv(data, headers, logger) {
  logger.debug('Formatting CSV data...');
  logger.debug('Data type:', typeof data);
  logger.debug('Data length:', Array.isArray(data) ? data.length : 'N/A');

  if (!Array.isArray(data)) {
    logger.error('formatCsv received non-array data:', data);
    throw new Error('Invalid input: data must be an array');
  }

  let csvContent = '';

  if (headers && Array.isArray(headers)) {
    csvContent += `${headers.map(escapeCell).join(',')}\n`;
  }

  data.forEach((row, index) => {
    try {
      if (Array.isArray(row)) {
        csvContent += `${row.map(escapeCell).join(',')}\n`;
      } else if (typeof row === 'object' && row !== null) {
        const values = headers ? headers.map((header) => row[header] || '') : Object.values(row);
        csvContent += `${values.map(escapeCell).join(',')}\n`;
      } else {
        throw new Error(`Invalid row type at index ${index}`);
      }
    } catch (error) {
      logger.error(`Error processing row at index ${index}:`, error);
      logger.debug('Problematic row:', row);
      // Optionally, you can choose to skip this row or add a placeholder
      csvContent += 'ERROR\n';
    }
  });

  logger.debug('CSV formatting completed.');
  return csvContent;
}
