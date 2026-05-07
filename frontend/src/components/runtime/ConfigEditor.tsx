'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Save, AlertCircle, CheckCircle, Loader, RotateCcw } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <div className="h-full bg-gray-900 flex items-center justify-center text-gray-500 text-sm">Loading editor…</div> });

interface Props {
  value: any;
  onChange: (val: any) => void;
  onSave: () => void;
  saving?: boolean;
}

export function ConfigEditor({ value, onChange, onSave, saving }: Props) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function handleChange(val: string | undefined) {
    setRaw(val || '');
    setError('');
    setSaved(false);
    try {
      const parsed = JSON.parse(val || '{}');
      onChange(parsed);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSave() {
    if (error) return;
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">config.json</span>
          {error && (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <AlertCircle size={12} /> {error.slice(0, 50)}
            </div>
          )}
          {saved && <div className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} /> Saved</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setRaw(JSON.stringify(value, null, 2)); setError(''); }} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={handleSave} disabled={!!error || saving} className="btn-primary text-xs py-1 px-3">
            {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="json"
          theme="vs-dark"
          value={raw}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            formatOnPaste: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
