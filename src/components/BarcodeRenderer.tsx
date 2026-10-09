'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export default function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 2,
  height = 90,
  displayValue = true,
  fontSize = 14,
  className = '',
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format,
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          textMargin: 6,
          margin: 10,
          background: '#ffffff',
          lineColor: '#111827',
        });
      } catch (err) {
        // Fallback for invalid characters in format
        try {
          JsBarcode(svgRef.current, String(value).replace(/[^A-Za-z0-9]/g, ''), {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
            margin: 10,
          });
        } catch {
          // ignore
        }
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
        Walang barcode value na itinalaga.
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
}
