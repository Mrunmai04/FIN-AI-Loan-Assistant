import React, { useState } from 'react';
import { AppState } from '../types';
import { formatCurrency } from '../utils/banking';
import { ShieldCheck, Printer, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  state: AppState;
  onClose: () => void;
}

export const SanctionLetter: React.FC<Props> = ({ state, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const offer = state.selectedOffer!;
  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const refId = `SL-${Math.floor(Math.random() * 10000000)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById('sanction-letter');
    if (!element) return;

    setIsGenerating(true);

    try {
      // Clone the element to render it fully without scrollbars or height restrictions
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Set styles to ensure the capture includes everything
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      // Set width to approx A4 width at 96DPI (794px) to ensure consistent layout
      clone.style.width = '794px'; 
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      
      // Append to body so html2canvas can access it
      document.body.appendChild(clone);

      // Use html2canvas to capture the expanded clone
      const canvas = await html2canvas(clone, {
        scale: 2, // Higher scale for sharp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794
      });

      // Remove the clone after capture
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      
      // Initialize jsPDF (A4 Portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit PDF width
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content exceeds one page
      while (heightLeft > 0) {
        position -= pdfHeight; // Shift the image up for the next page
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      // Save PDF
      const fileName = `Sanction-Letter-${(state.userName || 'FinAI').replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to download PDF. Please try the "Print" option -> "Save as PDF".');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white max-w-3xl w-full rounded-xl shadow-2xl overflow-hidden animate-fade-in relative flex flex-col max-h-[90vh]">
        
        {/* Header - Screen Only */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-400" />
            <div>
              <h2 className="font-semibold text-sm md:text-base">Provisional Sanction Letter Generated</h2>
              <p className="text-xs text-slate-400">Ready for download</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait px-4 py-2 rounded-md text-sm transition-colors font-medium shadow-lg shadow-blue-900/20"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
              {isGenerating ? "Generating..." : "Download Signed PDF"}
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-md text-sm transition-colors font-medium"
            >
              <Printer size={16} /> Print
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Letter Content - Printable */}
        <div className="p-12 overflow-y-auto print:p-0 print:w-full print:overflow-visible bg-white text-slate-900 font-serif" id="sanction-letter">
          
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none print:opacity-[0.05]">
             <div className="text-9xl font-bold -rotate-45">FinAI BANK</div>
          </div>

          {/* Letter Head */}
          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">FinAI Bank</h1>
              <p className="text-slate-600 font-sans text-sm font-medium">Digital Lending Division</p>
              <p className="text-slate-500 font-sans text-xs">Tech Park, Cyber City, Bangalore - 560001</p>
              <p className="text-slate-500 font-sans text-xs">CIN: U12345KA2024PTC123456</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">Ref No: {refId}</p>
              <p className="text-sm text-slate-600 font-sans">Date: {today}</p>
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-8 font-sans">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">To</h3>
            <p className="text-lg font-bold text-slate-900">{state.userName || "Valued Customer"}</p>
            <p className="text-slate-700">Mobile: {state.mobile}</p>
            <p className="text-slate-700">PAN: {state.kyc.pan}</p>
            {state.creditScoreCategory && (
              <p className="text-slate-700">Credit Score (Declared): {state.creditScoreCategory}</p>
            )}
          </div>

          {/* Subject */}
          <div className="mb-6 bg-slate-50 p-2 rounded print:bg-transparent print:p-0">
            <p className="font-bold text-slate-900 underline decoration-slate-400 underline-offset-4">
              Subject: Provisional Sanction of {offer.type} facility
            </p>
          </div>

          {/* Body */}
          <div className="mb-8 text-slate-800 leading-relaxed space-y-4 text-justify">
            <p>
              Dear <strong>{state.userName || "Customer"}</strong>,
            </p>
            <p>
              We are pleased to inform you that based on your application and successful digital credit assessment, 
              FinAI Bank has provisionally sanctioned a <strong>{offer.type}</strong> facility under the terms mentioned below.
              This offer is based on your credit score and the income details provided during the digital journey.
            </p>

            <div className="border-2 border-slate-800 rounded-lg p-0 overflow-hidden my-6">
              <div className="bg-slate-900 text-white p-2 text-center font-bold text-sm uppercase tracking-wider print:bg-black print:text-white">
                Facility Details
              </div>
              <div className="grid grid-cols-2">
                <div className="p-4 border-b border-r border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sanctioned Amount</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(offer.amount)}</p>
                </div>
                <div className="p-4 border-b border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Interest Rate (ROI)</p>
                  <p className="text-xl font-bold text-slate-900">{offer.interestRate}% <span className="text-xs font-normal text-slate-500">p.a. (Fixed)</span></p>
                </div>
                <div className="p-4 border-r border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tenure</p>
                  <p className="text-lg font-semibold text-slate-800">{offer.tenureMonths} Months</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly EMI</p>
                  <p className="text-lg font-semibold text-slate-800">{formatCurrency(offer.emi)}</p>
                </div>
              </div>
            </div>

            <p className="text-sm">
              Your Eligibility Score was calculated as <strong>{state.eligibilityScore}/900</strong>.
              This sanction is valid for 30 days from the date of issuance.
              Final disbursement is subject to property/collateral verification (if applicable) and execution of the final loan agreement.
            </p>
          </div>

          {/* Terms */}
          <div className="mb-12">
             <h4 className="font-bold text-sm mb-2 text-slate-900">Key Terms & Conditions:</h4>
             <ul className="list-disc list-outside ml-5 text-xs text-slate-600 space-y-1">
               <li>The bank reserves the right to withdraw this sanction in case of any material change in the applicant's financial status.</li>
               <li>Processing fees of {formatCurrency(offer.processingFee)} + GST will be deducted at disbursement.</li>
               <li>This document is electronically generated and is valid for digital processing.</li>
             </ul>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex justify-between items-end">
              <div>
                <img src="https://via.placeholder.com/150x50/000000/FFFFFF?text=SIGNATURE" alt="" className="h-10 opacity-50 mb-2" />
                <p className="font-bold text-slate-900">Authorized Signatory</p>
                <p className="text-xs text-slate-500">Digital Credit Operations</p>
                <p className="text-xs text-slate-500">FinAI Bank Ltd.</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-green-600 text-green-700 font-bold px-4 py-2 rounded rotate-[-5deg] opacity-80 shadow-sm print:shadow-none">
                  DIGITALLY APPROVED
                </div>
                <p className="text-[10px] text-slate-400 mt-2">{refId} | {state.mobile}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #sanction-letter, #sanction-letter * {
            visibility: visible;
          }
          #sanction-letter {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 40px;
            background: white;
            color: black;
          }
        }
      `}</style>
    </div>
  );
};