import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  url?: string | null;
  title?: string;
  className?: string;
}

/**
 * Componente para visualizar PDFs
 *
 * Usa <iframe> para exibir o PDF inline ou fornece
 * link para abrir em nova aba
 */
export function PDFViewer({ url, title = 'Documento', className = '' }: PDFViewerProps) {
  if (!url) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum documento disponível</p>
      </div>
    );
  }

  // Construir URL completa se for relativa
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Abrir em nova aba
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* PDF Viewer */}
      <div className="relative" style={{ height: '600px' }}>
        <iframe
          src={fullUrl}
          className="w-full h-full"
          title={title}
          style={{ border: 'none' }}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500 text-center">
        Se o PDF não carregar, clique em "Abrir em nova aba"
      </div>
    </div>
  );
}
