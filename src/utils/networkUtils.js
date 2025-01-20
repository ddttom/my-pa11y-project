/**
 * Execute a network operation with enhanced error handling
 */
export async function executeNetworkOperation(operation, operationName) {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (isNetworkError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Network operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        console.error(`\nNetwork error during ${operationName}:`);
        console.error(error.message);
        console.error('Please check your network connection and try again.');

        // Use the ask_followup_question tool directly
        const question = `<ask_followup_question>
          <question>Would you like to retry? (yes/no)</question>
        </ask_followup_question>`;
        
        console.log(question);
        const response = await new Promise(resolve => {
          process.stdin.once('data', data => {
            resolve(data.toString().trim().toLowerCase());
          });
        });

        if (response !== 'yes') {
          throw new Error('Operation cancelled by user');
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * Check if an error is network-related
 */
function isNetworkError(error) {
  const networkErrorCodes = [
    'ENOTFOUND', // DNS lookup failed
    'ECONNRESET', // Connection reset
    'ECONNREFUSED', // Connection refused
    'ETIMEDOUT', // Connection timed out
    'EHOSTUNREACH', // Host unreachable
    'ENETUNREACH', // Network unreachable
    'EAI_AGAIN' // Temporary DNS failure
  ];

  return networkErrorCodes.includes(error.code) ||
         error.message.includes('net::ERR_INTERNET_DISCONNECTED') ||
         error.message.includes('net::ERR_NETWORK_CHANGED') ||
         error.message.includes('net::ERR_CONNECTION_RESET') ||
         error.message.includes('net::ERR_CONNECTION_REFUSED') ||
         error.message.includes('net::ERR_CONNECTION_TIMED_OUT');
}

/**
 * Execute a browser-based network operation with enhanced error handling
 */
export async function executeBrowserNetworkOperation(operation, operationName) {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (isNetworkError(error)) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Browser network operation failed after ${maxRetries} attempts: ${error.message}`);
        }

        console.error(`\nBrowser network error during ${operationName}:`);
        console.error(error.message);
        console.error('Please check your network connection and browser configuration.');

        // Use the ask_followup_question tool directly
        const question = `<ask_followup_question>
          <question>Would you like to retry? (yes/no)</question>
        </ask_followup_question>`;
        
        console.log(question);
        const response = await new Promise(resolve => {
          process.stdin.once('data', data => {
            resolve(data.toString().trim().toLowerCase());
          });
        });

        if (response !== 'yes') {
          throw new Error('Operation cancelled by user');
        }
      } else {
        throw error;
      }
    }
  }
}
