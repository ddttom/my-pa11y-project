// csvFormatter.js

/**
 * Formats data into CSV string.
 * @param {Array} data - The data to format.
 * @param {Array<string>} [headers] - Optional headers for the CSV.
 * @param {string} [delimiter=','] - The delimiter to use (default: comma).
 * @returns {string} The formatted CSV string.
 * @throws {Error} If input is invalid.
 */
export function formatCsv(data, headers) {
  global.auditcore.logger.debug('Formatting CSV data...');
  global.auditcore.logger.debug(`Data type: ${typeof data}`);
  global.auditcore.logger.debug(`Data length: ${Array.isArray(data) ? data.length : 'N/A'}`);

  if (!Array.isArray(data)) {
    global.auditcore.logger.error('formatCsv received non-array data:', data);
    throw new Error('Invalid input: data must be an array');
  }

  let csvContent = headers ? `${headers.join(',')}\n` : '';

  csvContent += data.map((row) => Object.values(row).map((cell) => {
    if (cell === null || cell === undefined) {
      return '""';
    }
    return `"${cell.toString().replace(/"/g, '""')}"`;
  }).join(',')).join('\n');

  global.auditcore.logger.debug('CSV formatting completed.');
  return csvContent;
}
