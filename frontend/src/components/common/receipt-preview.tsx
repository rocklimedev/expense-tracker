import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fetchAttachmentUrl } from '@/lib/api-query';
import type { Attachment } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function ReceiptPreview({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const isPdf = attachment.mimeType === 'application/pdf';
  const canPreviewPdf = navigator.pdfViewerEnabled !== false;
  const canPreview =
    isPdf || ['image/jpeg', 'image/png', 'image/webp'].includes(attachment.mimeType);

  useEffect(() => {
    if (!canPreview) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;

    fetchAttachmentUrl(attachment.id, controller.signal)
      .then((receiptUrl) => {
        if (controller.signal.aborted) {
          URL.revokeObjectURL(receiptUrl);
          return;
        }
        objectUrl = receiptUrl;
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, canPreview]);

  if (failed || !canPreview) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Preview unavailable. Use Open to view the receipt.
      </p>
    );
  }
  if (!url) {
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Loading receipt preview…
      </p>
    );
  }

  return (
    <>
      <div className="relative border-t bg-muted/30">
        {isPdf && canPreviewPdf && (
          <iframe
            title={`Preview of ${attachment.originalName}`}
            src={`${url}#toolbar=0`}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none h-80 w-full"
          />
        )}
        {!isPdf && (
          <img
            src={url}
            alt=""
            className="max-h-96 w-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
        <button
          type="button"
          aria-label={`View ${attachment.originalName}`}
          aria-haspopup="dialog"
          className="absolute inset-0 w-full cursor-zoom-in rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          onClick={() => viewer.current?.showModal()}
        />
        {isPdf && !canPreviewPdf && <p className="p-3 text-center text-sm font-medium">View PDF</p>}
      </div>

      <dialog
        ref={viewer}
        aria-label={attachment.originalName}
        className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/60"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <h2 className="min-w-0 truncate text-sm font-semibold">{attachment.originalName}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close receipt viewer"
            onClick={() => viewer.current?.close()}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {isPdf && canPreviewPdf && (
          <iframe
            title={attachment.originalName}
            src={url}
            loading="lazy"
            className="block h-[72dvh] w-full"
          />
        )}
        {isPdf && !canPreviewPdf && (
          <div className="space-y-3 p-4 text-sm">
            <p>This browser opens PDFs in a separate tab.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Open PDF
            </a>
          </div>
        )}
        {!isPdf && (
          <img
            src={url}
            alt={attachment.originalName}
            className="max-h-[72dvh] w-full object-contain"
          />
        )}
      </dialog>
    </>
  );
}
