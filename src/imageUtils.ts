/**
 * Compresses an image file down to a reasonable size before it's converted
 * to a base64 data URL and sent to the server as JSON.
 *
 * Why this exists: receipt/payment-proof uploads were previously converted
 * to base64 directly from the raw file with no resizing or compression.
 * A full-resolution phone camera photo (commonly 3-8MB) inflates by ~33%
 * once base64-encoded, easily exceeding Vercel's serverless function
 * payload limit and causing a 413 (FUNCTION_PAYLOAD_TOO_LARGE) error on
 * checkout. This resizes to a reasonable max dimension and re-encodes as
 * a compressed JPEG, typically bringing even a 12MP photo down to a few
 * hundred KB -- comfortably under the limit while staying perfectly
 * legible for a receipt or payment screenshot.
 */
export function compressImageToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not load the selected image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read the selected file"));
    reader.readAsDataURL(file);
  });
}
