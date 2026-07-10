export const RECEIPT_STATUSES = ["Open", "Looking Good", "On the Ropes", "Cold Take", "Called It", "Legendary"] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const RECEIPT_STATUS_COPY: Record<
   ReceiptStatus,
   {
      label: string;
      description: string;
   }
> = {
   Open: {
      label: "Open",
      description: "The call is live. The board is watching.",
   },
   "Looking Good": {
      label: "Looking Good",
      description: "Early returns look good. Keep the champagne on ice.",
   },
   "On the Ropes": {
      label: "On the Ropes",
      description: "Pressure is building. The call still has time to survive.",
   },
   "Cold Take": {
      label: "Cold Take",
      description: "The tape came back ugly. Own it and move on.",
   },
   "Called It": {
      label: "Called It",
      description: "The call hit. Put it on the record.",
   },
   Legendary: {
      label: "Legendary",
      description: "An all-timer. Frame the receipt and hang it in the office.",
   },
};

export function isReceiptStatus(value: string): value is ReceiptStatus {
   return RECEIPT_STATUSES.includes(value as ReceiptStatus);
}
