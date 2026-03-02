'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export interface ImportResult {
  fileName: string;
  format: 'csv' | 'ofx' | 'qif';
  transactionsCount: number;
  categorizedCount: number;
  pendingCount: number;
  errors?: string[];
  warnings?: string[];
}

interface BankImportProps {
  onImport?: (result: ImportResult) => void;
  onClose?: () => void;
  language: string;
}

const SUPPORTED_FORMATS = [
  { ext: '.csv', format: 'CSV', description: 'Arquivo de valores separados por vírgula' },
  { ext: '.ofx', format: 'OFX', description: 'Open Financial Exchange (Banco)' },
  { ext: '.qif', format: 'QIF', description: 'Quicken Interchange Format' },
];

export default function BankImportModal({ onImport, onClose, language }: BankImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsingResult, setParsingResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    setParsingResult(null);
    setPreview([]);

    // Validate file type
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isValid = SUPPORTED_FORMATS.some((f) => f.ext === ext);

    if (!isValid) {
      setError(`Formato não suportado. Use: ${SUPPORTED_FORMATS.map((f) => f.ext).join(', ')}`);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB max
      setError('Arquivo muito grande (máximo 50MB)');
      return;
    }

    setSelectedFile(file);
  };

  const parseFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      const format = fileExt === '.csv' ? 'csv' : fileExt === '.ofx' ? 'ofx' : 'qif';

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('format', format);

      const res = await fetch('/api/import/parse', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Falha ao processar arquivo');
      }

      const result: ImportResult & { preview: any[] } = await res.json();
      setParsingResult({
        fileName: selectedFile.name,
        format,
        transactionsCount: result.transactionsCount,
        categorizedCount: result.categorizedCount,
        pendingCount: result.pendingCount,
        errors: result.errors,
        warnings: result.warnings,
      });
      setPreview(result.preview || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!parsingResult || !selectedFile) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('format', parsingResult.format);

      const res = await fetch('/api/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha ao importar');

      const result = await res.json();
      onImport?.(parsingResult);
      // Reset
      setSelectedFile(null);
      setParsingResult(null);
      setPreview([]);
      onClose?.();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <>
          {/* Format Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {SUPPORTED_FORMATS.map((fmt) => (
              <div key={fmt.ext} className="rounded-lg border border-gray-300 p-3 text-center">
                <FileText className="mx-auto text-indigo-600 mb-1" size={24} />
                <p className="font-semibold text-gray-900">{fmt.format}</p>
                <p className="text-xs text-gray-600">{fmt.description}</p>
              </div>
            ))}
          </div>

          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
          >
            <Upload className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="font-semibold text-gray-900">Arraste o arquivo ou clique para selecionar</p>
            <p className="text-sm text-gray-600">Máximo 50MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.ofx,.qif"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : !parsingResult ? (
        <>
          {/* Selected File */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" size={24} />
              <div>
                <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setError(null);
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Trocar
            </button>
          </div>

          {/* Parse Button */}
          <button
            onClick={parseFile}
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader size={20} className="animate-spin" />}
            {isLoading ? 'Processando...' : 'Analisar Arquivo'}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Results */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <p className="font-semibold text-green-900">Análise Concluída!</p>
                <p className="text-sm text-green-700">
                  {parsingResult.transactionsCount} transações encontradas
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{parsingResult.transactionsCount}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-2">
                <p className="text-xs text-green-600">Categorizadas</p>
                <p className="text-lg font-bold text-green-900">{parsingResult.categorizedCount}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-2">
                <p className="text-xs text-yellow-600">Pendentes</p>
                <p className="text-lg font-bold text-yellow-900">{parsingResult.pendingCount}</p>
              </div>
            </div>

            {/* Warnings */}
            {parsingResult.warnings && parsingResult.warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-900 mb-1">Avisos:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {parsingResult.warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900 mb-2">Primeiras Transações:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {preview.slice(0, 5).map((tx, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">{tx.description}</span>
                        <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {tx.amount > 0 ? '+' : ''} {tx.amount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date).toLocaleDateString(language)} •{' '}
                        <span className="bg-indigo-100 text-indigo-700 px-1 rounded">
                          {tx.category || 'Sem categoria'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setParsingResult(null);
                  setPreview([]);
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={confirmImport}
                disabled={isLoading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader size={20} className="animate-spin" />}
                {isLoading ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
