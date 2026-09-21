"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { completeOnboarding, getOrganizationDirectory, joinOrganization, type OrganizationDirectoryOption } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

type Role = "leader" | "member";
type Stage = "role" | "leader-check" | "organization" | "details" | "pending";

const skills = [
  // Media, Design & Creative Writing
  "Editing & Proofreading",
  "Photography",
  "Photo Editing",
  "Video Editing",
  "Videography",
  "Graphic Design",
  "UI/UX Design",
  "Content Creation",
  "Copywriting",
  "Journalism & Reporting",
  "Broadcasting",
  "Publication & Layout Design",
  "Scriptwriting",
  "Illustration & Digital Art",
  "Brand Identity Design",
  "Social Media Management",

  // Finance, Accounting & Business
  "Finance",
  "Financial Reporting",
  "Budgeting",
  "Auditing",
  "Accounting",
  "Bookkeeping",
  "Sponsorship & Fundraising",
  "Market Research",
  "Business Planning",
  "Risk Management",
  "Project Management",
  "Strategic Planning",
  "Leadership",
  "Team Building",

  // Tech, Computing & Data
  "Web Development",
  "Mobile App Development",
  "Software Engineering",
  "Data Analysis & Visualization",
  "Database Management",
  "Cybersecurity & IT Support",
  "Artificial Intelligence & ML",
  "Systems Analysis",

  // Engineering, Sciences & Math
  "CAD & Technical Drawing",
  "Circuit & Hardware Design",
  "Statistical Analysis",
  "Scientific Research",
  "Laboratory Techniques",
  "Environmental & Safety Management",

  // Events, Operations & Hospitality
  "Event Planning",
  "Logistics & Supply Chain",
  "Venue & Stage Operations",
  "Audio/Visual Operations",
  "Catering & Hospitality",
  "Registration & Check-in",
  "Protocol & Security",

  // Legal, Governance, HR & Communication
  "Parliamentary Procedure",
  "Legal Research & Drafting",
  "Policy Making",
  "Conflict Resolution",
  "HR & Membership",
  "Communication",
  "Public Speaking",
  "Public Relations",
  "Community Outreach",
  "Documentation & Record Keeping",

  // Education & Training
  "Academic Tutoring & Mentorship",
  "Curriculum & Module Design",
  "Educational Technology"
];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const leaderPositionOptions = ["President", "Vice President", "Secretary", "Treasurer", "Finance Officer", "Auditor", "Public Relations Officer", "Committee Chair", "Project Coordinator", "Team Lead"];
const memberPositionOptions = ["Organization Member", "Committee Member", "Project Member", "Volunteer", "Staff", "Associate", "Sub-committee Member"];
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

  const activePositionOptions = useMemo(
    () => (role === "leader" ? leaderPositionOptions : memberPositionOptions),
    [role]
  );

  useEffect(() => {
    if (role === "member" && leaderPositionOptions.includes(position)) {
      setPosition("");
    }
  }, [role, position]);

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
              <Field label="Organization type"><CustomSelect value={organizationType} onChange={setOrganizationType} options={["Academic", "Arts & Culture", "Sports", "Student Government", "Community Service"]} placeholder="Select a type" className="w-full" /></Field>
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
            <div className="mt-6">
              <SkillsComboboxInput
                selectedSkills={selectedSkills}
                onToggleSkill={toggleSkill}
                onAddSkill={(newSkill) => {
                  if (!newSkill.trim()) return;
                  const suggestedSkill = skills.find((item) => item.toLowerCase() === newSkill.trim().toLowerCase());
                  const skillToAdd = suggestedSkill ?? newSkill.trim();
                  setSelectedSkills((current) => current.some((item) => item.toLowerCase() === skillToAdd.toLowerCase()) ? current : [...current, skillToAdd]);
                  if (!suggestedSkill) {
                    setManualSkills((current) => current.some((item) => item.toLowerCase() === skillToAdd.toLowerCase()) ? current : [...current, skillToAdd]);
                  }
                }}
                onRemoveSkill={(skill) => {
                  setSelectedSkills((current) => current.filter((item) => item !== skill));
                  setManualSkills((current) => current.filter((item) => item !== skill));
                }}
                allSkills={skills}
                isRequired={role === "member"}
                clearError={() => setError("")}
              />
            </div>
            <div className="mt-6"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Year level <span className="text-red-500">*</span></label><div className="mt-3 flex flex-wrap gap-2">{years.map((item) => <button key={item} type="button" onClick={() => { setYear(item); setError(""); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${year === item ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>{item}</button>)}</div></div>
            <div className="mt-5"><Field label="Program"><ComboboxInput value={program} onChange={(val) => { setProgram(val); setError(""); }} options={programOptions} placeholder="Choose or type your program" className="onboarding-input h-10 bg-white text-[13px] text-slate-900" /></Field><p className="mt-1.5 text-xs text-slate-500">Choose from the list or enter your program manually.</p></div>
            <div className="mt-5"><Field label="Organization position"><ComboboxInput value={position} onChange={(val) => { setPosition(val); setError(""); }} options={activePositionOptions} placeholder="Choose or type your position" className="onboarding-input h-10 bg-white text-[13px] text-slate-900" /></Field><p className="mt-1.5 text-xs text-slate-500">Choose from the list or enter your position manually.</p></div>
            <div className="mt-6"><label className="text-xs font-bold uppercase tracking-wide text-slate-500">Birthdate</label><div className="mt-2 flex gap-2"><CustomSelect value={birthMonth} onChange={setBirthMonth} options={["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]} placeholder="Month" className="flex-1" /><CustomSelect value={birthDay} onChange={setBirthDay} options={Array.from({ length: 31 }, (_, index) => index + 1)} placeholder="Day" className="w-24" /><CustomSelect value={birthYear} onChange={setBirthYear} options={Array.from({ length: 60 }, (_, index) => new Date().getFullYear() - index)} placeholder="Year" className="w-28" /></div></div>
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

function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          className={`${className} pr-9`}
          placeholder={placeholder}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((previous) => !previous)}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg shadow-slate-900/10 transition-all">
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
                value === option
                  ? "bg-[#edf3fc] font-semibold text-[#1d3b63]"
                  : "text-slate-700 hover:bg-[#f3f6fa] hover:text-[#12213a]"
              }`}
            >
              <span>{option}</span>
              {value === option && <Check className="size-3.5 text-[#244775]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: (string | number)[];
  placeholder: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const stringOptions = useMemo(() => options.map(String), [options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-[13px] transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-[#244775]/20 ${
          value ? "font-medium text-slate-900" : "text-slate-400"
        }`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg shadow-slate-900/10 transition-all">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
              !value ? "bg-[#edf3fc] font-semibold text-[#1d3b63]" : "text-slate-400 hover:bg-[#f3f6fa]"
            }`}
          >
            <span>{placeholder}</span>
            {!value && <Check className="size-3.5 text-[#244775]" />}
          </button>
          {stringOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
                value === option
                  ? "bg-[#edf3fc] font-semibold text-[#1d3b63]"
                  : "text-slate-700 hover:bg-[#f3f6fa] hover:text-[#12213a]"
              }`}
            >
              <span>{option}</span>
              {value === option && <Check className="size-3.5 text-[#244775]" />}
            </button>
          ))}
        </div>
      )}
    </div>
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

