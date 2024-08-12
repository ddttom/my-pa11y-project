/* eslint-disable no-console */
// debug.js

let isDebugMode = false;

export function setDebugMode(mode) {
  isDebugMode = mode;
}

export function debug(message) {
  if (isDebugMode) {
    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
  }
}
