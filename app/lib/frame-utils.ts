/**
 * Canonical frame key utilities for multi-page Fabric.js layouts.
 *
 * Every frame in a layout is identified by a **canonical key** of the form
 * `p${pageIndex}_${rawFrameId}`. This module is the single source of truth
 * for building, parsing and normalising those keys.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayoutImage {
  id: string;
  url: string;
  preview_url: string;
}

export interface FrameInfo {
  id: string;
  label: string;
  pageIndex: number;
}

export interface ExpectedFrame {
  pageIndex: number;
  frameId: string;
  canonicalKey: string;
  label: string;
}

export interface ValidationResult {
  valid: boolean;
  missingFrames: ExpectedFrame[];
  totalFrames: number;
  filledFrames: number;
}

// ---------------------------------------------------------------------------
// Canvas JSON helpers (pure – no Fabric import required)
// ---------------------------------------------------------------------------

/**
 * Strip known prefixes (`p0_`, `dup12345_`, etc.) to obtain the raw Fabric
 * object id.
 */
export function extractRawFrameId(id: string): string {
  return id
    .replace(/^p\d+_/, "")
    .replace(/^dup\d+_/, "");
}

function isImageFrame(obj: any): boolean {
  const name = String(obj?.name || "").toLowerCase();
  return (
    obj?.isFrame === true ||
    obj?.customData?.isFrame === true ||
    name === "photo-frame" ||
    name === "image-frame" ||
    (name.includes("frame") && !name.startsWith("placeholder-") && !name.startsWith("uploaded-"))
  );
}

function objectsToFrames(objects: any[], pageIndex: number): FrameInfo[] {
  return objects
    .filter(isImageFrame)
    .map((obj, index) => {
      const rawId = String(obj.id || obj.name || `slot_${index + 1}`);
      const id = extractRawFrameId(rawId);
      return {
        id,
        label:
          typeof obj.label === "string" && obj.label.trim()
            ? obj.label.trim()
            : `Foto ${index + 1}`,
        pageIndex,
      };
    });
}

function isMultiPageState(state: any): boolean {
  return Array.isArray(state?.pages);
}

/**
 * Extract all frame definitions from a Fabric canvas state (single- or multi-page).
 * Pure JSON – does **not** require a live Fabric canvas.
 */
export function extractFramesFromCanvasState(
  canvasState: any,
): FrameInfo[] {
  if (!canvasState) return [];

  if (isMultiPageState(canvasState)) {
    return canvasState.pages.flatMap((page: any, pIdx: number) =>
      objectsToFrames(page.canvasState?.objects || [], pIdx),
    );
  }

  return objectsToFrames(canvasState.objects || [], 0);
}

// ---------------------------------------------------------------------------
// Canonical key helpers
// ---------------------------------------------------------------------------

/** Build the canonical key for a frame. This is the ONLY place keys are built. */
export function getFrameKey(pageIndex: number, frameId: string): string {
  return `p${pageIndex}_${frameId}`;
}

// ---------------------------------------------------------------------------
// Upsert helper
// ---------------------------------------------------------------------------

/** Replace-or-insert an image entry keyed by canonical frame key. */
export function upsertImage(
  images: LayoutImage[],
  pageIndex: number,
  frameId: string,
  url: string,
  preview_url: string,
): LayoutImage[] {
  const key = getFrameKey(pageIndex, frameId);
  const idx = images.findIndex((img) => img.id === key);
  const entry: LayoutImage = { id: key, url, preview_url };

  if (idx !== -1) {
    const updated = [...images];
    updated[idx] = entry;
    return updated;
  }
  return [...images, entry];
}

// ---------------------------------------------------------------------------
// Normalization (reading old data)
// ---------------------------------------------------------------------------

/** Normalise an `images[]` array that may contain old-format ids. */
export function normalizeImageIds(
  images: LayoutImage[],
  fabricJsonState: any,
): LayoutImage[] {
  const frames = extractFramesFromCanvasState(fabricJsonState);

  // Map: rawId → list of pageIndexes where it appears
  const framePages = new Map<string, number[]>();
  for (const f of frames) {
    const pages = framePages.get(f.id) || [];
    pages.push(f.pageIndex);
    framePages.set(f.id, pages);
  }

  const seen = new Set<string>();
  const consumed = new Map<string, number>();
  const normalized: LayoutImage[] = [];

  for (const img of images) {
    const rawId = extractRawFrameId(img.id);
    const pages = framePages.get(rawId);
    if (!pages || pages.length === 0) continue;

    // Already canonical format — use directly
    if (/^p\d+_/.test(img.id)) {
      if (!seen.has(img.id)) {
        seen.add(img.id);
        normalized.push(img);
      }
      continue;
    }

    // Old format: assign to next available page for this rawId
    const count = consumed.get(rawId) || 0;
    const pageIndex = pages[count % pages.length];
    consumed.set(rawId, count + 1);

    const canonicalKey = getFrameKey(pageIndex, rawId);
    if (seen.has(canonicalKey)) continue;

    seen.add(canonicalKey);
    normalized.push({ ...img, id: canonicalKey });
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Collect every frame the layout expects to be filled. */
export function getExpectedFrames(fabricJsonState: any): ExpectedFrame[] {
  const frames = extractFramesFromCanvasState(fabricJsonState);
  return frames.map((f) => ({
    pageIndex: f.pageIndex,
    frameId: f.id,
    canonicalKey: getFrameKey(f.pageIndex, f.id),
    label: `Página ${f.pageIndex + 1} — ${f.label}`,
  }));
}

/** Check whether all required frames have an image. */
export function validateCustomization(
  images: LayoutImage[],
  fabricJsonState: any,
): ValidationResult {
  const expected = getExpectedFrames(fabricJsonState);
  const filledKeys = new Set(images.map((img) => img.id));

  const missingFrames = expected.filter(
    (frame) => !filledKeys.has(frame.canonicalKey),
  );

  return {
    valid: missingFrames.length === 0,
    missingFrames,
    totalFrames: expected.length,
    filledFrames: expected.length - missingFrames.length,
  };
}
