"use client";

import { useEffect, useState } from "react";
import type { LedgerItem } from "@/lib/sports/ledger";

type LedgerResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   ledger: LedgerItem[];
   cached: boolean;
};

export function useTeamLedger(teamId?: string) {
   const [ledger, setLedger] = useState<LedgerItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [hasLoaded, setHasLoaded] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setLedger([]);
         setHasLoaded(false);
         setError(null);
         return;
      }

      const controller = new AbortController();
      const resolvedTeamId = teamId;

      async function loadLedger() {
         setIsLoading(true);
         setHasLoaded(false);
         setError(null);

         try {
            const response = await fetch(
               `/api/sports/ledger?teamId=${encodeURIComponent(
                  resolvedTeamId,
               )}`,
               {
                  signal: controller.signal,
                  cache: "no-store",
               },
            );

            const payload = (await response.json()) as
               | LedgerResponse
               | { error?: string };

            if (
               !response.ok ||
               !("ledger" in payload)
            ) {
               throw new Error(
                  "error" in payload && payload.error
                     ? payload.error
                     : "Ledger could not be loaded.",
               );
            }

            setLedger(payload.ledger);
            setHasLoaded(true);
         } catch (loadError) {
            if (
               loadError instanceof DOMException &&
               loadError.name === "AbortError"
            ) {
               return;
            }

            setError(
               loadError instanceof Error
                  ? loadError.message
                  : "Ledger could not be loaded.",
            );
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadLedger();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      ledger,
      isLoading,
      hasLoaded,
      error,
   };
}
