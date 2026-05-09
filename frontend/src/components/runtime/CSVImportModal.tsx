'use client';
import { useState, useRef } from 'react';
import { csvApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { X, Upload, CheckCircle, AlertCircle, Loader, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  appId: string;
  entity: string;
  entityConfig: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CSVImportModal({ appId, entity, entityConfig, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'done'>('upload');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // FIX 1: Track selected filename for better UX feedback
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    // FIX 2: Guard against non-CSV files slipping through
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    // FIX 3: Guard against oversized files (10 MB)
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large — maximum 10 MB');
      return;
    }

    setFileName(f.name);
    setLoading(true);
    try {
      const r = await csvApi.import(appId, entity, f);
      // FIX 4: Safely read result — API may nest differently
      const data = r?.data?.data ?? r?.data ?? {};
      setResult(data);
      setStep('done');
      if ((data.imported ?? 0) > 0) {
        toast.success(`Imported ${data.imported} records!`);
      } else {
        toast.error('No records were imported — check the file format');
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
      // FIX 5: Reset file input so user can retry the same file
      if (inputRef.current) inputRef.current.value = '';
      setFileName(null);
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setStep('upload');
    setResult(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl animate-slide-up">
        {/* Header — FIX 6: Removed broken unicode arrow â†' → plain arrow */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Import CSV → {entityConfig?.label || entity}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Upload step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
                  ${loading
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader size={32} className="text-indigo-500 animate-spin mb-3" />
                    <p className="font-medium text-indigo-600 dark:text-indigo-400">
                      Importing {fileName}…
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Please wait</p>
                  </>
                ) : fileName ? (
                  <>
                    <FileText size={32} className="text-indigo-500 mb-3" />
                    <p className="font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
                    <p className="text-xs text-gray-400 mt-1">Ready to import</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400 mb-3" />
                    <p className="font-medium text-gray-600 dark:text-gray-400">
                      Click to upload CSV file
                    </p>
                    {/* FIX 7: Removed broken unicode â€" → plain dash */}
                    <p className="text-xs text-gray-400 mt-1">
                      Max 10 MB — first row must be column headers
                    </p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={loading}
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>

              {/* FIX 8: Show expected column headers so users know what CSV format to use */}
              {entityConfig?.fields && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Expected CSV columns:
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                    {entityConfig.fields
                      .filter((f: any) => !f.hidden && f.name !== 'id')
                      .map((f: any) => f.name)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Done step */}
          {step === 'done' && result && (
            <div className="text-center py-6 space-y-4">
              {(result.imported ?? 0) > 0 ? (
                <CheckCircle size={48} className="text-green-500 mx-auto" />
              ) : (
                <AlertCircle size={48} className="text-yellow-500 mx-auto" />
              )}

              <div>
                <p className="font-semibold text-lg text-gray-900 dark:text-white">
                  {result.imported ?? 0} records imported
                </p>
                <p className="text-sm text-gray-500">
                  {result.failed ?? 0} errors out of {result.total ?? 0} rows
                </p>
              </div>

              {/* FIX 9: Show all error rows, not just first 5 with scroll */}
              {result.errors?.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-950 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                    Import errors:
                  </p>
                  {result.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">
                      Row {e.row}: {e.error}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                {/* FIX 10: Always show Retry so user can upload another file */}
                <button onClick={handleRetry} className="btn-secondary">
                  Import Another
                </button>
                <button onClick={onClose} className="btn-secondary">
                  Close
                </button>
                {(result.imported ?? 0) > 0 && (
                  <button onClick={onSuccess} className="btn-primary">
                    View Records
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}