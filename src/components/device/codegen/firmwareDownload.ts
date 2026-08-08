/** Browser download helper — kept out of the pure builder module. */
export function triggerDownload(content: string, filename: string, delayMs = 500): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, delayMs);
  });
}

/** Fetch a public asset with aggressive cache-busting headers. */
export async function fetchNoStore(url: string): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}
