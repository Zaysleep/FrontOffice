"use client";

import { useEffect, useState } from "react";
import type { RumorMillItem } from "@/lib/sports/rumorMill";

type RumorMillResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   rumorMill: RumorMillItem[];
   cached: boolean;
};

export function useTeamRumorMill(teamId?: string) {
   const [rumorMill, setRumorMill] = useState<RumorMillItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [hasLoaded, setHasLoaded] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setRumorMill([]);
         setHasLoaded(false);
         setError(null);
         return;
      }

      const controller = new AbortController();
      const resolvedTeamId = teamId;

      async function loadRumorMill() {
         setIsLoading(true);
         setHasLoaded(false);
         setError(null);

         try {
            const response = await fetch(
               `/api/sports/rumor-mill?teamId=${encodeURIComponent(
                  resolvedTeamId,
               )}`,
               {
                  signal: controller.signal,
                  cache: "no-store",
               },
            );

            const payload = (await response.json()) as
               | RumorMillResponse
               | { error?: string };

            if (
               !response.ok ||
               !("rumorMill" in payload)
            ) {
               throw new Error(
                  "error" in payload && payload.error
                     ? payload.error
                     : "Rumor Mill could not be loaded.",
               );
            }

            setRumorMill(payload.rumorMill);
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
                  : "Rumor Mill could not be loaded.",
            );
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadRumorMill();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      rumorMill,
      isLoading,
      hasLoaded,
      error,
   };
}