const popularSkills = [
  "Editing & Proofreading",
  "Photography",
  "Video Editing",
  "Graphic Design",
  "Finance",
  "Auditing",
  "Event Planning",
  "Social Media Management",
  "Project Management",
  "Public Speaking"
];

function SkillsComboboxInput({
  selectedSkills,
  onToggleSkill,
  onAddSkill,
  onRemoveSkill,
  allSkills,
  isRequired,
  clearError
}: {
  selectedSkills: string[];
  onToggleSkill: (skill: string) => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  allSkills: string[];
  isRequired: boolean;
  clearError: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSkills;
    return allSkills.filter((s) => s.toLowerCase().includes(q));
  }, [allSkills, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSkills.some((s) => s.toLowerCase() === q) || selectedSkills.some((s) => s.toLowerCase() === q);
  }, [allSkills, selectedSkills, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectSkill(skill: string) {
    onToggleSkill(skill);
    setSearchQuery("");
    clearError();
  }

  function handleAddCustom() {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    onAddSkill(trimmed);
    setSearchQuery("");
    clearError();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Your skills {isRequired && <span className="text-red-500">*</span>}
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Search skills or select popular quick picks. Type custom skills if not listed.
        </p>
      </div>

      {/* Popular Skills Quick Pills */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400">Popular Quick-Select:</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {popularSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => handleSelectSkill(skill)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  isSelected
                    ? "border-[#244775] bg-[#244775] text-white shadow-xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Searchable Combobox & Tag Box */}
      <div ref={containerRef} className="relative w-full">
        <div
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={`flex min-h-[46px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white p-2 transition cursor-text ${
            isOpen ? "border-[#244775] ring-2 ring-[#244775]/15" : "border-slate-200 hover:border-blue-300"
          }`}
        >
          <Search className="size-4 shrink-0 text-slate-400 ml-1" />

          {/* Selected Tag Badges */}
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-lg bg-[#e8edf5] px-2.5 py-1 text-xs font-bold text-[#193960]"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSkill(skill);
                  clearError();
                }}
                className="rounded p-0.5 text-slate-500 hover:bg-[#d5e0f0] hover:text-slate-900"
                aria-label={`Remove ${skill}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (searchQuery.trim()) {
                  const match = filteredSkills.find((s) => s.toLowerCase() === searchQuery.trim().toLowerCase());
                  if (match) {
                    handleSelectSkill(match);
                  } else {
                    handleAddCustom();
                  }
                }
              }
            }}
            placeholder={selectedSkills.length === 0 ? "Type to search skills or enter custom..." : "Add more..."}
            className="flex-1 min-w-[140px] bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400 py-0.5 px-1"
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            className="ml-auto text-slate-400 hover:text-slate-600 transition p-1"
          >
            <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Dropdown list */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#dce3ed] bg-white py-1 shadow-lg shadow-slate-900/10 transition-all">
            {searchQuery.trim() && !exactMatchExists && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddCustom();
                }}
                className="flex w-full items-center justify-between border-b border-slate-100 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#244775] hover:bg-[#edf3fc]"
              >
                <span>Add custom skill: &quot;{searchQuery.trim()}&quot;</span>
                <span className="rounded bg-[#244775] px-2 py-0.5 text-[11px] font-bold text-white">+ Add</span>
              </button>
            )}

            {filteredSkills.length > 0 ? (
              filteredSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSkill(skill);
                    }}
                    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
                      isSelected
                        ? "bg-[#edf3fc] font-semibold text-[#1d3b63]"
                        : "text-slate-700 hover:bg-[#f3f6fa] hover:text-[#12213a]"
                    }`}
                  >
                    <span>{skill}</span>
                    {isSelected && <Check className="size-3.5 text-[#244775]" />}
                  </button>
                );
              })
            ) : !searchQuery.trim() ? (
              <p className="px-3.5 py-2.5 text-xs text-slate-400">Type to search skills...</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
