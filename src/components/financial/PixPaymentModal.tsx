import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { PaymentRecord } from '../../types';
import { QrCode, Copy, CheckCircle2, X, Sparkles, ShieldCheck } from 'lucide-react';

interface PixPaymentModalProps {
  payment: PaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  const { markPaymentAsPaid, academyConfig } = useData();
  const [copied, setCopied] = useState(false);
  const [successPaid, setSuccessPaid] = useState(false);

  if (!isOpen || !payment) return null;

  const pixCode = payment.pixCode || `00020126580014BR.GOV.BCB.PIX0114${academyConfig.pixKey || '12345678000190'}5204000053039865405${payment.amount.toFixed(2)}5802BR5915${academyConfig.name.replace(/\s+/g, '')}6009SAOPAULO62070503***6304`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmPix = () => {
    markPaymentAsPaid(payment.id, 'PIX');
    setSuccessPaid(true);
    setTimeout(() => {
      setSuccessPaid(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">Pagamento com PIX</h3>
            <p className="text-xs text-slate-400">
              Mensalidade de {payment.referenceMonth} - {payment.studentName}
            </p>
          </div>
        </div>

        {successPaid ? (
          <div className="p-8 text-center space-y-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/40">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-lg text-emerald-200">Pagamento Confirmado!</h4>
            <p className="text-xs text-slate-300">
              Sua mensalidade foi quitada com sucesso. Comprovante gerado no sistema. Oss!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount Box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Valor Total da Mensalidade:</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                R$ {payment.amount.toFixed(2)}
              </p>
            </div>

            {/* QR Code Canvas Representation */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col items-center justify-center">
              <div className="w-40 h-40 bg-slate-900 rounded-xl p-2 flex items-center justify-center text-white relative shadow-inner">
                <div className="grid grid-cols-7 gap-1 w-full h-full">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-2xs ${
                        (i % 2 === 0 || i % 5 === 0 || i === 0 || i === 6 || i === 42 || i === 48)
                          ? 'bg-emerald-400'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center font-black text-xs text-emerald-400">
                    PIX
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-800 mt-2">
                Escaneie com o app do seu banco
              </span>
            </div>

            {/* Copy PIX Key */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">
                Copia e Cola PIX:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixCode}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-300 truncate outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Simulated Payment Confirmation Button */}
            <button
              onClick={handleConfirmPix}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simular Baixa Automática do Pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
