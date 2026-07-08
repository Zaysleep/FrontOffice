import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSectionExpiry } from "@/lib/sports/refreshPolicy";
import type { StatItem } from "@/lib/sports/types";
import { getRegisteredTeam } from "@/lib/sports/teamRegistry";
import { getStatSheetAdapter, registerStatSheetAdapter } from "@/lib/sports/adapters/statSheetRegistry";
import { allStatSheetAdapters } from "@/lib/sports/adapters/espnStatSheetAdapters";

type SportsCacheRow = {
   payload: StatItem[];
   expires_at: string;
};

allStatSheetAdapters.forEach(registerStatSheetAdapter);

export async function GET(request: Request) {
   try {
      const url = new URL(request.url);
      const teamIdentifier = url.searchParams.get("teamId") ?? "";
      const registeredTeam = getRegisteredTeam(teamIdentifier);

      if (!registeredTeam) {
         return NextResponse.json({ error: "Stat Sheet is not available for this team yet." }, { status: 404 });
      }

      const adapter = getStatSheetAdapter(registeredTeam);

      if (!adapter) {
         return NextResponse.json(
            {
               error: `No Stat Sheet adapter is registered for ${registeredTeam.sport}.`,
            },
            { status: 501 },
         );
      }

      const supabase = createServerSupabaseClient();

      const { data: teamRows, error: teamLookupError } = await supabase.from("teams").select("id, name, abbreviation, provider_key").ilike("name", registeredTeam.teamName).limit(1);

      if (teamLookupError) {
         return NextResponse.json({ error: teamLookupError.message }, { status: 500 });
      }

      let teamRow = teamRows?.[0] ?? null;

      if (!teamRow) {
         const { data: createdTeamRow, error: teamCreateError } = await supabase
            .from("teams")
            .insert({
               name: registeredTeam.teamName,
               sport: registeredTeam.sport,
               league: registeredTeam.league,
               abbreviation: registeredTeam.abbreviation ?? null,
               provider_key: registeredTeam.providerTeamKey ?? null,
            })
            .select("id, name, abbreviation, provider_key")
            .single();

         if (teamCreateError || !createdTeamRow) {
            return NextResponse.json(
               {
                  error: teamCreateError?.message ?? "The team record could not be created.",
               },
               { status: 500 },
            );
         }

         teamRow = createdTeamRow;
      }

      const { data: cachedRow } = await supabase.from("sports_cache").select("payload, expires_at").eq("team_id", teamRow.id).eq("section", "stat_sheet").maybeSingle<SportsCacheRow>();

      if (cachedRow && new Date(cachedRow.expires_at).getTime() > Date.now()) {
         return NextResponse.json({
            teamId: registeredTeam.routeKey,
            teamName: teamRow.name,
            sport: registeredTeam.sport,
            league: registeredTeam.league,
            statSheet: cachedRow.payload,
            cached: true,
         });
      }

      const statSheet = await adapter.fetchStatSheet(
         {
            ...registeredTeam,
            providerTeamKey: teamRow.provider_key ?? registeredTeam.providerTeamKey ?? teamRow.abbreviation ?? registeredTeam.abbreviation,
         },
         {
            now: new Date(),
         },
      );

      const fetchedAt = new Date();
      const expiresAt = getSectionExpiry("stat_sheet", fetchedAt);

      const { error: cacheError } = await supabase.from("sports_cache").upsert(
         {
            team_id: teamRow.id,
            section: "stat_sheet",
            payload: statSheet,
            provider: adapter.providerName,
            fetched_at: fetchedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
         },
         {
            onConflict: "team_id,section",
         },
      );

      if (cacheError) {
         console.error("FrontOffice could not cache Stat Sheet.", cacheError);
      }

      return NextResponse.json({
         teamId: registeredTeam.routeKey,
         teamName: teamRow.name,
         sport: registeredTeam.sport,
         league: registeredTeam.league,
         statSheet,
         cached: false,
      });
   } catch (error) {
      console.error("FrontOffice Stat Sheet route failed.", error);

      return NextResponse.json(
         {
            error: error instanceof Error ? error.message : "Stat Sheet could not be loaded.",
         },
         { status: 500 },
      );
   }
}
