import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  Loader2,
  Circle,
  FileText,
  Copy,
  ArrowRight,
} from 'lucide-react';

import * as api from '../../services/api';
import { Case, DocumentType } from '../../types';
import { Card, PageHeader, Button } from '../../components/ui/Primitives';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DOC_TYPES } from '../../services/mockData';
import { truncateHash } from '../../utils/format';

const ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
const MAX_SIZE_MB = 25;

type PipelineStepKey =
  | 'upload'
  | 'store'
  | 'ocr'
  | 'hash'
  | 'blockchain'
  | 'verify';

const STEPS: { key: PipelineStepKey; label: string }[] = [
  { key: 'upload', label: 'Uploading document' },
  { key: 'store', label: 'Document stored' },
  { key: 'ocr', label: 'OCR processing' },
  { key: 'hash', label: 'SHA-256 hash generated' },
  { key: 'blockchain', label: 'Blockchain registration' },
  { key: 'verify', label: 'Security verification' },
];

const UploadDocumentPage: React.FC = () => {
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const [cases, setCases] = React.useState<Case[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const [form, setForm] = React.useState({
    caseId: '',
    documentType: DOC_TYPES[0] as DocumentType,
    title: '',
    description: '',
    tags: '',
  });

  const [stepIdx, setStepIdx] = React.useState(-1);
  const [processing, setProcessing] = React.useState(false);

  const [result, setResult] = React.useState<
    Awaited<ReturnType<typeof api.completeDocumentPipeline>> | null
  >(null);

  const [error, setError] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.getCases().then(setCases).catch((err) => {
      console.error('Failed to load cases:', err);
      setError('Unable to load cases.');
    });
  }, []);

  function pickFile(f: File | undefined | null) {
    if (!f) return;

    const ext = `.${f.name.split('.').pop()?.toLowerCase()}`;

    if (!ACCEPTED.includes(ext)) {
      setError(
        `Unsupported file type "${ext}". Accepted formats: ${ACCEPTED.join(
          ', '
        )}`
      );
      return;
    }

    if (f.size / (1024 * 1024) > MAX_SIZE_MB) {
      setError(`File exceeds the ${MAX_SIZE_MB} MB maximum size.`);
      return;
    }

    setError('');
    setFile(f);

    if (!form.title) {
      setForm((s) => ({
        ...s,
        title: f.name.replace(/\.[^.]+$/, ''),
      }));
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function runPipeline(e: React.FormEvent) {
    e.preventDefault();

    if (!file || !form.caseId) {
      setError('Select a case and a file before uploading.');
      return;
    }

    setError('');
    setProcessing(true);
    setStepIdx(0);

    try {
      /*
       * STEP 1
       * Upload the actual File object to the backend.
       *
       * IMPORTANT:
       * `file` must be included here.
       */
      const kind =
        file.name.endsWith('.docx')
          ? 'docx'
          : /\.(png|jpe?g)$/i.test(file.name)
            ? 'image'
            : 'pdf';

      const created = await api.uploadDocument(
        {
          caseId: form.caseId,
          documentType: form.documentType,
          title: form.title,
          description: form.description,
          fileName: file.name,
          fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          fileKind: kind,

          // IMPORTANT FIX
          file: file,

          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
        session!.name
      );

      /*
       * Upload successful.
       */
      setStepIdx(1);

      /*
       * Small UI delay so user can see
       * "Document stored".
       */
      await new Promise((r) => setTimeout(r, 500));

      /*
       * STEP 2
       * OCR / document processing.
       */
      setStepIdx(2);

      const finalDoc = await api.completeDocumentPipeline(
        created.id,
        session!.name
      );

      /*
       * Processing completed.
       */
      setStepIdx(STEPS.length - 1);

      await new Promise((r) => setTimeout(r, 500));

      setResult(finalDoc ?? created);

      show(
        'Document uploaded and processed successfully.',
        'success'
      );
    } catch (err) {
      console.error('Document upload/processing failed:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Document upload failed. Please try again.';

      setError(message);

      show(
        'Document upload failed. Please check the error message.',
        'error'
      );
    } finally {
      /*
       * VERY IMPORTANT:
       * Spinner will ALWAYS stop here,
       * even if upload/OCR fails.
       */
      setProcessing(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setStepIdx(-1);

    setForm({
      caseId: '',
      documentType: DOC_TYPES[0],
      title: '',
      description: '',
      tags: '',
    });

    setError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  /*
   * SUCCESS SCREEN
   */
  if (result) {
    return (
      <div>
        <PageHeader
          title="Upload Document"
          description="Document successfully processed and secured."
        />

        <Card className="p-6 max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-full bg-verified-50 text-verified-600 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-ink-900">
                Document secured successfully
              </h2>

              <p className="text-sm text-slate-500">
                {result.fileName}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {[
              'Document Uploaded',
              'OCR Completed',
              'SHA-256 Hash Generated',
              'Blockchain Registration Complete',
              'Document Integrity Protected',
            ].map((line) => (
              <div
                key={line}
                className="flex items-center gap-2 text-sm text-ink-700"
              >
                <CheckCircle2
                  size={15}
                  className="text-verified-500 shrink-0"
                />

                {line}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Document ID
              </p>

              <p className="text-sm font-medium text-ink-900">
                {result.id}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">
                Blockchain Transaction ID
              </p>

              <button
                onClick={() => {
                  if (result.blockchainTxId) {
                    navigator.clipboard?.writeText(
                      result.blockchainTxId
                    );

                    show(
                      'Transaction ID copied.',
                      'success'
                    );
                  }
                }}
                className="hash-text text-xs text-ink-800 flex items-center gap-1.5 hover:text-brand-600"
              >
                {result.blockchainTxId
                  ? truncateHash(
                      result.blockchainTxId,
                      10,
                      6
                    )
                  : 'Pending'}

                <Copy size={11} />
              </button>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 mb-1">
                SHA-256 Hash
              </p>

              <p className="hash-text text-xs text-ink-800 break-all">
                {result.currentHash}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              icon={<ArrowRight size={14} />}
              onClick={() =>
                navigate(`/documents/${result.id}`)
              }
            >
              View Document Details
            </Button>

            <Button
              variant="outline"
              onClick={reset}
            >
              Upload Another Document
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /*
   * UPLOAD SCREEN
   */
  return (
    <div>
      <PageHeader
        title="Upload Document"
        description="Add a new document to a case. It will be OCR-processed and registered for integrity verification."
      />

      <form
        onSubmit={runPipeline}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        <Card className="lg:col-span-2 p-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
              dragActive
                ? 'border-brand-400 bg-brand-50/50'
                : 'border-slate-300 hover:border-brand-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              className="hidden"
              onChange={(e) =>
                pickFile(e.target.files?.[0])
              }
            />

            {file ? (
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 max-w-full">
                <File
                  size={20}
                  className="text-brand-600 shrink-0"
                />

                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate max-w-xs">
                    {file.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-slate-400 hover:text-alert-500 ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <UploadCloud size={22} />
                </div>

                <p className="text-sm font-medium text-ink-800">
                  Drag and drop a file here, or click to browse
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, PNG, JPG, JPEG, DOCX · Max{' '}
                  {MAX_SIZE_MB} MB
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-xs text-alert-600 mt-3">
              {error}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <Field label="Case">
              <select
                required
                value={form.caseId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    caseId: e.target.value,
                  })
                }
                className="input"
              >
                <option value="">
                  Select a case…
                </option>

                {cases.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.caseNumber} — {c.caseName}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Document Type">
              <select
                value={form.documentType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    documentType:
                      e.target.value as DocumentType,
                  })
                }
                className="input"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Document Title"
              className="sm:col-span-2"
            >
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="e.g. FIR - Theft Case 142/2026"
                className="input"
              />
            </Field>

            <Field
              label="Description"
              className="sm:col-span-2"
            >
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Brief description of this document…"
                className="input resize-none"
              />
            </Field>

            <Field
              label="Tags (comma separated)"
              className="sm:col-span-2"
            >
              <input
                value={form.tags}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tags: e.target.value,
                  })
                }
                placeholder="e.g. urgent, theft, station-a"
                className="input"
              />
            </Field>
          </div>

          <Button
            type="submit"
            className="mt-5"
            loading={processing}
            disabled={!file || processing}
          >
            {processing
              ? 'Processing…'
              : 'Upload & Secure Document'}
          </Button>
        </Card>

        <Card className="p-5 h-fit">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">
            Processing Pipeline
          </h3>

          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const done =
                stepIdx > i ||
                (stepIdx === i && !processing);

              const active =
                stepIdx === i && processing;

              return (
                <div
                  key={step.key}
                  className="flex items-center gap-3"
                >
                  {done ? (
                    <CheckCircle2
                      size={18}
                      className="text-verified-500 shrink-0"
                    />
                  ) : active ? (
                    <Loader2
                      size={18}
                      className="text-brand-500 animate-spin shrink-0"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="text-slate-300 shrink-0"
                    />
                  )}

                  <span
                    className={`text-sm ${
                      done
                        ? 'text-ink-800 font-medium'
                        : active
                          ? 'text-brand-700 font-medium'
                          : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {file && stepIdx === -1 && (
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              <FileText size={14} />

              Ready to process {file.name}
            </div>
          )}
        </Card>
      </form>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({
  label,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-medium text-ink-700 mb-1.5">
      {label}
    </span>

    {children}
  </label>
);

export default UploadDocumentPage;