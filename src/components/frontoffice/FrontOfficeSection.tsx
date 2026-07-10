import { type Receipt, type TeamBrief, type TeamUpdate } from "@/data/frontofficeData";
import { buildFallbackHeadline, buildNewspaperData, getDateline, getLeadUpdate, type BulletinItem } from "@/lib/frontofficeUpdates";
import { useTeamBulletin } from "@/lib/sports/useTeamBulletin";
import { useTeamTopReport } from "@/lib/sports/useTeamTopReport";
import { useTeamMedicalReport } from "@/lib/sports/useTeamMedicalReport";
import { useTeamStatSheet } from "@/lib/sports/useTeamStatSheet";
import { useTeamRumorMill } from "@/lib/sports/useTeamRumorMill";
import { useTeamLedger } from "@/lib/sports/useTeamLedger";
import { getRouteKeyByTeamName } from "@/lib/sports/teamRegistry";
import { buildQuestionBeforeOffice } from "@/lib/frontOfficeDecisionQuestion";
import MatchupStrip from "@/components/frontoffice/MatchupStrip";
import ResurfacedReceiptCard, { selectReceiptForResurfacing, type ReceiptWithRevisit } from "@/components/frontoffice/ResurfacedReceiptCard";

/**
 * FrontOfficeSection
 *
 * Newspaper-inspired daily team brief.
 *
 * UX direction:
 * - One dominant Top Report instead of a dashboard-style hero
 * - Five essential GM brief sections
 * - Strong editorial hierarchy
 * - Compact, text-first information density
 * - Responsive five-column desktop grid that stacks cleanly on smaller screens
 * - Keep current data contracts intact until live APIs are connected
 */

export type FrontOfficeReportCopy = {
   eyebrow: string;
   greeting: string;
   summary: string;
   leadLabel: string;
   leadTitle: string;
   whyTitle: string;
   whyBody: string;
   trendingTitle: string;
   notesTitle: string;
   notesDescription: string;
   moveEyebrow: string;
   moveTitle: string;
   moveBody: string;
};

type FrontOfficeSectionProps = {
   currentBrief: TeamBrief;
   teamUpdates: TeamUpdate[];
   userName: string;
   reportCopy: FrontOfficeReportCopy;
   onMakeCall: () => void;

   /**
    * Build 3B receipt resurfacing inputs.
    *
    * FrontOfficeSection only reads these values. Receipt updates remain
    * owned by page.tsx so Supabase stays the single persistence path.
    */
   receipts?: ReceiptWithRevisit[];
   receiptPostIdByReceiptId?: Record<number, number>;
   onOpenReceiptDiscussion?: (postId: number) => void;

   /**
    * Combined Build 3B + 3C actions.
    *
    * Persistence stays in page.tsx. This section only forwards actions
    * to the resurfaced receipt card.
    */
   onStandByReceipt?: (receiptId: number) => void | Promise<void>;
   onUpdateReceiptStatus?: (receiptId: number, status: Receipt["status"]) => void | Promise<void>;
};

