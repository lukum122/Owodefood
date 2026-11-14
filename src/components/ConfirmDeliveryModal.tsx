import React, { useRef, useState } from "react";
import { Camera, CheckCircle2, KeyRound, Loader2, X, AlertTriangle } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { compressImageToDataUrl } from "../imageUtils";

interface Props {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  onClose: () => void;
}

// Rider's "complete delivery" step: the customer's 4-digit code (shown only
// in the customer's app) plus a photo of the food at the drop-off point.
export const ConfirmDeliveryModal: React.FC<Props> = ({ orderId, customerName, customerPhone, onClose }) => {
  const { confirmDeliveryWithCode } = useDatabase();
  const [code, setCode] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      setPhoto(await compressImageToDataUrl(file, 1024, 0.65));
    } catch (err: any) {
      setError(err?.message || "Couldn't read that photo. Please take it again.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (code.length !== 4) return setError("Enter the 4-digit code from the customer.");
    if (!photo) return setError("Take a photo of the delivered order first.");
    setBusy(true);
    setError(null);
    const result = await confirmDeliveryWithCode(orderId, code, photo);
    setBusy(false);
    if (result.success) {
      setDone(true);
      setTimeout(onClose, 1500);
    } else {
      setError(result.error || "Couldn't confirm the delivery.");
      if (result.locked) setLocked(true);
      setCode("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-950">Complete delivery</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-bold text-gray-900">Delivery confirmed!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-gray-400" />
                Delivery code from {customerName}
              </label>
              <p className="text-[11px] text-gray-500">
                Ask the customer for the 4-digit code in their OwodeFood app. Only hand over the food when they give it.
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={code}
                disabled={locked || busy}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="• • • •"
                className="w-full text-center text-3xl font-black tracking-[0.6em] p-4 border-2 border-gray-200 rounded-2xl outline-none focus:border-[#070329] disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-gray-400" />
                Photo at drop-off
              </label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Delivery proof" className="w-full h-48 object-cover rounded-2xl border border-gray-100" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white/90 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy || locked}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-500 text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {photoBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  {photoBusy ? "Processing..." : "Tap to take photo (food with customer / at the gate)"}
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-50 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {locked && (
              <p className="text-[11px] text-gray-600 bg-gray-50 p-3 rounded-xl">
                Don't leave the food without confirmation. Call admin/support so they can verify with the customer
                {customerPhone ? <> (customer: <a href={`tel:${customerPhone}`} className="font-bold underline">{customerPhone}</a>)</> : null}.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={busy || locked || code.length !== 4 || !photo}
              className="w-full py-3.5 bg-[#070329] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {busy ? "Checking..." : "Confirm delivery"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
