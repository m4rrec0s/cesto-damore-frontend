const normalizeGoogleDriveUrl = (url: string): string => {
  if (!url) return url;

  if (
    !url.includes("drive.google.com") &&
    !url.includes("drive.usercontent.google.com")
  ) {
    return url;
  }

  // Extrair FILE_ID de diferentes formatos
  let fileId = null;

  // Formato: /file/d/FILE_ID/view
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];

  // Formato: ?id=FILE_ID ou &id=FILE_ID
  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  // Se encontrou FILE_ID, retornar URL de download direto
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
};

const getDirectImageUrl = (url: string): string => {
  if (!url) return url;

  if (
    !url.includes("drive.google.com") &&
    !url.includes("drive.usercontent.google.com")
  ) {
    return url;
  }

  let fileId: string | null = null;

  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];

  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
};

const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error("Falha ao carregar imagem"));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);

    return img;
  });
};

export { normalizeGoogleDriveUrl, getDirectImageUrl, getImageDimensions };
