"use client";

import Image from "next/image";
import { useState } from "react";
import { initialCallForm, type CallFormState, type FrontOfficeProfile, type TeamBrief } from "@/data/frontofficeData";
import { moderateText } from "@/lib/moderation";

type MakeTheCallSectionProps = {
   currentBrief: TeamBrief;
   callForm?: CallFormState;
   setCallForm: (form: CallFormState) => void;
   onPostCall: () => void | Promise<void>;
   currentUserProfile: FrontOfficeProfile;
};

export default function MakeTheCallSection({ currentBrief, callForm, setCallForm, onPostCall, currentUserProfile }: MakeTheCallSectionProps) {
   const safeCallForm = callForm ?? initialCallForm;
   const [moderationMessage, setModerationMessage] = useState("");

   const MAX_POST_LENGTH = 1000;

   const isCallEmpty = safeCallForm.call.trim().length === 0;

   const isCallTooLong = safeCallForm.call.length > MAX_POST_LENGTH;

   async function handlePostCall() {
      if (isCallTooLong) {
         setModerationMessage(`Keep your War Room call to ${MAX_POST_LENGTH} characters or fewer.`);
         return;
      }

      const moderation = moderateText(safeCallForm.call);

      if (!moderation.allowed) {
         setModerationMessage(moderation.message ?? "That wording isn’t allowed on FrontOffice. Rewrite it and try again.");
         return;
      }

      try {
         await onPostCall();
         setModerationMessage("");
      } catch {
         setModerationMessage("That wording isn’t allowed on FrontOffice. Rewrite it and try again.");
      }
   }

   return (
      <section aria-labelledby="make-call-heading" className="space-y-4 sm:space-y-5">
         <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#C2410C]">Make the Call</p>

            <h3 id="make-call-heading" className="mt-2 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
               What hot take do you have today?
            </h3>
         </div>

         <form
            className="overflow-hidden rounded-2xl border border-[#E7DCCB] bg-white shadow-sm sm:rounded-3xl"
            onSubmit={(event) => {
               event.preventDefault();
               void handlePostCall();
            }}
         >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-6">
               <ComposerAvatar profile={currentUserProfile} />

               <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                     <p className="font-bold text-[#111827]">{currentUserProfile.name}</p>

                     <span className="text-[#5B6475]">·</span>

                     <p className="font-medium text-[#5B6475]">{currentUserProfile.handle}</p>
                  </div>

                  <textarea
                     rows={5}
                     value={safeCallForm.call}
                     onChange={(event) => {
                        setModerationMessage("");
                        setCallForm({
                           ...safeCallForm,
                           call: event.target.value,
                        });
                     }}
                     placeholder={`What should ${currentBrief.team} do next?`}
                     maxLength={MAX_POST_LENGTH}
                     aria-describedby={moderationMessage ? "make-call-moderation-message" : undefined}
                     className="mt-4 min-h-40 w-full resize-y border-0 bg-transparent text-lg leading-7 text-[#111827] outline-none placeholder:text-[#5B6475] focus:ring-0 sm:text-xl sm:leading-8"
                  />

                  <p id="make-call-character-count" aria-live="polite" className="mt-2 text-right text-xs font-medium text-[#5B6475]">
                     {safeCallForm.call.length}/{MAX_POST_LENGTH}
                  </p>
               </div>
            </div>

            {moderationMessage && (
               <div id="make-call-moderation-message" role="alert" className="border-t border-[#C2410C] bg-[#FFF1E8] px-5 py-3 text-sm font-bold leading-6 text-[#9A3412] sm:px-6">
                  {moderationMessage}
               </div>
            )}

            <div className="border-t border-[#E7DCCB] px-5 py-4 sm:px-6">
               <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-bold text-[#111827]">
                     Call type
                     <select
                        value={safeCallForm.callType}
                        onChange={(event) =>
                           setCallForm({
                              ...safeCallForm,
                              callType: event.target.value,
                           })
                        }
                        className="mt-2 min-h-12 w-full border-0 border-b border-[#E7DCCB] bg-transparent px-0 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-0"
                     >
                        <option>Trade Idea</option>
                        <option>Lineup Decision</option>
                        <option>Hot Take</option>
                        <option>Future Receipt</option>
                     </select>
                  </label>

                  <label className="text-sm font-bold text-[#111827]">
                     Confidence
                     <select
                        value={safeCallForm.confidence}
                        onChange={(event) =>
                           setCallForm({
                              ...safeCallForm,
                              confidence: event.target.value,
                           })
                        }
                        className="mt-2 min-h-12 w-full border-0 border-b border-[#E7DCCB] bg-transparent px-0 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-0"
                     >
                        <option>Just Spitballing</option>
                        <option>I Said What I Said</option>
                        <option>Let Me Cook</option>
                     </select>
                  </label>
               </div>
            </div>

            <div className="flex justify-stretch border-t border-[#E7DCCB] px-4 py-4 sm:justify-center sm:px-6 sm:py-5">
               <button
                  type="submit"
                  disabled={isCallEmpty || isCallTooLong}
                  className="min-h-12 w-full rounded-2xl bg-[#1E40AF] px-8 py-2 text-base font-medium text-white transition sm:w-auto hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:bg-[#5B6475]"
               >
                  Post to War Room
               </button>
            </div>
         </form>
      </section>
   );
}

function ComposerAvatar({ profile }: { profile: FrontOfficeProfile }) {
   if (profile.profileImageUrl) {
      return (
         <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1E40AF]">
            <Image src={profile.profileImageUrl} alt={`${profile.name} profile`} fill sizes="48px" unoptimized className="object-cover" />
         </div>
      );
   }

   return (
      <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-bold text-white">
         {profile.initials}
      </div>
   );
}
