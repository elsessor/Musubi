import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarCheck,
  CalendarDays, Check, CheckCheck, CircleCheck, ClipboardList,
  Clock3, Flag, LayoutGrid, Sparkles, Users
} from "lucide-react";
import styles from "./LandingPage.module.css";
import { LandingHeader } from "./LandingHeader";
import { MusubiLogo } from "@/components/brand/MusubiLogo";

const navigation = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#who-its-for", label: "Who it’s for" }
];

const features = [
  { icon: ClipboardList, title: "Events and tasks", description: "Organize activities, assign responsibilities, and follow deadlines and progress.", note: "A clear next step for everyone" },
  { icon: Sparkles, title: "AI-assisted planning", description: "Turn an event description into a proposed task plan. Review and adjust suggestions before publishing.", note: "You review every plan", accent: true },
  { icon: LayoutGrid, title: "Flexible views", description: "Explore work through grid, table, expandable list, Kanban, and calendar views.", note: "See the work your way" },
  { icon: Users, title: "Organization management", description: "Coordinate members, committees, and announcements in one shared workspace.", note: "Keep your organization connected" },
  { icon: BarChart3, title: "Progress and feedback", description: "Review task completion, workload, and recorded leader feedback. Access depends on your role.", note: "Understand each contribution" },
  { icon: CalendarCheck, title: "Google Calendar integration", description: "Connect your calendar to sync event schedules and task deadlines.", note: "Keep important dates in view" }
];

const steps = [
  { number: "01", title: "Set up your profile", description: "Choose your role and add your position, academic details, and skills." },
  { number: "02", title: "Connect with your organization", description: "Find your organization and request membership. Leaders can also submit a new organization for approval." },
  { number: "03", title: "Plan and manage work", description: "Create events, assign tasks, update progress, and review completed submissions." }
];

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="Musubi home">
    <span className={styles.brandMark}><MusubiLogo size={35} className={styles.logoImage} decorative /></span>
    <span>Musubi<span className={styles.brandDot}>.</span></span>
  </Link>;
}

function WorkspacePreview() {
  return <figure className={styles.preview} aria-label="">
    <div className={`${styles.previewCard} ${styles.eventCard}`}>
      <div className={styles.cardTop}><span className={styles.previewIcon}><CalendarDays size={18} aria-hidden="true" /></span><span className={`${styles.badge} ${styles.planning}`}>Planning</span></div>
      <p className={styles.cardEyebrow}>EVENT OVERVIEW</p>
      <p className={styles.cardTitle}>Campus Arts Festival</p>
      <p className={styles.cardDescription}>One plan, from idea to event day.</p>
      <div className={styles.cardFooter}><Users size={14} aria-hidden="true" /><span>Events Committee</span><ArrowUpRight size={14} aria-hidden="true" /></div>
    </div>
    <div className={`${styles.previewCard} ${styles.taskCard}`}>
      <div className={styles.taskHeading}><span className={styles.checkTile}><Check size={15} strokeWidth={3} aria-hidden="true" /></span><span className={styles.cardEyebrow}>ASSIGNED TASK</span></div>
      <p className={styles.cardTitle}>Prepare publicity materials</p>
      <div className={styles.taskMeta}><span className={`${styles.badge} ${styles.inProgress}`}><span />In progress</span><span className={styles.miniIcon}><Clock3 size={14} aria-hidden="true" />Deadline</span></div>
      <div className={styles.taskLine}><span /><span /><span /></div>
      <p className={styles.cardDescription}>A clear responsibility. A shared goal.</p>
    </div>
    <div className={`${styles.previewCard} ${styles.progressCard}`}>
      <div className={styles.progressRing}><CheckCheck size={23} aria-hidden="true" /></div>
      <div><p className={styles.cardEyebrow}>TEAM PROGRESS</p><p className={styles.progressValue}>4 <span>of 6</span></p><p className={styles.cardDescription}>tasks completed</p></div>
      <span className={styles.progressNote}><CircleCheck size={13} aria-hidden="true" />Moving forward, together</span>
    </div>
    <div className={`${styles.previewCard} ${styles.committeeCard}`}>
      <span className={styles.committeeLabel}><Users size={15} aria-hidden="true" />YOUR PEOPLE</span>
      <p className={styles.cardTitle}>Events Committee</p>
      <div className={styles.committeeInitials} aria-hidden="true"><span>PL</span><span>DS</span><span>EV</span><span><Check size={13} /></span></div>
      <p className={styles.cardDescription}>A place for every contribution.</p>
    </div>
    <figcaption className={styles.previewCaption}></figcaption>
  </figure>;
}

