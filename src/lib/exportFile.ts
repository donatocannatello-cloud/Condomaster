import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Inside the packaged Android app there is no browser download manager to
// catch a classic <a download> click or jsPDF's doc.save(): the click
// "succeeds" from the page's point of view but the file lands nowhere the
// user can find. On a native platform we write it to disk via the
// Filesystem plugin and hand it to the system Share sheet instead, so the
// user picks where to save or send it. In a plain browser (npm run dev/
// preview) we keep the familiar direct download.
export async function saveOrShareBase64File(filename: string, base64Data: string, mimeType: string) {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: filename,
      url: result.uri,
    });
    return;
  }

  const byteChars = atob(base64Data);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function utf8ToBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}
