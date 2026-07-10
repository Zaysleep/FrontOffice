"use client";

import {
   RECEIPT_STATUSES,
   RECEIPT_STATUS_COPY,
   type ReceiptStatus,
} from "@/lib/receipts/receiptStatuses";

type ReceiptStatusSelectProps = {
   value: ReceiptStatus;
   onChange: (
      nextStatus: ReceiptStatus,
   ) => void | Promise<void>;
   disabled?: boolean;
};

export default function ReceiptStatusSelect({
   value,
   onChange,
   disabled = false,
}: ReceiptStatusSelectProps) {
   return (
      <label className="block max-w-60">
         <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5B6475]">
            Receipt Status
         </span>

         <select
            value={value}
            disabled={disabled}
            onChange={(event) => {
               void onChange(
                  event.target.value as ReceiptStatus,
               );
            }}
            className="mt-2 min-h-11 w-full border border-[#111827] bg-white px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10 disabled:cursor-not-allowed disabled:opacity-60"
         >
            {RECEIPT_STATUSES.map((status) => (
               <option
                  key={status}
                  value={status}
               >
                  {status}
               </option>
            ))}
         </select>

         <p className="mt-2 text-xs leading-5 text-[#5B6475]">
            {
               RECEIPT_STATUS_COPY[value]
                  .description
            }
         </p>
      </label>
   );
}
