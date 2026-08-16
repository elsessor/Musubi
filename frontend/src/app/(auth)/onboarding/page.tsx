"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, Zap } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { completeOnboarding, getOrganizationDirectory, joinOrganization, type OrganizationDirectoryOption } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

type Role = "leader" | "member";
type Stage = "role" | "leader-check" | "organization" | "details" | "pending";

const skills = ["Event Planning", "Coordination", "Documentation", "Communication", "Finance", "Budgeting", "Logistics", "Venue Management", "Design", "Photography", "Networking", "HR", "Scheduling", "Research", "Writing", "Social Media", "Video Editing", "Public Speaking"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"];
const positionOptions = ["President", "Vice President", "Secretary", "Treasurer", "Finance Officer", "Auditor", "Public Relations Officer", "Committee Chair", "Project Coordinator", "Team Lead", "Organization Member"];
const programOptions = [
  "Bachelor of Science in Accountancy",
  "Bachelor of Science in Accounting Information Management",
  "Bachelor of Science in Biology",
  "Bachelor of Science in Banking and Finance",
  "Bachelor of Science in Civil Engineering",
  "Bachelor of Science in Business Management Honors Program",
  "Bachelor of Science in Computer Engineering",
  "Bachelor of Science in Financial Management and Accounting",
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Legal Management",
  "Bachelor of Science in Development Communication",
  "Bachelor of Science in Management",
  "Bachelor of Science in Electronics Engineering",
  "Bachelor of Science in Marketing Management",
  "Bachelor of Science in Entrepreneurship",
  "Bachelor of Science in Specialized Track on Tourism",
  "Bachelor of Science in Information Systems",
  "Bachelor of Science in Information Technology",
  "Bachelor of Science in Mathematics",
  "Bachelor of Science in Nursing",
  "Bachelor of Science in Psychology",
  "Bachelor of Science in Tourism Management",
  "Bachelor of Arts in Communication",
  "Bachelor of Arts in Economics",
  "Bachelor of Arts in English Language Studies",
  "Bachelor of Arts in Literature",
  "Bachelor of Arts in Philosophy",
  "Bachelor of Arts in Political Science",
  "Bachelor of Early Childhood Education",
  "Bachelor of Elementary Education",
  "Bachelor of Library Information Science",
  "Bachelor of Secondary Education",
  "Bachelor of Special Needs Education",
  "Bachelor of Engineering Technology – Computer Engineering Technology",
  "Bachelor of Physical Education",
  "Bachelor of Religious and Values Education"
];

const DEFAULT_DIRECTORY_ORGANIZATIONS: OrganizationDirectoryOption[] = [
  {
    id: "org-1",
    name: "University Student Council",
    type: "Governing",
    description: "The highest governing student body of the university.",
    status: "active",
    requestedByUID: null,
    organizationConfig: {},
    createdAt: null,
    updatedAt: null
  },
  {
    id: "org-2",
    name: "Computer Science Society",
    type: "Academic",
    description: "Org for CS majors focused on tech and innovation.",
    status: "active",
    requestedByUID: null,
    organizationConfig: {},
    createdAt: null,
    updatedAt: null
  },
  {
    id: "org-3",
    name: "Socio-Civic Action Group",
    type: "Socio-Civic",
    description: "Community outreach and civic engagement programs.",
    status: "active",
    requestedByUID: null,
    organizationConfig: {},
    createdAt: null,
    updatedAt: null
  },
  {
    id: "org-4",
    name: "Campus Media Network",
    type: "Media",
    description: "Handles campus publications and broadcast.",
    status: "active",
    requestedByUID: null,
    organizationConfig: {},
    createdAt: null,
    updatedAt: null
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const showToast = useToastStore((state) => state.showToast);
  const [stage, setStage] = useState<Stage>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [orgPath, setOrgPath] = useState<"find" | "create">("find");
  const [orgSearch, setOrgSearch] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [joiningOrganizationLater, setJoiningOrganizationLater] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationDirectoryOption[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinMode, setJoinMode] = useState<"search" | "code">("search");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [year, setYear] = useState("");
  const [program, setProgram] = useState("");
  const [position, setPosition] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const availableOrganizations = useMemo(
    () => (organizations.length > 0 ? organizations : DEFAULT_DIRECTORY_ORGANIZATIONS),
    [organizations]
  );

  const filteredOrganizations = useMemo(
    () => availableOrganizations.filter((org) => `${org.name} ${org.type}`.toLowerCase().includes(orgSearch.toLowerCase())),
    [availableOrganizations, orgSearch]
  );
  const selectedOrganization = availableOrganizations.find((org) => org.id === organizationId);
  const isJoiningOrganizationLater = joiningOrganizationLater && !organizationId;
  const completedSteps = stage === "role" ? 1 : stage === "leader-check" || stage === "organization" || stage === "details" ? 2 : 3;

  useEffect(() => {
    if (!firebaseUser) return;
    setOrganizationsLoading(true);
    void getOrganizationDirectory(firebaseUser).then(setOrganizations).catch(() => setOrganizations([])).finally(() => setOrganizationsLoading(false));
  }, [firebaseUser]);

  function toggleSkill(skill: string) {
    setSelectedSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  }

  function addCustomSkill() {
    const skill = customSkill.trim();
    if (!skill) return;
    const suggestedSkill = skills.find((item) => item.toLowerCase() === skill.toLowerCase());
    const skillToAdd = suggestedSkill ?? skill;

    setSelectedSkills((current) => current.some((item) => item.toLowerCase() === skillToAdd.toLowerCase()) ? current : [...current, skillToAdd]);
    if (!suggestedSkill) {
      setManualSkills((current) => current.some((item) => item.toLowerCase() === skillToAdd.toLowerCase()) ? current : [...current, skillToAdd]);
    }
    setCustomSkill("");
    setError("");
  }

  function removeManualSkill(skill: string) {
    setManualSkills((current) => current.filter((item) => item !== skill));
    setSelectedSkills((current) => current.filter((item) => item !== skill));
    setError("");
  }

  function continueFromRole() {
    if (!role) return;
    setError("");
    setStage(role === "leader" ? "leader-check" : "organization");
  }

  function continueFromOrganization() {
    if (isJoiningOrganizationLater) {
      setError("");
      setStage("details");
      return;
    }

    if (role === "leader" && orgPath === "create") {
      if (!organizationName.trim() || !organizationType || !organizationDescription.trim()) {
        setError("Enter your organization name, type, and description to continue.");
        return;
      }
    } else if (!organizationId) {
      setError("Select an organization to continue.");
      return;
    }
    setError("");
    setStage("details");
  }

  async function submitDetails() {
    if (!year || !program.trim() || !position.trim() || (role === "member" && selectedSkills.length === 0)) {
      setError(role === "member" && selectedSkills.length === 0 ? "Choose at least one skill, then complete your profile details." : "Complete your position, year level, and program to continue.");
      return;
    }
    if (!firebaseUser || !role) {
      setError("Your sign-in session has expired. Please sign in again.");
      return;
    }

    const onboardingOrganizationId = isNewOrganization
      ? `new-${organizationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
      : null;

    if (!onboardingOrganizationId && !isJoiningOrganizationLater && !selectedOrganization) {
      setError("We could not determine your organization. Please go back and try again.");
      return;
    }

    setIsCompleting(true);
    setError("");
    try {
      const session = await completeOnboarding(firebaseUser, {
        role: role === "leader" ? "Student Leader" : "Organization Member",
        position: position.trim(),
        organizationId: onboardingOrganizationId,
        organizationRequest: isNewOrganization
          ? {
              organizationId: onboardingOrganizationId as string,
              orgName: organizationName.trim(),
              orgType: organizationType,
              description: organizationDescription.trim()
            }
          : undefined,
        yearLevel: year,
        program: program.trim(),
        skills: selectedSkills
      });

      if (!isNewOrganization && !isJoiningOrganizationLater && selectedOrganization) {
        await joinOrganization(firebaseUser, selectedOrganization.id);
      }

      setProfile(session.user);
      showToast({
        title: "Profile saved",
        description: isNewOrganization
          ? "Your organization request was submitted for review."
          : selectedOrganization
          ? "Your join request was submitted for leader approval."
          : "Your onboarding is complete.",
        tone: "success"
      });

      if (isNewOrganization || selectedOrganization) {
        setStage("pending");
      } else {
        router.replace("/dashboard");
      }
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : "Unable to save your onboarding details.");
    } finally {
      setIsCompleting(false);
    }
  }

  function finishOnboarding() {
    router.replace("/dashboard");
  }

  const isNewOrganization = role === "leader" && orgPath === "create";
  const displayOrganization = isNewOrganization ? organizationName : isJoiningOrganizationLater ? "Not joined yet" : selectedOrganization?.name;
  const firstName = (profile?.fullName ?? firebaseUser?.displayName ?? "there").trim().split(/\s+/)[0];

  return (
    <main className="min-h-screen bg-[#f3f6fa] px-4 py-10 text-[#061a38] sm:px-6">
      <div className="mx-auto w-full max-w-[568px]">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-2xl bg-brand text-xl text-white shadow-soft">✦</div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#061a38]">Welcome, {firstName}!</h1>
          <p className="mt-2 text-[16px] font-medium text-slate-500">Let&apos;s set up your account. This only takes a moment.</p>
        </header>

        {stage !== "pending" && <Stepper active={completedSteps} />}

        <section className="rounded-[20px] border border-[#e0e5ed] bg-white p-5 shadow-[0_2px_3px_rgba(20,35,55,.13)] sm:p-6">
          {stage === "role" && <>
            <SectionTitle title="What is your role?" description="This helps us tailor your workspace and the tools you can access." />
            <div className="mt-6 space-y-3">
              <RoleOption active={role === "leader"} icon="★" title="Student Leader" description="I manage an organization, set goals, and delegate work." onClick={() => setRole("leader")} />
              <RoleOption active={role === "member"} icon="♟" title="Organization Member" description="I collaborate on tasks assigned by my organization." onClick={() => setRole("member")} />
            </div>
            <PrimaryButton className="mt-7" disabled={!role} onClick={continueFromRole}>Continue <span aria-hidden>→</span></PrimaryButton>
          </>}

          {stage === "leader-check" && <>
            <SectionTitle title="Is your organization already in Musubi?" description="We'll connect you to your existing org or help you register a new one." />
            <div className="mt-6 space-y-3">
              <ChoiceCard icon="Search" title="Yes, it's already in Musubi" description="Search for your org and request to join as a leader or co-leader." onClick={() => { setOrgPath("find"); setStage("organization"); }} />
              <ChoiceCard icon="Bolt" title="No, I need to register it" description="Fill out the organization registration form. Requires admin approval." onClick={() => { setOrgPath("create"); setStage("organization"); }} />
            </div>
            <button type="button" onClick={() => setStage("role")} className="mt-5 h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">&larr; Back</button>
          </>}

          {stage === "organization" && <>
            <SectionTitle title={role === "leader" ? "Find or register your organization" : "Find your organization"} description={role === "leader" ? "Join an existing organization or submit a new one for review." : "Search for your organization or enter its join code. You can also join later."} />
            {role === "leader" && <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <Tab active={orgPath === "find"} onClick={() => { setOrgPath("find"); setError(""); }}>Find existing</Tab>
              <Tab active={orgPath === "create"} onClick={() => { setOrgPath("create"); setError(""); }}>Register new</Tab>
            </div>}
            {isNewOrganization ? <div className="mt-6 space-y-4">
              <Field label="Organization name"><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="onboarding-input" placeholder="e.g. Computer Science Society" /></Field>
              <Field label="Organization type"><select value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className="onboarding-input"><option value="">Select a type</option><option>Academic</option><option>Arts & Culture</option><option>Sports</option><option>Student Government</option><option>Community Service</option></select></Field>
              <Field label="Organization description"><textarea value={organizationDescription} onChange={(event) => setOrganizationDescription(event.target.value)} className="onboarding-input min-h-24 h-auto py-3" placeholder="Describe your organization, its purpose, and planned activities." /></Field>
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">New organization registrations are reviewed by a Musubi administrator before activation.</p>
            </div> : <div className="mt-6">
              {joinMode === "code" ? <Field label="6-character join code"><input value={joinCode} maxLength={6} onChange={(event) => { setJoinCode(event.target.value.toUpperCase()); setError(""); }} className="onboarding-input font-mono uppercase tracking-[0.25em]" placeholder="e.g. CSC202" /></Field> : <><Field label="Search organizations"><input value={orgSearch} onChange={(event) => { setOrgSearch(event.target.value); setError(""); }} className="onboarding-input" placeholder="Type an organization name..." /></Field><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{filteredOrganizations.map((org) => <button key={org.id} type="button" onClick={() => { setOrganizationId(org.id); setJoiningOrganizationLater(false); setError(""); }} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${organizationId === org.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-slate-200 hover:border-blue-300"}`}><span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft font-bold text-brand">⌘</span><span className="flex-1"><span className="block text-sm font-bold text-slate-800">{org.name}</span><span className="text-xs text-slate-500">{org.type}</span></span>{organizationId === org.id && <span className="text-accent">✓</span>}</button>)}</div></>}
            </div>}
            {!isNewOrganization && <button type="button" onClick={() => { setJoiningOrganizationLater(true); setOrganizationId(""); setJoinCode(""); setError(""); }} className={`mt-4 w-full rounded-xl border p-3 text-left transition ${isJoiningOrganizationLater ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-dashed border-slate-300 hover:border-blue-300 hover:bg-slate-50"}`}><span className="block text-sm font-bold text-slate-800">I&apos;ll join an organization later</span><span className="mt-1 block text-xs text-slate-500">Continue setting up your profile and request membership whenever you&apos;re ready.</span></button>}
            <ErrorMessage message={error} />
            <div className="mt-7 flex gap-3"><SecondaryButton onClick={() => setStage(role === "leader" ? "leader-check" : "role")}>Back</SecondaryButton><PrimaryButton onClick={continueFromOrganization}>Continue <span aria-hidden>→</span></PrimaryButton></div>
          </>}

          {stage === "details" && <>
            <SectionTitle title="Tell us about yourself" description="Keep your profile current so your team can find the right people for each task." />
            <div className="mt-6"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Your skills {role === "member" && <span className="text-red-500">*</span>}</label><p className="mt-1 text-xs text-slate-500">Select all that apply - used to match you with the right tasks.</p><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <button key={skill} type="button" onClick={() => { toggleSkill(skill); setError(""); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selectedSkills.includes(skill) ? "border-brand bg-brand text-white" : "border-slate-200 bg-[#f3f6fa] text-slate-600 hover:border-blue-300"}`}>{skill}</button>)}</div><div className="mt-4 flex gap-2"><input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomSkill(); } }} className="onboarding-input h-10 flex-1" placeholder="Add another skill..." /><button type="button" onClick={addCustomSkill} disabled={!customSkill.trim()} className="h-10 rounded-xl bg-[#e8edf5] px-4 text-sm font-bold text-[#244775] transition hover:bg-[#dce5f2] disabled:cursor-not-allowed disabled:opacity-50">Add</button></div>{manualSkills.length > 0 && <div className="mt-3"><p className="text-xs font-semibold text-slate-500">Added skills</p><div className="mt-2 flex flex-wrap gap-2">{manualSkills.map((skill) => <button key={skill} type="button" onClick={() => removeManualSkill(skill)} className="rounded-full border border-brand bg-brand text-white px-3 py-1.5 text-xs font-bold transition hover:bg-[#193960]" aria-label={`Remove ${skill}`}>{skill} <span aria-hidden>×</span></button>)}</div></div>}</div>
            <div className="mt-6"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Year level <span className="text-red-500">*</span></label><div className="mt-3 flex flex-wrap gap-2">{years.map((item) => <button key={item} type="button" onClick={() => { setYear(item); setError(""); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${year === item ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>{item}</button>)}</div></div>
            <div className="mt-5"><Field label="Program"><input list="program-options" value={program} onChange={(event) => { setProgram(event.target.value); setError(""); }} className="onboarding-input h-10 bg-white text-[13px] text-slate-900 [color-scheme:light]" placeholder="Choose or type your program" /><datalist id="program-options">{programOptions.map((item) => <option key={item} value={item} />)}</datalist></Field><p className="mt-1.5 text-xs text-slate-500">Choose from the list or enter your program manually.</p></div>
            <div className="mt-5"><Field label="Organization position"><input list="position-options" value={position} onChange={(event) => { setPosition(event.target.value); setError(""); }} className="onboarding-input h-10 bg-white text-[13px] text-slate-900 [color-scheme:light]" placeholder="Choose or type your position" /><datalist id="position-options">{positionOptions.map((item) => <option key={item} value={item} />)}</datalist></Field><p className="mt-1.5 text-xs text-slate-500">Choose from the list or enter your position manually.</p></div>
            <div className="mt-6"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Birthdate</label><div className="mt-2 flex gap-2"><select value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} className="onboarding-input flex-1"><option value="">Month</option>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => <option key={month}>{month}</option>)}</select><select value={birthDay} onChange={(event) => setBirthDay(event.target.value)} className="onboarding-input w-20"><option value="">Day</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day}>{day}</option>)}</select><select value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className="onboarding-input w-28"><option value="">Year</option>{Array.from({ length: 60 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year}>{year}</option>)}</select></div></div>
            <ErrorMessage message={error} />
            <div className="mt-7 flex gap-3"><SecondaryButton onClick={() => setStage("organization")}>Back</SecondaryButton><PrimaryButton onClick={submitDetails}>{isNewOrganization ? "Submit for review" : isJoiningOrganizationLater ? "Complete setup" : "Submit request"} <span aria-hidden>→</span></PrimaryButton></div>
          </>}

          {stage === "pending" && <div className="py-3 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">◷</div><span className="mt-5 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending review</span><h2 className="mt-4 text-2xl font-extrabold text-slate-950">{isNewOrganization ? "Your organization is under review" : "Your request was submitted"}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">{isNewOrganization ? "A Musubi administrator will review your organization registration and notify you when it is approved." : "Your organization leader will review your request to join and notify you of their decision."}</p><div className="mt-6 rounded-xl bg-slate-50 p-4 text-left"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Submission summary</p><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Organization</span><span className="font-bold text-slate-800">{displayOrganization}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Status</span><span className="font-bold text-amber-700">Pending</span></div></div><ErrorMessage message={error} /><PrimaryButton className="mt-7" disabled={isCompleting} onClick={finishOnboarding}>{isCompleting ? "Saving your profile..." : "Enter dashboard"}</PrimaryButton><p className="mt-3 text-xs text-slate-400">You&apos;ll have limited access until your request is approved.</p></div>}
        </section>
        {stage !== "pending" && <p className="mt-4 text-center text-xs font-medium text-slate-400">You can update these details anytime from your profile settings.</p>}
      </div>
    </main>
  );
}

function Stepper({ active }: { active: number }) { return <div className="mx-auto mb-8 flex w-[240px] items-start justify-between">{["Role", "Details", "Done"].map((label, index) => <div key={label} className="flex items-center last:flex-none"><div className="flex flex-col items-center"><span className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${index + 1 <= active ? "bg-[#244775] text-white" : "bg-[#e8eef7] text-slate-500"}`}>{index + 1 < active ? "✓" : index + 1}</span><span className="mt-1.5 text-xs font-medium text-slate-500">{label}</span></div>{index < 2 && <span className={`mb-4 h-0.5 w-12 ${index + 1 < active ? "bg-[#244775]" : "bg-[#dbe3ee]"}`} />}</div>)}</div>; }
function SectionTitle({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-extrabold text-slate-950">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p></div>; }
function ChoiceCard({ icon, title, description, onClick }: { icon: "Search" | "Bolt"; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-xl border border-[#d8e0eb] bg-[#f3f6fa] p-4 text-left transition hover:border-[#9db2cc] hover:bg-[#eef4fb]"><span className={`flex size-10 items-center justify-center rounded-xl ${icon === "Search" ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"}`}>{icon === "Search" ? <Search size={18} /> : <Zap size={18} />}</span><span className="flex-1"><span className="block text-sm font-extrabold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span></span><ChevronRight size={16} className="text-slate-400" /></button>; }
function RoleOption({ active, icon, title, description, onClick }: { active: boolean; icon: string; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${active ? "border-brand bg-brand-soft" : "border-slate-200 hover:border-blue-300"}`}><span className="flex size-11 items-center justify-center rounded-xl bg-white text-lg text-brand shadow-sm">{icon}</span><span className="flex-1"><span className="block text-sm font-extrabold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span></span>{active && <span className="text-lg text-accent">✓</span>}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}<span className="ml-1 text-red-500">*</span><span className="mt-2 block">{children}</span></label>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{children}</button>; }
function PrimaryButton({ children, onClick, disabled, className = "" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) { return <Button type="button" disabled={disabled} onClick={onClick} className={`!h-[52px] flex-1 rounded-xl bg-[#244775] text-[16px] font-extrabold hover:bg-[#193960] disabled:bg-[#a7b5c8] ${className}`}>{children}</Button>; }
function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex h-[52px] flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50">{children}</button>; }
function ErrorMessage({ message }: { message: string }) { return message ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600" role="alert">{message}</p> : null; }
