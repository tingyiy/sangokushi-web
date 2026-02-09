import { rtkApi } from './rtk-api';

declare global {
  interface Window {
    rtk: typeof rtkApi;
  }
}

/**
 * Mount the Automation API to window.rtk
 * v2 (2026-02-09)
 */
export function mountApi() {
  if (typeof window !== 'undefined') {
    window.rtk = rtkApi;
    console.log('RTK Automation API mounted at window.rtk');
  }
}

// Auto-mount in DEV mode
if (import.meta.env.DEV) {
  mountApi();
}
