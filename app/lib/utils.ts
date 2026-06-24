import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import imageCompression from "browser-image-compression";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dataURLtoBlob(dataURL: string) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function compressImage(
  blob: Blob,
  maxDimension = 2048,
  quality = 0.8,
): Promise<Blob> {
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "image.png", { type: blob.type });

  return imageCompression(file, {
    maxWidthOrHeight: maxDimension,
    fileType: "image/jpeg",
    initialQuality: quality,
    useWebWorker: true,
  });
}
