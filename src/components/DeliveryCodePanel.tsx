import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { SecureImage } from "./SecureImage";
import { Order } from "../types";

// Customer view: while the rider is on the way, shows the 4-digit code to
// give the rider at the door. After delivery, shows the rider's drop-off
// photo as proof.
export const DeliveryCodePanel: React.FC<{ order: Order }> = ({ order }) => {
  const { getDeliveryCode } = useDatabase();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOnTheWay = order.status === "out_for_delivery" && order.orderType !== "receipt_pickup";

  useEffect(() => {
    let cancelled = false;
    if (!isOnTheWay) { setCode(null); return; }
    setLoading(true);
    getDeliveryCode(order.id).then((c) => { if (!cancelled) { setCode(c); setLoading(false); } });
    return () => { cancelled = true; };
  }, [order.id, isOnTheWay]);

  if (isOnTheWay) {
    return (
      <div className="rounded-2xl border-2 border-[#070329] bg-[#070329]/[0.03] p-4 flex items-center gap-4">
        <KeyRound className="w-8 h-8 text-[#070329] shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Your delivery code</p>
          <p className="text-3xl font-black tracking-[0.4em] text-[#070329] font-mono">
            {loading ? "····" : code || "----"}
          </p>
          <p className="text-[11px] text-gray-600 mt-1">
            Give this code to the rider <b>only after</b> you receive your food. Never share it on the phone.
          </p>
        </div>
      </div>
    );
  }

  if (order.status === "delivered" && (order.deliveryProofUrl || order.deliveryConfirmedBy === "code")) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 space-y-2 text-xs">
        <p className="font-bold text-green-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Delivered{order.deliveredAt ? ` at ${new Date(order.deliveredAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""}
          {order.deliveryConfirmedBy === "code" ? " · confirmed with your code" : ""}
        </p>
        {order.deliveryProofUrl && (
          <SecureImage src={order.deliveryProofUrl} alt="Delivery photo" className="w-full max-w-xs h-40 object-cover rounded-xl border border-green-100" />
        )}
      </div>
    );
  }

  return null;
};
