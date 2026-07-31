/**
 * Utility for client-side image compression and resizing using HTML5 Canvas.
 * Protects local storage and upload bandwidth by shrinking megabyte camera files down to ~80-150KB.
 */
export async function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.82
): Promise<{ dataUrl: string; compressedFile: File }> {
  return new Promise((resolve, reject) => {
    // Non-image files or unsupported types return early
    if (!file.type.startsWith('image/')) {
      reject(new Error('Provided file is not a valid image format.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not supported'));
          return;
        }

        // Draw and compress image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, quality);

        // Convert dataURL back to File for Firebase Storage upload
        try {
          const byteString = atob(dataUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: outputType });
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: outputType });

          resolve({ dataUrl, compressedFile });
        } catch (err) {
          // If Blob conversion fails, fallback with original file and dataUrl
          resolve({ dataUrl, compressedFile: file });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
