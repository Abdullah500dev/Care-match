import { apiClient } from "@/services/api";

/**
 * Download a file from an authenticated API path that returns binary image data.
 */
export async function downloadAuthenticatedImage(apiPath, filename = "qr-code.png") {
  const path = String(apiPath || "").trim();
  if (!path) throw new Error("No download path");

  try {
    const { data, headers } = await apiClient.get(path, { responseType: "blob" });
    const contentType = String(headers?.["content-type"] || "");
    if (contentType.includes("application/json")) {
      const text = await (data instanceof Blob ? data.text() : Promise.resolve(String(data)));
      let message = "Download failed";
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const blob = data instanceof Blob ? data : new Blob([data], { type: "image/png" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    const data = error?.response?.data;
    if (data instanceof Blob) {
      try {
        const parsed = JSON.parse(await data.text());
        if (parsed?.message) throw new Error(parsed.message);
      } catch (inner) {
        if (inner instanceof Error && !(inner instanceof SyntaxError)) throw inner;
      }
    }
    throw error instanceof Error ? error : new Error("Download failed");
  }
}

/**
 * Fetch a remote QR image and trigger a local file download.
 * Prefer downloadAuthenticatedImage when an API path is available.
 */
export async function downloadImageFile(imageUrl, filename = "qr-code.png") {
  const url = String(imageUrl || "").trim();
  if (!url) throw new Error("No image URL");

  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Copy a remote QR image to the clipboard as PNG (falls back by throwing). */
export async function copyImageToClipboard(imageUrl) {
  const url = String(imageUrl || "").trim();
  if (!url) throw new Error("No image URL");
  if (!navigator?.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported");
  }

  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  const pngBlob =
    blob.type === "image/png"
      ? blob
      : await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || 360;
              canvas.height = img.naturalHeight || 360;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((out) => {
                if (out) resolve(out);
                else reject(new Error("Could not convert image"));
              }, "image/png");
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = () => reject(new Error("Could not load image"));
          img.src = URL.createObjectURL(blob);
        });

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": pngBlob }),
  ]);
}

/** Copy QR via authenticated API blob when remote CORS blocks clipboard fetch. */
export async function copyAuthenticatedImageToClipboard(apiPath) {
  const path = String(apiPath || "").trim();
  if (!path) throw new Error("No download path");
  if (!navigator?.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard image copy is not supported");
  }

  const { data } = await apiClient.get(path, { responseType: "blob" });
  const blob = data instanceof Blob ? data : new Blob([data], { type: "image/png" });
  const pngBlob =
    blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": pngBlob }),
  ]);
}
