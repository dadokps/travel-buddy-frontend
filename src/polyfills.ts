
// This file provides polyfills and compatibility patches for React Native Web

// Window global assignment for packages expecting it
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.global = window;
}

// Setup console reports for errors
console.reportErrorsAsExceptions = false;

export {}; // Make this a module
