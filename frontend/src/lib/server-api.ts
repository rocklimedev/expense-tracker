import { createApi, fetchBaseQuery, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { BASE_URL, tokenStore } from './api';
import type { Me } from './types';

export type WriteOptions = {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  body?: FormData;
};

type WriteRequest = WriteOptions & { path: string };

export function requestMessage(error: FetchBaseQueryError): string {
  if ('data' in error && error.data && typeof error.data === 'object' && 'message' in error.data) {
    const { message } = error.data;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  if (error.status === 'FETCH_ERROR') return 'Could not reach the server.';
  const status = error.status === 'PARSING_ERROR' ? error.originalStatus : error.status;
  if (status === 413) return 'The file is too large.';
  return `Request failed (${status}).`;
}

function resource(path: string) {
  return path.split(/[/?]/)[1];
}

function writeTags(path: string) {
  const group = resource(path);
  if (group === 'attachments') return ['expenses'];
  if (group === 'trackers' || group === 'expenses') return ['trackers', 'expenses'];
  if (group === 'rbac') return ['rbac', 'users', 'approval-policies'];
  if (group === 'users') return ['users', 'expenses', 'trackers'];
  return [group];
}

const fetchJson = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders(headers, { endpoint }) {
    const token = tokenStore.get();
    if (token && endpoint !== 'login') headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

export const serverApi = createApi({
  reducerPath: 'serverApi',
  baseQuery: async (args: Parameters<typeof fetchJson>[0], api, options) => {
    const token = tokenStore.get();
    const result = await fetchJson(args, api, options);
    const status =
      result.error?.status === 'PARSING_ERROR' ? result.error.originalStatus : result.error?.status;
    if (status === 401 && api.endpoint !== 'login' && token && tokenStore.get() === token) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return result;
  },
  tagTypes: ['Resource'],
  endpoints: (build) => ({
    read: build.query<unknown, string>({
      query: (path) => path,
      providesTags: (_result, _error, path) => [{ type: 'Resource', id: resource(path) }],
    }),
    write: build.mutation<unknown, WriteRequest>({
      query: ({ path, method, json, body }) => ({ url: path, method, body: json ?? body }),
      invalidatesTags: (_result, error, { path }) =>
        error ? [] : writeTags(path).map((id) => ({ type: 'Resource', id })),
    }),
    currentUser: build.query<Me, void>({ query: () => '/auth/me' }),
    login: build.mutation<{ accessToken: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    downloadReceipt: build.mutation<string, string>({
      async queryFn(id, api, _options, baseQuery) {
        const result = await baseQuery({
          url: `/attachments/${id}/download`,
          responseHandler: (response) => (response.ok ? response.blob() : response.text()),
        });
        if (result.error) return { error: result.error };
        if (api.signal.aborted || !(result.data instanceof Blob)) {
          return { error: { status: 'CUSTOM_ERROR', error: 'Could not open the receipt' } };
        }
        return { data: URL.createObjectURL(result.data) };
      },
    }),
  }),
});
