import { writeApi } from './api-query';

export const RECEIPT_ACCEPT =
  'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf';
export const MAX_RECEIPTS = 10;

export function receiptFileError(file: File): string | undefined {
  if (file.size === 0) return `“${file.name}” is empty.`;
  if (file.size >= 5 * 1024 * 1024) return `“${file.name}” must be under 5 MB.`;
  if (
    !/\.(jpe?g|png|webp|pdf)$/i.test(file.name) &&
    !RECEIPT_ACCEPT.split(',').includes(file.type)
  ) {
    return `“${file.name}” must be a JPEG, PNG, WEBP or PDF.`;
  }
}

export function uploadReceipt(expenseId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return writeApi(`/expenses/${expenseId}/attachments`, { method: 'POST', body: form });
}
