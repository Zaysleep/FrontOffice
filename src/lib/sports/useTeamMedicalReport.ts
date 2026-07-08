"use client";

import { useEffect, useState } from "react";
import type { AvailabilityItem } from "@/lib/sports/types";

type MedicalReportResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   medicalReport: AvailabilityItem[];
   cached: boolean;
};

export function useTeamMedicalReport(teamId?: string) {
   const [medicalReport, setMedicalReport] = useState<AvailabilityItem[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [hasLoaded, setHasLoaded] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setMedicalReport([]);
         setHasLoaded(false);
         setError(null);
         return;
      }

      const controller = new AbortController();
      const resolvedTeamId = teamId;

      async function loadMedicalReport() {
         setIsLoading(true);
         setHasLoaded(false);
         setError(null);

         try {
            const response = await fetch(`/api/sports/medical-report?teamId=${encodeURIComponent(resolvedTeamId)}`, {
               signal: controller.signal,
               cache: "no-store",
            });

            const payload = (await response.json()) as MedicalReportResponse | { error?: string };

            if (!response.ok || !("medicalReport" in payload)) {
               throw new Error("error" in payload && payload.error ? payload.error : "Medical Report could not be loaded.");
            }

            setMedicalReport(payload.medicalReport);
            setHasLoaded(true);
         } catch (loadError) {
            if (loadError instanceof DOMException && loadError.name === "AbortError") {
               return;
            }

            setError(loadError instanceof Error ? loadError.message : "Medical Report could not be loaded.");
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadMedicalReport();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      medicalReport,
      isLoading,
      hasLoaded,
      error,
   };
}
