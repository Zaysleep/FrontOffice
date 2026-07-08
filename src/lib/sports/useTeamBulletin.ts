"use client";

import { useEffect, useState } from "react";
import type { BulletinData } from "@/lib/sports/types";

type BulletinResponse = {
   teamId: string;
   teamName: string;
   sport?: string;
   league?: string;
   bulletin: BulletinData;
   cached: boolean;
};

export function useTeamBulletin(teamId?: string) {
   const [bulletin, setBulletin] = useState<BulletinData | null>(null);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!teamId) {
         setBulletin(null);
         setError(null);
         return;
      }

      const controller = new AbortController();

      const resolvedTeamId = teamId;

      async function loadBulletin() {
         setIsLoading(true);
         setError(null);

         try {
            const response = await fetch(`/api/sports/bulletin?teamId=${encodeURIComponent(resolvedTeamId)}`, {
               signal: controller.signal,
               cache: "no-store",
            });

            const payload = (await response.json()) as BulletinResponse | { error?: string };

            if (!response.ok || !("bulletin" in payload)) {
               throw new Error("error" in payload && payload.error ? payload.error : "The team bulletin could not be loaded.");
            }

            setBulletin(payload.bulletin);
         } catch (loadError) {
            if (loadError instanceof DOMException && loadError.name === "AbortError") {
               return;
            }

            setError(loadError instanceof Error ? loadError.message : "The team bulletin could not be loaded.");
         } finally {
            if (!controller.signal.aborted) {
               setIsLoading(false);
            }
         }
      }

      void loadBulletin();

      return () => {
         controller.abort();
      };
   }, [teamId]);

   return {
      bulletin,
      isLoading,
      error,
   };
}
