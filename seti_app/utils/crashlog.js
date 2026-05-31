import { Platform } from 'react-native';

let logs = [];

export function logCrash(error, context = '') {
  const entry = `[${new Date().toISOString()}] ${context}: ${error?.message || error}\n${error?.stack || ''}`;
  logs.push(entry);
  console.error('CRASH LOG:', entry);
}

export function getCrashLogs() {
  return logs.join('\n---\n');
}

// Global handler for uncaught JS errors
if (Platform.OS !== 'web') {
  const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
  if (global.ErrorUtils) {
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      logCrash(error, isFatal ? 'FATAL' : 'NON-FATAL');
      if (originalHandler) originalHandler(error, isFatal);
    });
  }
}