export default function FrontOfficeSection({ currentBrief, teamUpdates, userName, reportCopy, onMakeCall, receipts = [], receiptPostIdByReceiptId = {}, onOpenReceiptDiscussion, onStandByReceipt, onUpdateReceiptStatus }: FrontOfficeSectionProps) {
   const leadUpdate = getLeadUpdate(teamUpdates);

   const newspaperData = buildNewspaperData(currentBrief);

   const bulletinTeamId = getRouteKeyByTeamName(currentBrief.team);

   const { bulletin: liveBulletin, isLoading: isBulletinLoading, error: bulletinError } = useTeamBulletin(bulletinTeamId);

   const { topReport, isLoading: isTopReportLoading, error: topReportError } = useTeamTopReport(bulletinTeamId);

   const { medicalReport: liveMedicalReport, isLoading: isMedicalReportLoading, hasLoaded: hasMedicalReportLoaded, error: medicalReportError } = useTeamMedicalReport(bulletinTeamId);

   const { statSheet: liveStatSheet, isLoading: isStatSheetLoading, hasLoaded: hasStatSheetLoaded, error: statSheetError } = useTeamStatSheet(bulletinTeamId);

   const { rumorMill: liveRumorMill, isLoading: isRumorMillLoading, hasLoaded: hasRumorMillLoaded, error: rumorMillError } = useTeamRumorMill(bulletinTeamId);

   const { ledger: liveLedger, isLoading: isLedgerLoading, hasLoaded: hasLedgerLoaded, error: ledgerError } = useTeamLedger(bulletinTeamId);

   const bulletinItems = buildBulletinItems(liveBulletin, newspaperData.bulletin);

   const leadTopReport = topReport[0];

   const topHeadline = leadTopReport?.headline ?? leadUpdate?.title ?? buildFallbackHeadline(currentBrief);

   const topSummary = leadTopReport?.summary ?? leadUpdate?.summary ?? currentBrief.storyline;

   const decisionQuestion = buildQuestionBeforeOffice({
      brief: currentBrief,
      topReport: leadTopReport,
   });

   const personalizedGreeting = reportCopy.greeting.replace("Isaiah", userName);

   /**
    * Build 3B keeps the daily brief calm by selecting at most one
    * eligible active receipt for resurfacing.
    */
   const resurfacedReceipt = selectReceiptForResurfacing(receipts);

   return (
      <section aria-labelledby="front-office-heading" className="space-y-4 sm:space-y-6">
         <article className="overflow-hidden border border-[#111827] bg-white shadow-sm">
            <div className="border-b border-[#111827] px-4 py-4 sm:px-6 md:px-7">
               <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                     <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5B6475]">Front Office Daily</p>

                     <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.02em] text-[#111827] sm:text-3xl">{currentBrief.team}</h2>
                  </div>

                  <div className="sm:text-right">
                     <p className="text-sm font-black text-[#111827]">{personalizedGreeting}</p>

                     <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B6475]">Daily team briefing</p>
                  </div>
               </div>
            </div>

            <div className="px-4 py-6 sm:px-6 sm:py-8 md:px-7 md:py-9">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">Top Report</p>

               <h3 id="front-office-heading" className="mt-3 max-w-5xl break-words text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-[#111827] sm:text-4xl md:text-5xl xl:text-6xl">
                  {topHeadline}
               </h3>

               <div className="mt-6 grid gap-6 md:mt-7 md:grid-cols-[minmax(0,1fr)_280px] md:items-start xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-7">
                  <div className="max-w-4xl">
                     <p className="text-base leading-7 text-[#374151] sm:text-lg sm:leading-8">
                        <span className="font-black text-[#111827]">{getDateline(currentBrief)}</span> {topSummary}
                     </p>

                     {leadTopReport?.source && (
                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#5B6475]">
                           <span>Source: {leadTopReport.source.name}</span>

                           {leadTopReport.publishedAt && (
                              <>
                                 <span aria-hidden="true">·</span>
                                 <time dateTime={leadTopReport.publishedAt}>{formatTopReportDate(leadTopReport.publishedAt)}</time>
                              </>
                           )}

                           {leadTopReport.source.url && (
                              <>
                                 <span aria-hidden="true">·</span>
                                 <a href={leadTopReport.source.url} target="_blank" rel="noreferrer" className="text-[#1E40AF] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                                    Read source
                                 </a>
                              </>
                           )}
                        </div>
                     )}

                     {isTopReportLoading && <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Updating Top Report…</p>}

                     {topReportError && <p className="mt-4 text-xs leading-5 text-[#5B6475]">Live Top Report is temporarily unavailable. Showing the saved FrontOffice brief.</p>}

                     {!leadTopReport && <p className="mt-5 border-l-2 border-[#111827] pl-4 text-sm leading-6 text-[#5B6475] sm:leading-7">{currentBrief.storyline}</p>}
                  </div>

                  <aside className="border-y border-[#E7DCCB] py-4 md:border-y-0 md:border-l md:py-0 md:pl-5 xl:pl-6">
                     <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5B6475]">The Question Before The Office</p>

                     <p className="mt-3 text-xl font-black leading-7 text-[#111827]">{decisionQuestion}</p>

                     <button
                        type="button"
                        onClick={onMakeCall}
                        className="mt-5 min-h-11 w-full border border-[#1E40AF] bg-[#1E40AF] px-5 py-2 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                     >
                        Make The Call
                     </button>
                  </aside>
               </div>
            </div>
         </article>

         <MatchupStrip teamName={currentBrief.team} bulletin={liveBulletin} isLoading={isBulletinLoading} error={bulletinError} />

         {resurfacedReceipt && (
            <ResurfacedReceiptCard resurfacedReceipt={resurfacedReceipt} postId={receiptPostIdByReceiptId[resurfacedReceipt.receipt.id]} onOpenDiscussion={onOpenReceiptDiscussion} onStandByIt={onStandByReceipt} onUpdateStatus={onUpdateReceiptStatus} />
         )}

         <section aria-label="Daily general manager brief" className="overflow-hidden border border-[#111827] bg-white shadow-sm">
            <div className="grid sm:grid-cols-2 xl:grid-cols-5">
               <NewspaperColumn eyebrow="01" title="The Bulletin" subtitle="League Standings & Schedule">
                  <div className="space-y-3.5">
                     {bulletinItems.map((item) => (
                        <DataLine key={item.label} label={item.label} value={item.value} />
                     ))}

                     {bulletinTeamId && isBulletinLoading && <p className="border-t border-[#E7DCCB] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Updating bulletin…</p>}

                     {bulletinTeamId && bulletinError && <p className="border-t border-[#E7DCCB] pt-4 text-xs leading-5 text-[#5B6475]">Live bulletin is temporarily unavailable. Showing the saved FrontOffice brief.</p>}
                  </div>
               </NewspaperColumn>

               <NewspaperColumn eyebrow="02" title="The Ledger" subtitle="Moves & Contract Activity">
                  <div className="space-y-4">
                     {hasLedgerLoaded &&
                        liveLedger.length > 0 &&
                        liveLedger.slice(0, 4).map((item) => (
                           <article key={item.id} className="border-b border-[#E7DCCB] pb-4 last:border-b-0 last:pb-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1E40AF]">{item.label}</p>

                              <p className="mt-1.5 text-sm font-black leading-5 text-[#111827]">{item.value}</p>

                              {item.context && <p className="mt-2 text-xs leading-5 text-[#5B6475]">{item.context}</p>}

                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-[#5B6475]">
                                 {item.source?.url ? (
                                    <a href={item.source.url} target="_blank" rel="noreferrer" className="text-[#1E40AF] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                                       {item.source.name}
                                    </a>
                                 ) : (
                                    item.source?.name && <span>{item.source.name}</span>
                                 )}

                                 {item.source?.name && item.publishedAt && <span aria-hidden="true">·</span>}

                                 {item.publishedAt && <time dateTime={item.publishedAt}>{formatLedgerDate(item.publishedAt)}</time>}
                              </div>
                           </article>
                        ))}

                     {isLedgerLoading && <p className="border-t border-[#E7DCCB] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Updating Ledger…</p>}

                     {ledgerError && <p className="border-t border-[#E7DCCB] pt-4 text-xs leading-5 text-[#5B6475]">Ledger is temporarily unavailable. Showing saved FrontOffice context.</p>}

                     {hasLedgerLoaded && liveLedger.length === 0 && !isLedgerLoading && !ledgerError && <p className="text-xs leading-5 text-[#5B6475]">No recent confirmed roster or contract activity was found for this team.</p>}

                     {!hasLedgerLoaded && !isLedgerLoading && !ledgerError && (
                        <div className="space-y-3.5">
                           <DataLine label="Cap Status" value={currentBrief.capStatus} />

                           <DataLine label="Payroll" value={newspaperData.payroll} />

                           <DataLine label="Flexibility" value={newspaperData.flexibility} />
                        </div>
                     )}
                  </div>
               </NewspaperColumn>

               <NewspaperColumn eyebrow="03" title="Medical Report" subtitle="Injury Log & Availability">
                  <div className="space-y-3.5">
                     {(hasMedicalReportLoaded ? liveMedicalReport : newspaperData.medical).map((item) => (
                        <div key={`${item.player}-${item.status}`} className="border-b border-[#E7DCCB] pb-3 last:border-b-0 last:pb-0">
                           <div className="flex items-start justify-between gap-3">
                              <p className="font-bold text-[#111827]">{item.player}</p>

                              <span className="text-right text-xs font-black uppercase tracking-[0.1em] text-[#C2410C]">{item.status}</span>
                           </div>

                           {item.detail && <p className="mt-1 text-sm leading-6 text-[#5B6475]">{item.detail}</p>}

                           {"expectedReturn" in item && item.expectedReturn && <p className="mt-1 text-xs font-bold text-[#5B6475]">Expected return: {item.expectedReturn}</p>}
                        </div>
                     ))}

                     {isMedicalReportLoading && <p className="border-t border-[#E7DCCB] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Updating Medical Report…</p>}

                     {hasMedicalReportLoaded && liveMedicalReport.length === 0 && !isMedicalReportLoading && !medicalReportError && (
                        <p className="border-t border-[#E7DCCB] pt-4 text-xs leading-5 text-[#5B6475]">No active availability issues were returned for this team.</p>
                     )}

                     <DataLine label="Health Index" value={buildHealthIndex(liveMedicalReport, newspaperData.healthIndex)} />
                  </div>
               </NewspaperColumn>

               <NewspaperColumn eyebrow="04" title="The Stat Sheet" subtitle="Team Performance Snapshot">
                  <div className="space-y-3.5">
                     {hasStatSheetLoaded &&
                        liveStatSheet.length > 0 &&
                        liveStatSheet.map((item) => (
                           <div key={item.label} className="border-b border-[#E7DCCB] pb-3 last:border-b-0 last:pb-0">
                              <div className="flex items-start justify-between gap-3">
                                 <span className="text-sm font-bold text-[#5B6475]">{item.label}</span>

                                 <span className="text-right text-sm font-black text-[#111827]">{item.value}</span>
                              </div>

                              {item.context && <p className="mt-1 text-xs font-bold text-[#1E40AF]">{item.context}</p>}
                           </div>
                        ))}

                     {!hasStatSheetLoaded &&
                        newspaperData.statLeaders.map((leader) => (
                           <div key={`${leader.rank}-${leader.player}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-[#E7DCCB] pb-3 last:border-b-0 last:pb-0">
                              <span className="text-lg font-black text-[#1E40AF]">{leader.rank}</span>

                              <span className="text-sm font-black text-[#111827]">{leader.player}</span>

                              <span className="text-sm font-black text-[#111827]">{leader.value}</span>
                           </div>
                        ))}

                     {isStatSheetLoading && <p className="border-t border-[#E7DCCB] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Updating Stat Sheet…</p>}

                     {statSheetError && <p className="border-t border-[#E7DCCB] pt-4 text-xs leading-5 text-[#5B6475]">Live Stat Sheet is temporarily unavailable. Showing the saved FrontOffice brief.</p>}

                     {hasStatSheetLoaded && liveStatSheet.length === 0 && !isStatSheetLoading && !statSheetError && <p className="text-xs leading-5 text-[#5B6475]">Team performance statistics are not available from the provider right now.</p>}
                  </div>
               </NewspaperColumn>

               <NewspaperColumn eyebrow="05" title="The Rumor Mill" subtitle="Market & Contract Watch" className="sm:col-span-2 xl:col-span-1">
                  <div className="space-y-4">
                     {hasRumorMillLoaded &&
                        liveRumorMill.length > 0 &&
                        liveRumorMill.slice(0, 3).map((item) => (
                           <article key={item.id} className="border-b border-[#E7DCCB] pb-4 last:border-b-0 last:pb-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C2410C]">{item.signal}</p>

                              <p className="mt-1.5 text-sm font-black leading-5 text-[#111827]">{item.headline}</p>

                              {item.source.url ? (
                                 <a href={item.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-bold text-[#1E40AF] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                                    {item.source.name}
                                 </a>
                              ) : (
                                 <p className="mt-2 text-[11px] font-bold text-[#5B6475]">{item.source.name}</p>
                              )}
                           </article>
                        ))}

                     {!hasRumorMillLoaded && newspaperData.rumorMill.map((item) => <DataLine key={item.label} label={item.label} value={item.value} />)}

                     {isRumorMillLoading && <p className="border-t border-[#E7DCCB] pt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#5B6475]">Checking the market…</p>}

                     {rumorMillError && <p className="border-t border-[#E7DCCB] pt-4 text-xs leading-5 text-[#5B6475]">Live market watch is temporarily unavailable. Showing the saved FrontOffice brief.</p>}

                     {hasRumorMillLoaded && liveRumorMill.length === 0 && !isRumorMillLoading && !rumorMillError && <p className="text-xs leading-5 text-[#5B6475]">No strong team-specific market reports were found in the latest provider feed.</p>}

                     <div className="border-t border-[#E7DCCB] pt-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#5B6475]">Front Office Pressure</p>

                        <p className="mt-2 text-sm font-bold leading-6 text-[#111827]">{currentBrief.fanPressure}</p>
                     </div>
                  </div>
               </NewspaperColumn>
            </div>
         </section>

         <section className="border border-[#111827] bg-[#FFF8EE] px-4 py-5 sm:px-6 md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
               <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5B6475]">Editorial Note</p>

                  <p className="mt-2 max-w-3xl text-base leading-7 text-[#111827]">The office has the report. The next move is yours.</p>
               </div>

               <button
                  type="button"
                  onClick={onMakeCall}
                  className="min-h-12 w-full shrink-0 border border-[#111827] bg-white px-5 py-2 md:w-auto text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
               >
                  Create Your Take
               </button>
            </div>
         </section>
      </section>
   );
}

function buildHealthIndex(medicalReport: Array<{ status: string }>, fallback: string) {
   if (medicalReport.length === 0) {
      return fallback;
   }

   const severity = medicalReport.reduce((total, item) => {
      const status = item.status.toLowerCase();

      if (status.includes("out") || status.includes("injured reserve") || status.includes("il") || status.includes("suspend")) {
         return total + 18;
      }

      if (status.includes("doubtful") || status.includes("inactive")) {
         return total + 12;
      }

      if (status.includes("questionable") || status.includes("day-to-day") || status.includes("probable")) {
         return total + 6;
      }

      return total + 8;
   }, 0);

   return `${Math.max(0, Math.min(100, 100 - severity))}%`;
}

function formatTopReportDate(value: string) {
   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return "";
   }

   return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
   }).format(date);
}

function formatLedgerDate(value: string) {
   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return "";
   }

   return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
   }).format(date);
}

function buildBulletinItems(
   bulletin: {
      record?: string;
      standing?: string;
      seasonPhase?: "Preseason" | "Regular Season" | "Postseason" | "Offseason";
      statusNote?: string;
      form?: string[];
      lastGame?: {
         opponent: string;
         result?: string;
         score?: string;
      };
      nextGame?: {
         opponent: string;
         scheduledAt?: string;
         location?: "Home" | "Away" | "Neutral";
      };
   } | null,
   fallbackItems: BulletinItem[],
): BulletinItem[] {
   if (!bulletin) {
      return fallbackItems;
   }

   const items: BulletinItem[] = [];

   if (bulletin.seasonPhase) {
      items.push({
         label: "Season",
         value: bulletin.seasonPhase,
      });
   }

   if (bulletin.record) {
      items.push({
         label: "Record",
         value: bulletin.record,
      });
   }

   if (bulletin.standing) {
      items.push({
         label: "Standing",
         value: bulletin.standing,
      });
   }

   if (bulletin.form?.length) {
      items.push({
         label: "Recent Form",
         value: bulletin.form.join(" · "),
      });
   }

   if (bulletin.lastGame) {
      const lastGameParts = [bulletin.lastGame.result, bulletin.lastGame.score, `vs ${bulletin.lastGame.opponent}`].filter(Boolean);

      items.push({
         label: "Last Game",
         value: lastGameParts.join(" "),
      });
   }

   if (bulletin.nextGame) {
      const nextGameParts = [bulletin.nextGame.location === "Away" ? "at" : "vs", bulletin.nextGame.opponent, formatBulletinDate(bulletin.nextGame.scheduledAt)].filter(Boolean);

      items.push({
         label: "Next Game",
         value: nextGameParts.join(" "),
      });
   } else if (bulletin.statusNote) {
      items.push({
         label: "Next Game",
         value: bulletin.statusNote,
      });
   }

   return items.length > 0 ? items : fallbackItems;
}

function formatBulletinDate(value?: string) {
   if (!value) {
      return undefined;
   }

   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return undefined;
   }

   return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
   }).format(date);
}

function NewspaperColumn({ eyebrow, title, subtitle, className = "", children }: { eyebrow: string; title: string; subtitle: string; className?: string; children: React.ReactNode }) {
   return (
      <article className={`border-b border-[#111827] p-4 sm:border-r sm:p-5 sm:[&:nth-child(2n)]:border-r-0 md:p-6 xl:border-b-0 xl:border-r xl:[&:nth-child(2n)]:border-r xl:last:border-r-0 ${className}`}>
         <p className="text-[11px] font-black tracking-[0.18em] text-[#C2410C]">{eyebrow}</p>

         <h4 className="mt-2 text-xl font-black uppercase leading-[1.05] tracking-[-0.02em] text-[#111827]">{title}</h4>

         <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6475]">{subtitle}</p>

         <div className="mt-5">{children}</div>
      </article>
   );
}

function DataLine({ label, value }: BulletinItem) {
   return (
      <div className="flex items-start justify-between gap-4 border-b border-[#E7DCCB] pb-3 last:border-b-0 last:pb-0">
         <p className="text-sm font-medium leading-5 text-[#5B6475]">{label}</p>

         <p className="text-right text-sm font-black leading-5 text-[#111827]">{value}</p>
      </div>
   );
}
