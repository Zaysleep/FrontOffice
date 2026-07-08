"use client";

import { useEffect, useState } from "react";
import type { TopReportItem } from "@/lib/sports/types";

type TopReportResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   topReport: TopReportItem[];
   cached: boolean;
};

export function useTeamTopReport(teamId?: string) {
   const [topReport, setTopReport] = useState<TopReportItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setTopReport([]);
         setError(null);
         return;
      }

      const controller = new AbortController();
      const resolvedTeamId = teamId;

      async function loadTopReport() {
         setIsLoading(true);
         setError(null);

         try {
            const response = await fetch(
               `/api/sports/top-report?teamId=${encodeURIComponent(
                  resolvedTeamId,
               )}`,
               {
                  signal: controller.signal,
                  cache: "no-store",
               },
            );

            const payload = (await response.json()) as
               | TopReportResponse
               | { error?: string };

            if (!response.ok || !("topReport" in payload)) {
               throw new Error(
                  "error" in payload && payload.error
                     ? payload.error
                     : "Top Report could not be loaded.",
               );
            }

            setTopReport(payload.topReport);
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
                  : "Top Report could not be loaded.",
            );
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadTopReport();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      topReport,
      isLoading,
      error,
   };
}
