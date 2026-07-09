"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { moderateText } from "@/lib/moderation";
import AccountOnboarding from "@/components/frontoffice/AccountOnboarding";

type AuthMode = "sign-in" | "sign-up";

type AuthGateProps = {
   children: ReactNode;
};

function normalizeHandle(value: string) {
   const compact = value.trim().replace(/\s+/g, "").toLowerCase();

   if (!compact) return "";

   return compact.startsWith("@") ? compact : `@${compact}`;
}

function isAdult(birthDate: string) {
   const birth = new Date(`${birthDate}T00:00:00`);

   if (Number.isNaN(birth.getTime())) return false;

   const today = new Date();
   const threshold = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

   return birth <= threshold;
}

function getFriendlyAuthMessage(error: unknown) {
   const rawMessage = error instanceof Error ? error.message : "";
   const message = rawMessage.toLowerCase();

   if (message.includes("email rate limit") || message.includes("rate limit exceeded") || message.includes("too many requests")) {
      return "Too many verification emails were requested recently. Wait a few minutes, then try again.";
   }

   if (message.includes("invalid email") || message.includes("email address is invalid") || message.includes("unable to validate email")) {
      return "Enter a valid email address and try again.";
   }

   if (message.includes("already registered") || message.includes("user already registered")) {
      return "An account already exists for that email. Sign in instead.";
   }

   if (message.includes("invalid login credentials")) {
      return "The email or password is incorrect.";
   }

   if (message.includes("email not confirmed")) {
      return "Verify your email before signing in.";
   }

   return rawMessage || "Authentication failed. Please try again.";
}

