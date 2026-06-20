// Shared browser-side image preparation for every scanner.
//
// Two consumers, two needs:
//   - OCR (Tesseract) wants clean black-on-white, so it binarizes.
//   - A vision model wants the real color photo, so it does NOT binarize.
// Both first need the same thing: a decodable, reasonably-sized raster. HEIC
// (the default iPhone format) can't be decoded by canvas in most browsers, so
// we convert it to PNG via libheif (WASM), loaded lazily.

const MAX_DIM = 2000

// Produce a binarized PNG for OCR. See enhanceForOcr for the why.
export async function prepareForOcr(file: Blob): Promise<Blob> {
  const { canvas, ctx } = await drawToCanvas(file)
  enhanceForOcr(ctx, canvas.width, canvas.height)
  return canvasToBlob(canvas, 'image/png')
}

// Produce a base64 JPEG for a vision model — full color, just decoded and
// downscaled. JPEG keeps the upload small without hurting model accuracy.
export async function prepareForVision(
  file: Blob,
): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  const { canvas } = await drawToCanvas(file)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
  return { base64: await blobToBase64(blob), mediaType: 'image/jpeg' }
}

async function drawToCanvas(
  file: Blob,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const decodable = await toDecodable(file)
  const { source, width, height, cleanup } = await decode(decodable)
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get a 2D canvas context.')
    ctx.drawImage(source, 0, 0, w, h)
    return { canvas, ctx }
  } finally {
    cleanup()
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image.'))),
      type,
      quality,
    ),
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image.'))
    reader.onload = () => {
      const result = reader.result as string
      // Strip the "data:<type>;base64," prefix — the API wants raw base64.
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

// Turn a color phone photo into clean black-on-white, which is what Tesseract
// was built to read. Grayscale removes color noise; an adaptive threshold then
// makes each pixel black or white based on its LOCAL neighborhood, so shadows
// and uneven lighting across the receipt don't wash out the text the way a
// single global cutoff would.
function enhanceForOcr(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h)
  const px = img.data
  const n = w * h

  const gray = new Uint8ClampedArray(n)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    gray[i] = (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) | 0
  }

  const integral = new Float64Array(n)
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      rowSum += gray[i]
      integral[i] = (y > 0 ? integral[i - w] : 0) + rowSum
    }
  }

  const radius = Math.max(8, Math.floor(w / 40))
  const T = 0.85
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(h - 1, y + radius)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(w - 1, x + radius)
      const count = (x1 - x0) * (y1 - y0)
      const sum =
        integral[y1 * w + x1] -
        (x0 > 0 ? integral[y1 * w + x0 - 1] : 0) -
        (y0 > 0 ? integral[(y0 - 1) * w + x1] : 0) +
        (x0 > 0 && y0 > 0 ? integral[(y0 - 1) * w + x0 - 1] : 0)
      const i = y * w + x
      const value = gray[i] * count < sum * T ? 0 : 255
      const o = i * 4
      px[o] = px[o + 1] = px[o + 2] = value
    }
  }

  ctx.putImageData(img, 0, 0)
}

async function toDecodable(file: Blob): Promise<Blob> {
  const { isHeic, heicTo } = await import('heic-to')
  if (!(await isHeic(file as File))) return file
  console.log('[prepare-image] converting HEIC')
  return heicTo({ blob: file, type: 'image/png' })
}

async function decode(
  file: Blob,
): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup: () => void }> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    }
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      }
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(
        "Couldn't read that image. Try a JPG or PNG — HEIC photos aren't supported in this browser.",
      )
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = url
  })
}
