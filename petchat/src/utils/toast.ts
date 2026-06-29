export const toast = (msg: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toast', { detail: msg }));
  }
};
