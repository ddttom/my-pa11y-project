/* eslint-disable import/prefer-default-export */

// csvFormatter.js

/**
 * Escapes a cell value for CSV format.
 * @param {*} cell - The cell value to escape.
 * @returns {string} The escaped cell value.
 */
function escapeCell(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }
  return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : String(cell);
}

/**
 * Formats data into CSV string.
 * @param {Array} data - The data to format.
 * @param {Array<string>} [headers] - Optional headers for the CSV.
 * @param {Object} logger - The logger object.
 * @param {string} [delimiter=','] - The delimiter to use (default: comma).
 * @returns {string} The formatted CSV string.
 * @throws {Error} If input is invalid.
 */
export function formatCsv(data, headers, delimiter = ',') {
  global.auditcore.logger.debug('Formatting CSV data...');
  global.auditcore.logger.debug('Data type:', typeof data);
  global.auditcore.logger.debug('Data length:', Array.isArray(data) ? data.length : 'N/A');

  if (!Array.isArray(data)) {
    global.auditcore.logger.error('formatCsv received non-array data:', data);
    throw new Error('Invalid input: data must be an array');
  }

  if (headers && !Array.isArray(headers)) {
    global.auditcore.logger.error('formatCsv received non-array headers:', headers);
    throw new Error('Invalid input: headers must be an array or undefined');
  }

  let csvContent = '';

  if (headers && headers.length > 0) {
    csvContent += `${headers.map(escapeCell).join(delimiter)}\n`;
  }

  data.forEach((row, index) => {
    try {
      if (Array.isArray(row)) {
        csvContent += `${row.map(escapeCell).join(delimiter)}\n`;
      } else if (typeof row === 'object' && row !== null) {
        const values = headers ? headers.map((header) => row[header] ?? '') : Object.values(row);
        csvContent += `${values.map(escapeCell).join(delimiter)}\n`;
      } else {
        throw new Error(`Invalid row type at index ${index}`);
      }
    } catch (error) {
      global.auditcore.logger.error(`Error processing row at index ${index}:`, error);
      global.auditcore.logger.debug('Problematic row:', row);
      csvContent += `ERROR${delimiter.repeat(headers ? headers.length - 1 : 0)}\n`;
    }
  });

  global.auditcore.logger.debug('CSV formatting completed.');
  return csvContent;
}
