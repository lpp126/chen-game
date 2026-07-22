/** 带进度的资源下载（XHR，可读 Content-Length） */

export type ProgressFn = (ratio: number) => void;

export function loadWithProgress(url: string, onProgress?: ProgressFn): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(1, e.loaded / e.total));
      } else if (e.loaded > 0) {
        // 无总长时给一个缓升假进度，避免卡住在 0
        onProgress(Math.min(0.92, 0.15 + e.loaded / (e.loaded + 400_000)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`load failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send();
  });
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
