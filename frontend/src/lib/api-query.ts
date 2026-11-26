import { skipToken, type FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { requestMessage, serverApi, type WriteOptions } from './server-api';
import { store } from './store';

export function useApiQuery<T>(path: string | null) {
  const { currentData, error, isFetching, isUninitialized, refetch } = serverApi.useReadQuery(
    path ?? skipToken,
  );
  return {
    data: currentData as T | undefined,
    error: error ? requestMessage(error as FetchBaseQueryError) : null,
    loading: isFetching,
    reload: () => {
      if (!isUninitialized) void refetch();
    },
  };
}

// Supports sequenced writes such as creating a draft, uploading receipts, and submitting.
export async function writeApi<T = unknown>(path: string, options: WriteOptions): Promise<T> {
  try {
    return (await store
      .dispatch(serverApi.endpoints.write.initiate({ path, ...options }, { track: false }))
      .unwrap()) as T;
  } catch (error) {
    throw new Error(requestMessage(error as FetchBaseQueryError));
  }
}

export async function fetchAttachmentUrl(id: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const request = store.dispatch(
    serverApi.endpoints.downloadReceipt.initiate(id, { track: false }),
  );
  const abort = () => request.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    return await request.unwrap();
  } catch {
    throw new Error('Could not open the receipt');
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

export async function openAttachment(id: string) {
  const url = await fetchAttachmentUrl(id);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
