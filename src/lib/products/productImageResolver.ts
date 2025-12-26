export type ProductImageSource = {
  thumbnail_base64?: string | null;
  images_base64?: string | null;
  thumbnail_image?: string | null;
  thumbnailImage?: string | null;
  thumbnail_url?: string | null;
  imageUrl?: string | null;
  images?: unknown;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getFirstImageFromImagesField = (images: unknown): string | null => {
  if (!images) return null;

  if (Array.isArray(images)) {
    const first = normalizeString(images[0]);
    return first;
  }

  if (typeof images === 'string') {
    const direct = normalizeString(images);
    if (!direct) return null;
    try {
      const parsed = JSON.parse(direct);
      if (Array.isArray(parsed)) {
        return normalizeString(parsed[0]);
      }
    } catch {
      return direct;
    }
  }

  if (typeof images === 'object') {
    const obj = images as Record<string, unknown>;
    const thumb = normalizeString(obj.thumbnail_image);
    if (thumb) return thumb;
    const extras = obj.additional_images;
    if (Array.isArray(extras) && extras.length > 0) {
      const first = extras[0];
      if (typeof first === 'string') return normalizeString(first);
      if (first && typeof first === 'object') {
        return normalizeString((first as Record<string, unknown>).url);
      }
    }
  }

  return null;
};

const getFirstBase64Image = (imagesBase64: unknown): string | null => {
  const base64Value = normalizeString(imagesBase64);
  if (!base64Value) return null;
  try {
    const parsed = JSON.parse(base64Value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeString(parsed[0]);
    }
  } catch {
    return base64Value;
  }
  return null;
};

export const resolveProductImageSrc = (
  product: ProductImageSource | null | undefined,
  fallback: string = '/placeholder-product.jpg'
): string => {
  if (!product) return fallback;

  const localThumb = normalizeString(product.thumbnail_base64);
  if (localThumb) return localThumb;

  const localImages = getFirstBase64Image(product.images_base64);
  if (localImages) return localImages;

  const thumb =
    normalizeString(product.thumbnail_image) ||
    normalizeString(product.thumbnailImage) ||
    normalizeString(product.thumbnail_url) ||
    normalizeString(product.imageUrl);
  if (thumb) return thumb;

  const imagesField = getFirstImageFromImagesField(product.images);
  if (imagesField) return imagesField;

  return fallback;
};
