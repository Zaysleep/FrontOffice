import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSectionExpiry } from "@/lib/sports/refreshPolicy";
import type { BulletinData } from "@/lib/sports/types";
import { getRegisteredTeam } from "@/lib/sports/teamRegistry";
import { getBulletinAdapter, registerBulletinAdapter } from "@/lib/sports/adapters/registry";
import { allBulletinAdapters } from "@/lib/sports/adapters/espnBulletinAdapters";

type SportsCacheRow = {
   payload: BulletinData;
   expires_at: string;
};

allBulletinAdapters.forEach(registerBulletinAdapter);

export async function GET(request: Request) {
   try {
      const url = new URL(request.url);
      const teamRouteKey = url.searchParams.get("teamId") ?? "";
      const registeredTeam = getRegisteredTeam(teamRouteKey);

      if (!registeredTeam) {
         return NextResponse.json({ error: "Team bulletin is not available yet." }, { status: 404 });
      }

      const adapter = getBulletinAdapter(registeredTeam);

      if (!adapter) {
         return NextResponse.json(
            {
               error: `No bulletin adapter is registered for ${registeredTeam.sport}.`,
            },
            { status: 501 },
         );
      }

      const supabase = createServerSupabaseClient();

      const { data: matchingTeamRows, error: teamLookupError } = await supabase.from("teams").select("id, name, abbreviation, provider_key").ilike("name", registeredTeam.teamName).limit(1);

      if (teamLookupError) {
         console.error("FrontOffice could not read the team record from Supabase.", teamLookupError);

         return NextResponse.json(
            {
               error: teamLookupError.message ?? "The team record could not be read from Supabase.",
            },
            { status: 500 },
         );
      }

      let teamRow = matchingTeamRows?.[0] ?? null;

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
                  error: teamCreateError?.message ?? "The team record could not be created in Supabase.",
               },
               { status: 500 },
            );
         }

         teamRow = createdTeamRow;
      }

      const { data: cachedRow } = await supabase.from("sports_cache").select("payload, expires_at").eq("team_id", teamRow.id).eq("section", "bulletin").maybeSingle<SportsCacheRow>();

      if (cachedRow && new Date(cachedRow.expires_at).getTime() > Date.now()) {
         return NextResponse.json({
            teamId: registeredTeam.routeKey,
            teamName: teamRow.name,
            sport: registeredTeam.sport,
            league: registeredTeam.league,
            bulletin: cachedRow.payload,
            cached: true,
         });
      }

      const bulletin = await adapter.fetchBulletin(
         {
            ...registeredTeam,
            providerTeamKey: teamRow.provider_key ?? registeredTeam.providerTeamKey ?? teamRow.abbreviation ?? registeredTeam.abbreviation,
         },
         { now: new Date() },
      );

      const fetchedAt = new Date();
      const expiresAt = getSectionExpiry("bulletin", fetchedAt);

      const { error: cacheError } = await supabase.from("sports_cache").upsert(
         {
            team_id: teamRow.id,
            section: "bulletin",
            payload: bulletin,
            provider: adapter.providerName,
            fetched_at: fetchedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
         },
         { onConflict: "team_id,section" },
      );

      if (cacheError) {
         console.error("FrontOffice could not cache the team bulletin.", cacheError);
      }

      return NextResponse.json({
         teamId: registeredTeam.routeKey,
         teamName: teamRow.name,
         sport: registeredTeam.sport,
         league: registeredTeam.league,
         bulletin,
         cached: false,
      });
   } catch (error) {
      console.error("FrontOffice bulletin route failed.", error);

      return NextResponse.json(
         {
            error: error instanceof Error ? error.message : "The team bulletin could not be loaded.",
         },
         { status: 500 },
      );
   }
}
