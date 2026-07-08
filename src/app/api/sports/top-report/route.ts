import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSectionExpiry } from "@/lib/sports/refreshPolicy";
import type { TopReportItem } from "@/lib/sports/types";
import { getRegisteredTeam } from "@/lib/sports/teamRegistry";
import { getTopReportAdapter, registerTopReportAdapter } from "@/lib/sports/adapters/topReportRegistry";
import { allTopReportAdapters } from "@/lib/sports/adapters/espnTopReportAdapters";

type SportsCacheRow = {
   payload: TopReportItem[];
   expires_at: string;
};

allTopReportAdapters.forEach(registerTopReportAdapter);

export async function GET(request: Request) {
   try {
      const url = new URL(request.url);
      const teamIdentifier = url.searchParams.get("teamId") ?? "";
      const registeredTeam = getRegisteredTeam(teamIdentifier);

      if (!registeredTeam) {
         return NextResponse.json({ error: "Top Report is not available for this team yet." }, { status: 404 });
      }

      const adapter = getTopReportAdapter(registeredTeam);

      if (!adapter) {
         return NextResponse.json(
            {
               error: `No Top Report adapter is registered for ${registeredTeam.sport}.`,
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

      const { data: cachedRow } = await supabase.from("sports_cache").select("payload, expires_at").eq("team_id", teamRow.id).eq("section", "top_report").maybeSingle<SportsCacheRow>();

      if (cachedRow && new Date(cachedRow.expires_at).getTime() > Date.now()) {
         return NextResponse.json({
            teamId: registeredTeam.routeKey,
            teamName: teamRow.name,
            sport: registeredTeam.sport,
            league: registeredTeam.league,
            topReport: cachedRow.payload,
            cached: true,
         });
      }

      const topReport = await adapter.fetchTopReport(
         {
            ...registeredTeam,
            providerTeamKey: teamRow.provider_key ?? registeredTeam.providerTeamKey ?? teamRow.abbreviation ?? registeredTeam.abbreviation,
         },
         {
            now: new Date(),
         },
      );

      const fetchedAt = new Date();
      const expiresAt = getSectionExpiry("top_report", fetchedAt);

      const { error: cacheError } = await supabase.from("sports_cache").upsert(
         {
            team_id: teamRow.id,
            section: "top_report",
            payload: topReport,
            provider: adapter.providerName,
            fetched_at: fetchedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
         },
         {
            onConflict: "team_id,section",
         },
      );

      if (cacheError) {
         console.error("FrontOffice could not cache Top Report.", cacheError);
      }

      return NextResponse.json({
         teamId: registeredTeam.routeKey,
         teamName: teamRow.name,
         sport: registeredTeam.sport,
         league: registeredTeam.league,
         topReport,
         cached: false,
      });
   } catch (error) {
      console.error("FrontOffice Top Report route failed.", error);

      return NextResponse.json(
         {
            error: error instanceof Error ? error.message : "Top Report could not be loaded.",
         },
         { status: 500 },
      );
   }
}
