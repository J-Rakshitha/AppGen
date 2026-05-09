'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { dynamicApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { X, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  appId: string;
  entity: string;
  entityConfig: any;
  record?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function DynamicForm({ appId, entity, entityConfig, record, onClose, onSuccess }: Props) {
  const fields = (entityConfig?.fields || []).filter((f: any) => !f.hidden && f.name !== 'id');

  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    for (const f of fields) {
      init[f.name] = record?.[f.name] ?? f.default ?? '';
    }
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── FIX 1: Client-side validation before submitting ──────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name];
      const isEmpty = v === '' || v === null || v === undefined;
      if (f.required && isEmpty) {
        errs[f.name] = `${f.label || f.name} is required`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── FIX 2: Coerce values to correct types before sending to API ───────────
  function coerceValues(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === 'number' || f.type === 'integer') {
        const n = f.type === 'integer' ? parseInt(v, 10) : parseFloat(v);
        out[f.name] = isNaN(n) ? null : n;
      } else if (f.type === 'boolean') {
        out[f.name] = Boolean(v);
      } else if (f.type === 'json') {
        try { out[f.name] = typeof v === 'string' ? JSON.parse(v) : v; }
        catch { out[f.name] = v; }
      } else {
        out[f.name] = v === '' ? null : v;
      }
    }
    return out;
  }

  const saveMut = useMutation({
    mutationFn: (data: any) =>
      record
        ? dynamicApi.update(appId, entity, record.id, data)
        : dynamicApi.create(appId, entity, data),
    onSuccess: () => {
      toast.success(record ? 'Updated!' : 'Created!');
      onSuccess();
    },
    onError: (e: any) => {
      const detail = e?.response?.data;
      if (detail?.errors) {
        const errs: Record<string, string> = {};
        detail.errors.forEach((msg: string) => {
          const match = msg.match(/Field '(.+?)'/);
          if (match) errs[match[1]] = msg;
        });
        setErrors(errs);
      }
      toast.error(getErrorMessage(e));
    },
  });

  // ── FIX 3: Guard submit with validation + coercion ────────────────────────
  function handleSubmit() {
    if (!validate()) return;
    saveMut.mutate(coerceValues());
  }

  function handleChange(name: string, value: any) {
    setValues(v => ({ ...v, [name]: value }));
    setErrors(e => { const n = { ...e }; delete n[name]; return n; });
  }

  function renderField(field: any) {
    const { name, type, label, options } = field;
    const value = values[name];
    const err = errors[name];

    const inputClass = `input ${err ? 'border-red-400 focus:ring-red-400' : ''}`;

    switch (type) {
      case 'text':
        return (
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
            placeholder={label}
          />
        );
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-indigo-600"
              checked={Boolean(value)}
              onChange={e => handleChange(name, e.target.checked)}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
          </label>
        );
      case 'select':
        return (
          <select
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
          >
            {/* FIX 4: Removed broken unicode â€¦ → proper ellipsis */}
            <option value="">Select {label}…</option>
            {(options || []).map((o: string) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );
      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            className={inputClass}
            // FIX 5: Keep as string in state so the input is controlled;
            // coercion happens at submit time, not onChange
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
            placeholder={label}
            step={type === 'integer' ? 1 : 'any'}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
            placeholder={label}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
            // FIX 6: Removed broken unicode placeholder â€¦ → clean text
            placeholder="https://..."
          />
        );
      case 'json':
        return (
          <textarea
            className={`${inputClass} min-h-[100px] font-mono text-xs resize-y`}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? '')}
            onChange={e => handleChange(name, e.target.value)}
            placeholder="{}"
          />
        );
      default:
        return (
          <input
            type="text"
            className={inputClass}
            value={value ?? ''}
            onChange={e => handleChange(name, e.target.value)}
            placeholder={label}
          />
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {record ? 'Edit' : 'Add'} {entityConfig?.label || entity}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {fields.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No fields configured.</p>
          )}
          {fields.map((field: any) => (
            <div key={field.name}>
              {field.type !== 'boolean' && (
                <label className="label">
                  {field.label || field.name}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
              )}
              {renderField(field)}
              {errors[field.name] && (
                <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          {/* FIX 7: handleSubmit instead of direct mutate — runs validation first */}
          <button
            onClick={handleSubmit}
            disabled={saveMut.isPending}
            className="btn-primary"
          >
            {saveMut.isPending ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {record ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}