export function LandingPage() {
  return <div className={styles.page} id="top" data-landing-page>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <LandingHeader brand={<Brand />} navigation={navigation} />

    <main id="main-content">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroStamp} aria-hidden="true"><MusubiLogo size={48} decorative /></div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrowPill}><span />Built for campus organizations</span>
          <h1 id="hero-title" className={styles.heroTitle}>Plan campus events.<span>Keep your team in sync.</span></h1>
          <p className={styles.heroDescription}>Musubi brings events, tasks, committees, and organization updates into one shared workspace. Give every member a clear responsibility and keep track of what happens next.</p>
          <div className={styles.heroActions}><Link href="/sign-up" className={styles.primaryButton}>Get started <ArrowRight size={17} aria-hidden="true" /></Link><a href="#how-it-works" className={styles.secondaryButton}>See how it works <ArrowUpRight size={16} aria-hidden="true" /></a></div>
          <p className={styles.heroAudience}><Users size={14} aria-hidden="true" />For student leaders and organization members.</p>
        </div>
        <WorkspacePreview />
      </section>

      <section id="features" className={`${styles.shell} ${styles.section}`} aria-labelledby="features-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>YOUR WORKSPACE, CONNECTED</p><h2 id="features-title">Everything your organization needs<br className={styles.desktopBreak} /> to move work forward.</h2><p>From planning an event to reviewing completed tasks, keep your team’s work connected.</p></div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, title, description, note, accent }) => <article key={title} className={`${styles.featureCard} ${accent ? styles.featureAccent : ""}`}>
          <span className={styles.featureIcon}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span>
          <h3>{title}</h3><p>{description}</p><span className={styles.featureNote}><Check size={13} strokeWidth={2.4} aria-hidden="true" />{note}</span>
        </article>)}</div>
      </section>

      <section id="how-it-works" className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.shell}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>FROM FIRST IDEA TO FINAL TASK</p><h2 id="workflow-title">Start with a plan.<br />Follow through together.</h2></div>
          <div className={styles.steps}>{steps.map((step) => <article className={styles.step} key={step.number}><span className={styles.stepNumber}>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
          <div className={styles.guideNote}><span><BookOpen size={23} aria-hidden="true" /></span><div><h3>A little guidance, whenever you need it.</h3><p>Guided instructions introduce each page as you explore. Replay them anytime from Help / User Guide.</p></div></div>
        </div>
      </section>

      <section id="who-its-for" className={`${styles.shell} ${styles.section}`} aria-labelledby="roles-title">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>DIFFERENT ROLES. ONE SHARED GOAL.</p><h2 id="roles-title">A workspace for everyone<br className={styles.desktopBreak} /> who makes it happen.</h2></div>
        <div className={styles.roles}>
          <article className={styles.roleCard}><div className={styles.roleTop}><span className={styles.roleIcon}><Flag size={25} strokeWidth={1.6} aria-hidden="true" /></span><span className={styles.roleTag}>LEAD WITH CLARITY</span></div><h3>For student leaders</h3><p>Plan events, coordinate committees, delegate responsibilities, and review your team’s work.</p><ul>{["Coordinate events and committees", "Assign tasks and review submissions", "Follow team workload and progress"].map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></article>
          <article className={`${styles.roleCard} ${styles.memberCard}`}><div className={styles.roleTop}><span className={styles.roleIcon}><Users size={25} strokeWidth={1.6} aria-hidden="true" /></span><span className={styles.roleTag}>CONTRIBUTE WITH CONFIDENCE</span></div><h3>For organization members</h3><p>Find your assignments, understand task requirements, submit outputs, and stay informed.</p><ul>{["See your assignments and deadlines", "Update progress and submit outputs", "Follow organization announcements"].map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul></article>
        </div>
      </section>

      <section className={`${styles.shell} ${styles.closing}`} aria-labelledby="closing-title">
        <div className={styles.closingContent}><p className={styles.closingEyebrow}>YOUR NEXT EVENT STARTS HERE</p><h2 id="closing-title">Make your next campus event<br className={styles.desktopBreak} /> easier to coordinate.</h2><p>Bring your plans, responsibilities, and updates together with Musubi.</p><Link href="/sign-up" className={styles.closingButton}>Create your account <ArrowRight size={17} aria-hidden="true" /></Link><span className={styles.closingSignIn}>Already have an account? <Link href="/sign-in">Sign in <ArrowUpRight size={13} aria-hidden="true" /></Link></span></div>
        <span className={styles.closingOrbit} aria-hidden="true"><MusubiLogo size={80} decorative /></span>
      </section>
    </main>

    <footer className={`${styles.shell} ${styles.footer}`}><div><Brand /><p>Campus organizations, connected.</p></div><nav aria-label="Footer navigation">{navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}</nav><p className={styles.copyright}>© {new Date().getFullYear()} Musubi</p></footer>
  </div>;
}
