'use client';
import { useState } from 'react';
import { csvApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { X, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props { appId: string; entity: string; entityConfig: any; onClose: () => void; onSuccess: () => void; }

export function CSVImportModal({ appId, entity, entityConfig, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'done'>('upload');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(f: File) {
    setLoading(true);
    try {
      const r = await csvApi.import(appId, entity, f);
      setResult(r.data.data);
      setStep('done');
      if (r.data.data.imported > 0) toast.success(`Imported ${r.data.data.imported} records!`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold">Import CSV → {entityConfig?.label || entity}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 cursor-pointer hover:border-indigo-400 transition-colors">
              <Upload size={32} className="text-gray-400 mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">Click to upload CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 10MB — first row must be column headers</p>
              <input type="file" accept=".csv" className="hidden" disabled={loading}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {loading && <Loader size={20} className="animate-spin mt-3 text-indigo-500" />}
            </label>
          )}

          {step === 'done' && result && (
            <div className="text-center py-6 space-y-4">
              {result.imported > 0
                ? <CheckCircle size={48} className="text-green-500 mx-auto" />
                : <AlertCircle size={48} className="text-yellow-500 mx-auto" />}
              <div>
                <p className="font-semibold text-lg">{result.imported} records imported</p>
                <p className="text-sm text-gray-500">{result.failed || 0} errors out of {result.total} rows</p>
              </div>
              {result.errors?.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-950 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 5).map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={onClose} className="btn-secondary">Close</button>
                {result.imported > 0 && <button onClick={onSuccess} className="btn-primary">View Records</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}