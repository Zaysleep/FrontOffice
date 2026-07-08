"use client";

import { useEffect, useState } from "react";
import type { StatItem } from "@/lib/sports/types";

type StatSheetResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   statSheet: StatItem[];
   cached: boolean;
};

export function useTeamStatSheet(teamId?: string) {
   const [statSheet, setStatSheet] = useState<StatItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [hasLoaded, setHasLoaded] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setStatSheet([]);
         setHasLoaded(false);
         setError(null);
         return;
      }

      const controller = new AbortController();
      const resolvedTeamId = teamId;

      async function loadStatSheet() {
         setIsLoading(true);
         setHasLoaded(false);
         setError(null);

         try {
            const response = await fetch(
               `/api/sports/stat-sheet?teamId=${encodeURIComponent(
                  resolvedTeamId,
               )}`,
               {
                  signal: controller.signal,
                  cache: "no-store",
               },
            );

            const payload = (await response.json()) as
               | StatSheetResponse
               | { error?: string };

            if (
               !response.ok ||
               !("statSheet" in payload)
            ) {
               throw new Error(
                  "error" in payload && payload.error
                     ? payload.error
                     : "Stat Sheet could not be loaded.",
               );
            }

            setStatSheet(payload.statSheet);
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
                  : "Stat Sheet could not be loaded.",
            );
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadStatSheet();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      statSheet,
      isLoading,
      hasLoaded,
      error,
   };
}
