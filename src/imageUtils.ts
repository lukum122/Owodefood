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
 *
 * Note: the browser's <img> element (used here to decode the file before
 * drawing it to a canvas) can only decode formats the browser itself
 * supports -- JPEG/PNG/WebP/GIF. It generally cannot decode HEIC/HEIF,
 * which is the *default* photo format on iPhones. A HEIC photo (even one
 * that arrived via sharing/cloud sync onto a different device) will
 * silently fail to decode here -- that's the single most common real
 * cause of a failure in this function, so the error message below calls
 * it out explicitly instead of just saying "try a different photo."
 */
export function compressImageToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const isLikelyUnsupportedFormat =
      /\.(heic|heif)$/i.test(file.name) ||
      file.type === "image/heic" ||
      file.type === "image/heif";

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
      img.onerror = () => {
        if (isLikelyUnsupportedFormat) {
          reject(new Error(
            "This looks like a HEIC/iPhone photo format your browser can't read directly. Please take a screenshot of it, or use your phone's share/export option to save it as JPEG first, then upload that instead."
          ));
        } else {
          reject(new Error("Could not load the selected image — it may be in a format your browser can't read. Try a JPEG, PNG, or a screenshot instead."));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read the selected file. Please try again."));
    reader.readAsDataURL(file);
  });
}