export default function AuthGate({ children }: AuthGateProps) {
   const [mode, setMode] = useState<AuthMode>("sign-in");
   const [email, setEmail] = useState("");
   const [name, setName] = useState("");
   const [handle, setHandle] = useState("");
   const [birthDate, setBirthDate] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [acceptedPolicies, setAcceptedPolicies] = useState(false);
   const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
   const [isLoading, setIsLoading] = useState(true);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [message, setMessage] = useState("");
   const [isAuthenticated, setIsAuthenticated] = useState(false);
   const [needsOnboarding, setNeedsOnboarding] = useState(false);
   const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
   const [resendCooldown, setResendCooldown] = useState(0);

   useEffect(() => {
      const savedPendingEmail = window.localStorage.getItem("frontoffice_pending_verification_email") ?? "";

      if (savedPendingEmail) {
         setPendingVerificationEmail(savedPendingEmail);
      }
   }, []);

   useEffect(() => {
      if (resendCooldown <= 0) {
         return;
      }

      const timer = window.setInterval(() => {
         setResendCooldown((seconds) => Math.max(0, seconds - 1));
      }, 1000);

      return () => {
         window.clearInterval(timer);
      };
   }, [resendCooldown]);

   useEffect(() => {
      let isMounted = true;

      async function loadSession() {
         const { data, error } = await supabase.auth.getSession();

         if (!isMounted) return;

         if (error) {
            setMessage(error.message);
            setIsLoading(false);
            return;
         }

         const session = data.session;
         setIsAuthenticated(Boolean(session));

         if (!session) {
            setNeedsOnboarding(false);
            setIsLoading(false);
            return;
         }

         const { data: profile, error: profileError } = await supabase.from("profiles").select("onboarding_complete").eq("id", session.user.id).maybeSingle();

         if (!isMounted) return;

         if (profileError) {
            setMessage(profileError.message);
            setIsLoading(false);
            return;
         }

         if (!profile) {
            await supabase.auth.signOut();

            if (!isMounted) return;

            setIsAuthenticated(false);
            setNeedsOnboarding(false);
            setMessage("Your previous test session was cleared. Create a new account to continue.");
            setIsLoading(false);
            return;
         }

         setNeedsOnboarding(profile.onboarding_complete !== true);
         setIsLoading(false);
      }

      void loadSession();

      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         if (!isMounted) return;

         setIsAuthenticated(Boolean(session));

         if (!session) {
            setNeedsOnboarding(false);
            setIsLoading(false);
            return;
         }

         void loadSession();
      });

      return () => {
         isMounted = false;
         subscription.unsubscribe();
      };
   }, []);

   async function checkHandleAvailability() {
      const normalizedHandle = normalizeHandle(handle);

      if (!/^@[a-z0-9_]{2,29}$/.test(normalizedHandle)) {
         setHandleStatus("unavailable");
         return false;
      }

      setHandleStatus("checking");

      const { data, error } = await supabase.rpc("is_handle_available", {
         candidate_handle: normalizedHandle,
      });

      if (error) {
         setHandleStatus("idle");
         setMessage(error.message);
         return false;
      }

      const isAvailable = data === true;
      setHandleStatus(isAvailable ? "available" : "unavailable");

      return isAvailable;
   }

   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedHandle = normalizeHandle(handle);

      if (!normalizedEmail || password.length < 8) {
         setMessage("Use a valid email and a password with at least 8 characters.");
         return;
      }

      if (mode === "sign-up") {
         const identityModeration = moderateText(`${name.trim()} ${normalizedHandle}`);

         if (!identityModeration.allowed) {
            setMessage(identityModeration.message ?? "That wording isn’t allowed on FrontOffice.");
            return;
         }

         if (!name.trim() || name.trim().length > 50) {
            setMessage("Enter a display name with 50 characters or fewer.");
            return;
         }

         if (!/^@[a-z0-9_]{2,29}$/.test(normalizedHandle)) {
            setMessage("Username must be 3–30 characters using letters, numbers, or underscores.");
            return;
         }

         if (password !== confirmPassword) {
            setMessage("Passwords do not match.");
            return;
         }

         if (!birthDate || !isAdult(birthDate)) {
            setMessage("You must be 18 or older to create a FrontOffice account.");
            return;
         }

         if (!acceptedPolicies) {
            setMessage("You must agree to the Terms and Privacy Policy to continue.");
            return;
         }
      }

      setIsSubmitting(true);
      setMessage("");

      try {
         if (mode === "sign-up") {
            const handleAvailable = await checkHandleAvailability();

            if (!handleAvailable) {
               setMessage("That username is already taken or unavailable.");
               return;
            }

            const { data, error } = await supabase.auth.signUp({
               email: normalizedEmail,
               password,
               options: {
                  data: {
                     name: name.trim(),
                     handle: normalizedHandle,
                     birth_date: birthDate,
                  },
               },
            });

            if (error) throw error;

            if (!data.session) {
               window.localStorage.setItem("frontoffice_pending_verification_email", normalizedEmail);

               setPendingVerificationEmail(normalizedEmail);
               setPassword("");
               setConfirmPassword("");
               setMessage("");
               setResendCooldown(60);
            }
         } else {
            const { error } = await supabase.auth.signInWithPassword({
               email: normalizedEmail,
               password,
            });

            if (error) throw error;

            window.localStorage.removeItem("frontoffice_pending_verification_email");
            setPendingVerificationEmail("");
         }
      } catch (error) {
         setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
      } finally {
         setIsSubmitting(false);
      }
   }

   async function handleResendVerification() {
      if (!pendingVerificationEmail || resendCooldown > 0 || isSubmitting) {
         return;
      }

      setIsSubmitting(true);
      setMessage("");

      try {
         const { error } = await supabase.auth.resend({
            type: "signup",
            email: pendingVerificationEmail,
         });

         if (error) {
            throw error;
         }

         setResendCooldown(60);
         setMessage("Verification email sent. Check your inbox and spam folder.");
      } catch (error) {
         setMessage(getFriendlyAuthMessage(error));
      } finally {
         setIsSubmitting(false);
      }
   }

   function handleChangeVerificationEmail() {
      window.localStorage.removeItem("frontoffice_pending_verification_email");

      setPendingVerificationEmail("");
      setEmail("");
      setName("");
      setHandle("");
      setBirthDate("");
      setPassword("");
      setConfirmPassword("");
      setAcceptedPolicies(false);
      setHandleStatus("idle");
      setMessage("");
      setMode("sign-up");
   }

   function handleReturnToSignIn() {
      setMode("sign-in");
      setEmail(pendingVerificationEmail);
      setPassword("");
      setConfirmPassword("");
      setMessage("");
   }

   function switchMode(nextMode: AuthMode) {
      setMode(nextMode);
      setMessage("");
      setPassword("");
      setConfirmPassword("");
      setHandleStatus("idle");
   }

   if (isLoading) {
      return (
         <main className="flex min-h-screen items-center justify-center bg-[#F6F7F8] px-4 text-[#111827]">
            <div className="border border-[#111827] bg-white px-6 py-8 text-center">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice</p>
               <p className="mt-2 text-xl font-black uppercase tracking-[-0.02em]">Opening the office...</p>
            </div>
         </main>
      );
   }

   if (!isAuthenticated && pendingVerificationEmail) {
      return (
         <main className="min-h-screen bg-[#F6F7F8] px-3 py-4 text-[#111827] sm:px-6 sm:py-8">
            <div className="mx-auto max-w-2xl overflow-hidden border border-[#111827] bg-white">
               <header className="border-b border-[#111827] bg-[#FFF8EE] px-5 py-6 sm:px-7">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice Verification</p>

                  <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-4xl">Check Your Email</h1>

                  <p className="mt-3 text-sm leading-6 text-[#5B6475] sm:text-base">We sent a verification link to:</p>

                  <p className="mt-2 break-all text-base font-black text-[#111827]">{pendingVerificationEmail}</p>
               </header>

               <section className="space-y-5 p-5 sm:p-7">
                  <div className="border border-[#111827] bg-[#FFF8EE] px-4 py-4">
                     <p className="text-sm font-bold leading-6 text-[#111827]">Open the verification email, confirm your account, then return here and sign in.</p>

                     <p className="mt-2 text-sm leading-6 text-[#5B6475]">Check your spam or junk folder if you do not see the email after a minute.</p>
                  </div>

                  {message && (
                     <div role="status" aria-live="polite" className="border border-[#111827] bg-white px-4 py-3 text-sm leading-6 text-[#5B6475]">
                        {message}
                     </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                     <button
                        type="button"
                        onClick={() => {
                           void handleResendVerification();
                        }}
                        disabled={isSubmitting || resendCooldown > 0}
                        className="min-h-12 border border-[#1E40AF] bg-[#1E40AF] px-5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60"
                     >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : isSubmitting ? "Sending..." : "Resend Verification"}
                     </button>

                     <button
                        type="button"
                        onClick={handleReturnToSignIn}
                        className="min-h-12 border border-[#111827] bg-white px-5 text-xs font-black uppercase tracking-[0.12em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                     >
                        Return To Sign In
                     </button>
                  </div>

                  <button type="button" onClick={handleChangeVerificationEmail} className="min-h-11 w-full text-sm font-bold text-[#1E40AF] underline-offset-4 hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                     Use a different email address
                  </button>
               </section>
            </div>
         </main>
      );
   }

   if (isAuthenticated && needsOnboarding) {
      return <AccountOnboarding onComplete={() => setNeedsOnboarding(false)} />;
   }

   if (isAuthenticated) return children;

   return (
      <main className="min-h-screen bg-[#F6F7F8] px-3 py-4 text-[#111827] sm:px-6 sm:py-6 md:px-8 md:py-8">
         <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-6xl overflow-hidden border border-[#111827] bg-white md:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
            <section className="flex flex-col justify-between border-b border-[#111827] bg-[#FFF8EE] p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
               <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice</p>

                  <h1 className="mt-3 max-w-xl break-words text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-6xl">Be the GM. Make the call. Keep the receipts.</h1>

                  <p className="mt-6 max-w-xl text-base leading-7 text-[#5B6475] sm:text-lg sm:leading-8">Create your office, follow the teams you care about, and join the War Room.</p>
               </div>
            </section>

            <section className="flex items-center p-5 sm:p-8 lg:p-10">
               <div className="w-full">
                  <div className="grid grid-cols-2 border border-[#111827]">
                     <AuthTab label="Sign In" isActive={mode === "sign-in"} onClick={() => switchMode("sign-in")} />
                     <AuthTab label="Create Account" isActive={mode === "sign-up"} onClick={() => switchMode("sign-up")} />
                  </div>

                  <div className="mt-6">
                     <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">{mode === "sign-in" ? "Welcome Back" : "Open Your Office"}</p>

                     <h2 className="mt-2 text-3xl font-black uppercase leading-[1.02] tracking-[-0.035em]">{mode === "sign-in" ? "Sign In" : "Create Account"}</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                     <FieldLabel label="Email">
                        <input
                           type="email"
                           value={email}
                           onChange={(event) => setEmail(event.target.value)}
                           autoComplete="email"
                           required
                           className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                        />
                     </FieldLabel>

                     {mode === "sign-up" && (
                        <>
                           <FieldLabel label="Display Name">
                              <input
                                 type="text"
                                 value={name}
                                 onChange={(event) => setName(event.target.value)}
                                 autoComplete="name"
                                 maxLength={50}
                                 required
                                 className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                              />
                           </FieldLabel>

                           <FieldLabel label="Username">
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto]">
                                 <input
                                    type="text"
                                    value={handle}
                                    onChange={(event) => {
                                       setHandle(event.target.value);
                                       setHandleStatus("idle");
                                    }}
                                    onBlur={() => {
                                       void checkHandleAvailability();
                                    }}
                                    autoComplete="username"
                                    maxLength={30}
                                    required
                                    placeholder="yourusername"
                                    className="min-h-12 w-full border border-[#111827] sm:border-r-0 bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                                 />

                                 <div className="flex min-h-11 items-center justify-start border border-t-0 border-[#111827] bg-[#FFF8EE] px-3 sm:min-w-28 sm:justify-center sm:border-t text-[11px] font-black uppercase tracking-[0.1em]">
                                    {handleStatus === "checking" && "Checking"}
                                    {handleStatus === "available" && "Available"}
                                    {handleStatus === "unavailable" && "Unavailable"}
                                    {handleStatus === "idle" && "Public"}
                                 </div>
                              </div>

                              <p className="mt-2 text-xs leading-5 text-[#5B6475]">3–30 characters. Letters, numbers, and underscores only.</p>
                           </FieldLabel>

                           <FieldLabel label="Date of Birth">
                              <input
                                 type="date"
                                 value={birthDate}
                                 onChange={(event) => setBirthDate(event.target.value)}
                                 required
                                 className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                              />

                              <p className="mt-2 text-xs leading-5 text-[#5B6475]">You must be 18 or older. Your birth date is not shown publicly.</p>
                           </FieldLabel>
                        </>
                     )}

                     <FieldLabel label="Password">
                        <input
                           type="password"
                           value={password}
                           onChange={(event) => setPassword(event.target.value)}
                           autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                           minLength={8}
                           required
                           className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                        />
                     </FieldLabel>

                     {mode === "sign-up" && (
                        <>
                           <FieldLabel label="Confirm Password">
                              <input
                                 type="password"
                                 value={confirmPassword}
                                 onChange={(event) => setConfirmPassword(event.target.value)}
                                 autoComplete="new-password"
                                 minLength={8}
                                 required
                                 className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                              />
                           </FieldLabel>

                           <label className="flex items-start gap-3 border border-[#111827] bg-[#FFF8EE] px-4 py-3">
                              <input type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} required className="mt-0.5 h-5 w-5 shrink-0 accent-[#1E40AF]" />
                              <span className="text-sm leading-6 text-[#5B6475]">I confirm that I am at least 18 years old and agree to the FrontOffice Terms and Privacy Policy.</span>
                           </label>
                        </>
                     )}

                     {message && (
                        <div role="status" aria-live="polite" className="border border-[#111827] bg-[#FFF8EE] px-4 py-3 text-sm leading-6 text-[#5B6475]">
                           {message}
                        </div>
                     )}

                     <button
                        type="submit"
                        disabled={isSubmitting}
                        className="min-h-12 w-full border border-[#1E40AF] bg-[#1E40AF] px-5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60"
                     >
                        {isSubmitting ? "Working..." : mode === "sign-in" ? "Enter FrontOffice" : "Create Account"}
                     </button>
                  </form>
               </div>
            </section>
         </div>
      </main>
   );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
   return (
      <label className="block">
         <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5B6475]">{label}</span>
         {children}
      </label>
   );
}

function AuthTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         aria-pressed={isActive}
         className={`min-h-12 border-r border-[#111827] px-2 text-[11px] sm:px-3 sm:text-xs font-black uppercase tracking-[0.12em] transition last:border-r-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 ${
            isActive ? "bg-[#111827] text-white" : "bg-white text-[#5B6475] hover:bg-[#FFF8EE] hover:text-[#111827]"
         }`}
      >
         {label}
      </button>
   );
}
