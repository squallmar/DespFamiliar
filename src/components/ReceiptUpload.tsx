'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, FileIcon, Image as ImageIcon, Trash2 } from 'lucide-react';

export interface ReceiptFile {
  id?: string;
  file: File | null;
  preview?: string;
  uploadedAt?: string;
  size?: number;
  type?: string;
}

interface ReceiptUploadProps {
  expenseId: string;
  onUpload?: (file: ReceiptFile) => Promise<void>;
  onDelete?: (receiptId: string) => Promise<void>;
  existingReceipts?: Array<{ id: string; name: string; url: string; uploadedAt: string }>;
  maxSize?: number; // MB
  acceptedTypes?: string[];
}

export default function ReceiptUpload({
  expenseId,
  onUpload,
  onDelete,
  existingReceipts = [],
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = e.target.files;

    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((file) => {
      // Validar tipo
      if (!acceptedTypes.includes(file.type)) {
        setError(`Tipo de arquivo não suportado: ${file.type}`);
        return;
      }

      // Validar tamanho
      if (file.size / (1024 * 1024) > maxSize) {
        setError(`Arquivo muito grande: máximo ${maxSize}MB`);
        return;
      }

      // Criar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        setFiles((prev) => [
          ...prev,
          {
            file,
            preview,
            size: file.size,
            type: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (file: ReceiptFile) => {
    if (!file.file || !onUpload) return;

    try {
      setUploading(true);
      await onUpload(file);
      setFiles((prev) => prev.filter((f) => f.file?.name !== file.file?.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (receiptId: string) => {
    if (!onDelete) return;

    try {
      setUploading(true);
      await onDelete(receiptId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar recibo');
    } finally {
      setUploading(false);
    }
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isPdf = (type: string) => type === 'application/pdf';

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
      >
        <Upload size={32} className="mx-auto text-indigo-600 mb-2" />
        <p className="font-semibold text-gray-800">Clique ou arraste recibos</p>
        <p className="text-sm text-gray-500">
          PNG, JPG, WebP ou PDF (até {maxSize}MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Files to Upload */}
      {files.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Arquivos para upload ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-shrink-0">
                  {file.preview && isImage(file.type || '') ? (
                    <img
                      src={file.preview}
                      alt="preview"
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <FileIcon size={24} className="text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.file?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size! / 1024).toFixed(2)} KB
                  </p>
                </div>

                <button
                  onClick={() =>
                    setFiles((prev) =>
                      prev.filter((f) => f.file?.name !== file.file?.name)
                    )
                  }
                  className="p-1 hover:bg-red-100 rounded transition"
                >
                  <X size={18} className="text-red-500" />
                </button>

                <button
                  onClick={() => handleUpload(file)}
                  disabled={uploading}
                  className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Receipts */}
      {existingReceipts.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Recibos Anexados ({existingReceipts.length})
          </p>
          <div className="space-y-2">
            {existingReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <ImageIcon size={24} className="text-green-600 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {receipt.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Enviado em {new Date(receipt.uploadedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <a
                  href={receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                >
                  Ver
                </a>

                {onDelete && (
                  <button
                    onClick={() => handleDelete(receipt.id)}
                    disabled={uploading}
                    className="p-1 hover:bg-red-100 rounded transition disabled:opacity-50"
                  >
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
