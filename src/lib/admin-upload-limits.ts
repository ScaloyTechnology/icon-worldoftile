export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

export function formatUploadMegabytes(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes > 0 && megabytes < 0.01 ? "<0.01 MB" : `${megabytes.toFixed(2)} MB`;
}
