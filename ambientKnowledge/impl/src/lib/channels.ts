import type { Message } from "./types";

export interface DemoChannel {
  id: string;
  name: string;
  purpose: string;
  recipientId: string;
}

const DEMO_BASE_TIME = Date.now() - 3 * 60 * 60 * 1000;
const m = (minutes: number) => DEMO_BASE_TIME + minutes * 60_000;

export const CHANNELS: DemoChannel[] = [
  {
    id: "platform-migration",
    name: "platform-migration",
    purpose: "Billing service extraction handoff",
    recipientId: "user-marcus",
  },
  {
    id: "approvals",
    name: "approvals",
    purpose: "Cross-team sign-offs and reviews",
    recipientId: "user-priya",
  },
  {
    id: "mobile-v2",
    name: "mobile-v2",
    purpose: "React Native rewrite updates",
    recipientId: "user-marcus",
  },
  {
    id: "api-gateway",
    name: "api-gateway",
    purpose: "Kong → Envoy migration",
    recipientId: "user-marcus",
  },
  {
    id: "design-system",
    name: "design-system",
    purpose: "Shared component library coordination",
    recipientId: "user-priya",
  },
  {
    id: "onboarding",
    name: "onboarding",
    purpose: "Guided setup flow launch",
    recipientId: "user-priya",
  },
  {
    id: "incident-ops",
    name: "incident-ops",
    purpose: "On-call coordination and postmortems",
    recipientId: "user-diego",
  },
  {
    id: "security-review",
    name: "security-review",
    purpose: "Audit remediation and threat modeling",
    recipientId: "user-leila",
  },
  {
    id: "release-train",
    name: "release-train",
    purpose: "Release coordination and go/no-go",
    recipientId: "user-rina",
  },
  {
    id: "qa-triage",
    name: "qa-triage",
    purpose: "Bug triage and test stability",
    recipientId: "user-nina",
  },
  {
    id: "eng-leadership",
    name: "eng-leadership",
    purpose: "Weekly priorities and staffing",
    recipientId: "user-owen",
  },
];

export const DEFAULT_CHANNEL_ID = CHANNELS[0].id;

export const CHANNEL_MESSAGES: Record<string, Message[]> = {
  "platform-migration": [
    {
      id: "demo-platform-1",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "Marcus — can you take point on the billing service migration kickoff? Data confirmed a backfill window next Tuesday. Attaching the dual-write doc so you can ramp quickly.",
      timestamp: m(0),
      attachedContext: {
        topic: "Billing Database Migration — Dual-Write Strategy",
        summary:
          "Migrating billing data (50M rows) to a dedicated service DB via dual-write → backfill → shadow-read → cutover. Backfill estimated at 6–8 hours; 40+ FKs become API calls.",
        openQuestions: [
          "Has rollback validation been signed off by data engineering?",
          "Are billing API contracts finalized for mobile consumers?",
        ],
        sources: [
          {
            id: "note-db-migration",
            title: "Billing Database Migration — Dual-Write Strategy",
            type: "note",
            url: "/wiki/note-db-migration",
          },
          {
            id: "proj-platform-overview",
            title: "Platform Migration — Monolith to Microservices",
            type: "project",
            url: "/wiki/proj-platform-overview",
          },
        ],
      },
    },
    {
      id: "demo-platform-2",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Yep. I’ll write a one-pager plan + list the APIs we need to stub while Billing gets extracted. Anything sensitive around the 40+ FK replacements?",
      timestamp: m(6),
    },
    {
      id: "demo-platform-3",
      senderId: "user-mei",
      recipientId: "user-sarah",
      text: "For backfill: we can batch inserts and throttle to keep replication lag under control. If you want, I’ll draft a runbook that on-call can execute.",
      timestamp: m(11),
    },
    {
      id: "demo-platform-4",
      senderId: "user-sarah",
      recipientId: "user-mei",
      text: "That would be great — include: throttle knobs, lag thresholds, and what we do if lag spikes (pause backfill but keep dual-write).",
      timestamp: m(14),
    },
    {
      id: "demo-platform-5",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Got it. For FK replacements: I’ll keep it simple — introduce a BillingRead client behind an interface and start swapping call sites gradually.",
      timestamp: m(18),
    },
    {
      id: "demo-platform-6",
      senderId: "user-owen",
      recipientId: "user-sarah",
      text: "Weekly update ask: are we still on track for Phase 2 Billing extraction this month? I need a crisp status + risks.",
      timestamp: m(25),
    },
    {
      id: "demo-platform-7",
      senderId: "user-sarah",
      recipientId: "user-owen",
      text: "Auth extraction done. Billing is in dual-write/backfill planning. Main risks: DB pool saturation during backfill and API latency from FK→RPC swaps; mitigations: throttle + staged cutover + explicit rollback.",
      timestamp: m(29),
    },
    {
      id: "demo-platform-8",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Once we have the first BillingRead path live, I can help run a shadow-read compare for a week (sampling only) to build confidence.",
      timestamp: m(34),
    },
  ],

  approvals: [
    {
      id: "demo-approval-1",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Need sign-off today: should rate limiting ship enabled-by-default, or opt-in for week 1? Rina prefers the safer stance for the train.",
      timestamp: m(8),
    },
    {
      id: "demo-approval-2",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Opt-in for week 1 with an allowlist, then flip default after we see real traffic. Also align wording with Jordan: load-test results, not guarantees.",
      timestamp: m(12),
    },
    {
      id: "demo-approval-3",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "+1 opt-in. The go/no-go checklist is fine, but I want a clear rollback procedure link and canary ramp steps included.",
      timestamp: m(15),
    },
    {
      id: "demo-approval-4",
      senderId: "user-sarah",
      recipientId: "user-rina",
      text: "Ack — I’ll add a 5-minute switchback procedure and link the rollback runbook in the checklist.",
      timestamp: m(18),
    },
    {
      id: "demo-approval-5",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Can you drop that decision as a comment on the rollout doc so leadership sees the staged plan?",
      timestamp: m(22),
    },
    {
      id: "demo-approval-6",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Yep — posting now. I’ll include the gating metrics we’ll monitor during the allowlist week.",
      timestamp: m(26),
    },
  ],

  "mobile-v2": [
    {
      id: "demo-mobile-1",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "RN v2 update: dashboard components ~70% done. Transaction list still stutters — Reanimated worklets got us 42→55fps, but pull-to-refresh is janky.",
      timestamp: m(3),
    },
    {
      id: "demo-mobile-1b",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Also flagging an upstream perf thread: React Native issue about lazy initialization for FlatList renderItem (facebook/react-native#55027). Might map to our ‘closure churn’ problem in renderItem. Link: https://github.com/facebook/react-native/issues/55027",
      timestamp: m(5),
    },
    {
      id: "demo-mobile-2",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "Is it correlated with Hermes GC right after the network response? If so, reduce allocations during refresh and batch state updates.",
      timestamp: m(7),
    },
    {
      id: "demo-mobile-3",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Yep — seeing a 40–60ms pause immediately after response parsing. Attaching the perf note so we agree on the target.",
      timestamp: m(10),
      attachedContext: {
        topic: "React Native — Transaction List Performance Fix",
        summary:
          "Transaction list drops to ~42fps from JS-driven animations + re-renders. Fix in progress: Reanimated 3 worklets, memoized list items, image caching. Target: 60fps on mid-range Android.",
        openQuestions: [
          "Can we reproduce reliably on a mid-range Android device?",
          "Should we ship partial mitigations before the full rewrite?",
        ],
        sources: [
          {
            id: "note-rn-performance",
            title: "React Native — Transaction List Performance Fix",
            type: "note",
            url: "/wiki/note-rn-performance",
          },
          {
            id: "proj-mobile-overview",
            title: "Mobile App v2 — React Native Rewrite",
            type: "project",
            url: "/wiki/proj-mobile-overview",
          },
        ],
      },
    },
    {
      id: "demo-mobile-4",
      senderId: "user-alex",
      recipientId: "user-marcus",
      text: "Design side: the empty-state skeleton is ready. If performance is the main blocker, I can keep visuals conservative until you hit 60fps.",
      timestamp: m(16),
    },
    {
      id: "demo-mobile-5",
      senderId: "user-marcus",
      recipientId: "user-alex",
      text: "Thanks — that helps. I’ll prioritize perf first, then we’ll iterate on the polish.",
      timestamp: m(19),
    },
    {
      id: "demo-mobile-6",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "For Owen’s update: if you can get to 60fps on Pixel 6 with a small set of changes, that’s a strong milestone.",
      timestamp: m(23),
    },
    {
      id: "demo-mobile-7",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Makes sense. I’ll report back after the next profiling run and we can decide whether to ship the partial mitigation.",
      timestamp: m(31),
    },
  ],

  "api-gateway": [
    {
      id: "demo-gateway-1",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "Envoy benchmark is ready for Monday review. P95 dropped from 45ms → 8ms in staging load tests. Biggest unknown is plugin migration effort.",
      timestamp: m(2),
      attachedContext: {
        topic: "API Gateway — Kong vs Envoy Benchmark",
        summary:
          "Envoy benchmarks at 8ms P95 vs Kong’s 45ms. Root causes: plugin chain + upstream DNS. Recommendation: migrate to Envoy with sidecar rate limiting.",
        openQuestions: [
          "Do we dual-run with a canary + allowlist for week 1?",
          "What’s the rollback time if we hit auth regressions?",
        ],
        sources: [
          {
            id: "note-api-gateway",
            title: "API Gateway — Kong vs Envoy Benchmark",
            type: "note",
            url: "/wiki/note-api-gateway",
          },
          {
            id: "note-gateway-release",
            title: "API Gateway Rollout — Release Notes (Draft)",
            type: "note",
            url: "/wiki/note-gateway-release",
          },
        ],
      },
    },
    {
      id: "demo-gateway-2",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "How risky are the auth plugins? Last Kong upgrade broke a couple edge routes.",
      timestamp: m(5),
    },
    {
      id: "demo-gateway-3",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "Auth is the riskiest. Proposal: dual-run with canary (1%) + per-route allowlist, then ramp. I’m drafting release notes that won’t overpromise.",
      timestamp: m(9),
    },
    {
      id: "demo-gateway-4",
      senderId: "user-jordan",
      recipientId: "user-sarah",
      text: "Please avoid “guaranteed latency.” “In staging load tests…” is fine, plus a short variability note.",
      timestamp: m(13),
    },
    {
      id: "demo-gateway-5",
      senderId: "user-sarah",
      recipientId: "user-jordan",
      text: "Done — updated to “In staging load tests, P95 improved from 45ms → 8ms” and added “results vary by workload.” Anything else off-limits?",
      timestamp: m(17),
    },
    {
      id: "demo-gateway-6",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Marketing wants a simple “what’s changing / why it matters” section. Can we keep it to 3 bullets?",
      timestamp: m(21),
    },
    {
      id: "demo-gateway-7",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Yep — 3 bullets: faster latency, new rate limiting architecture, DNS caching. I’ll keep dual-run details internal unless you want a public mention.",
      timestamp: m(24),
    },
    {
      id: "demo-gateway-8",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Cool. I’ll coordinate with Rina on train timing and keep allowlist tight for week 1.",
      timestamp: m(28),
    },
  ],

  "design-system": [
    {
      id: "demo-design-1",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Dark mode spec is finalized in Figma. Can your team update Style Dictionary tokens this sprint? Mobile needs them before wiring components.",
      timestamp: m(4),
      attachedContext: {
        topic: "Shared Design System — Cross-Platform Component Library",
        summary:
          "42-component library shared across web + mobile. Tokens synced from Figma via Style Dictionary; focus now is dark mode + RTL variants.",
        sources: [
          {
            id: "proj-design-system",
            title: "Shared Design System — Cross-Platform Component Library",
            type: "project",
            url: "/wiki/proj-design-system",
          },
        ],
      },
    },
    {
      id: "demo-design-2",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Yes — I’ll add it to sprint. Are RTL variants also ready, or just dark mode?",
      timestamp: m(8),
    },
    {
      id: "demo-design-3",
      senderId: "user-alex",
      recipientId: "user-sarah",
      text: "RTL is in progress, not finalized. Dark mode tokens are stable though — we can ship those first.",
      timestamp: m(12),
    },
    {
      id: "demo-design-4",
      senderId: "user-sarah",
      recipientId: "user-alex",
      text: "Great. I’ll scope: token sync + a small validation script to prevent drift. We’ll leave RTL until the spec is locked.",
      timestamp: m(16),
    },
    {
      id: "demo-design-5",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "If you can include accessibility contrast checks in CI, it’ll help when we flip themes.",
      timestamp: m(20),
    },
    {
      id: "demo-design-5b",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Quick review ask: we’re adding a small deferred-state pattern to the theme preview panel. I’m worried about stale UI (we’ve seen it before). There’s an open React issue about useDeferredValue getting stuck stale (facebook/react#35821) that’s a good sanity-check list: https://github.com/facebook/react/issues/35821",
      timestamp: m(22),
    },
    {
      id: "demo-design-6",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Will do. I’ll piggyback on existing CI steps so it’s not noisy.",
      timestamp: m(24),
    },
  ],

  onboarding: [
    {
      id: "demo-onboarding-1",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Onboarding A/B results: 34% lift in Day-7 activation. Pushing to ship to 100% next sprint. Can you confirm the API supports guided setup endpoints + resume state?",
      timestamp: m(30),
    },
    {
      id: "demo-onboarding-2",
      senderId: "user-sam",
      recipientId: "user-priya",
      text: "From customer calls: step 3 (Integrations) is still biggest drop-off. They don’t know what they’re committing to when they click connect.",
      timestamp: m(33),
    },
    {
      id: "demo-onboarding-3",
      senderId: "user-priya",
      recipientId: "user-sam",
      text: "Agree. We need clearer copy + a ‘skip for now’ that doesn’t feel like failure. Can you send 2 concrete customer quotes?",
      timestamp: m(36),
    },
    {
      id: "demo-onboarding-4",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "API side: I’ll add an endpoint for onboarding progress + a token to resume reliably. Attaching the onboarding doc so we keep metrics in view.",
      timestamp: m(39),
      attachedContext: {
        topic: "Customer Onboarding Redesign — Guided Setup Flow",
        summary:
          "New 5-step onboarding wizard. A/B test shows 34% Day-7 activation lift. Shipping to 100% next sprint; integrations step still highest drop-off.",
        openQuestions: [
          "Do we need an explicit ‘resume onboarding’ entry point on dashboard?",
          "What KPI do we target for step-3 completion after copy changes?",
        ],
        sources: [
          {
            id: "proj-customer-onboarding",
            title: "Customer Onboarding Redesign — Guided Setup Flow",
            type: "project",
            url: "/wiki/proj-customer-onboarding",
          },
          {
            id: "user-priya",
            title: "Priya Nair — Product Manager",
            type: "user",
            url: "/wiki/user-priya",
          },
        ],
      },
    },
    {
      id: "demo-onboarding-5",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Perfect — if we can land resume state this week, I’m comfortable flipping 100%.",
      timestamp: m(43),
    },
    {
      id: "demo-onboarding-6",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Yep. I’ll add metrics: step completion rate + time-to-complete so we can compare pre/post copy changes.",
      timestamp: m(47),
    },
    {
      id: "demo-onboarding-6b",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "One more thing: if we see ‘refetch on nav’ after the rollout, it may be a framework/cache key edge case. There’s an open Next.js issue about router cache misses when Link href includes search params (vercel/next.js#90008): https://github.com/vercel/next.js/issues/90008 — worth keeping in mind while we instrument step-to-step navigation.",
      timestamp: m(49),
    },
    {
      id: "demo-onboarding-7",
      senderId: "user-sam",
      recipientId: "user-sarah",
      text: "I’ll send quotes today. One theme: users want to know what data we’ll pull before connecting.",
      timestamp: m(51),
    },
  ],

  "incident-ops": [
    {
      id: "demo-incident-1",
      senderId: "user-diego",
      recipientId: "user-sarah",
      text: "Heads up: we saw another blip in API error rate during the reconciliation job. Not a full outage, but it’s a sign we still need pool limits + pagination.",
      timestamp: m(41),
    },
    {
      id: "demo-incident-2",
      senderId: "user-sarah",
      recipientId: "user-diego",
      text: "Agree. I can take pagination + a circuit breaker today. Can you link the Feb 18 postmortem so I reference the exact RCA language?",
      timestamp: m(44),
    },
    {
      id: "demo-incident-3",
      senderId: "user-diego",
      recipientId: "user-sarah",
      text: "Yep — attaching it. Also: we should add a per-service pool cap so one job can’t starve everyone else.",
      timestamp: m(47),
      attachedContext: {
        topic: "Incident Postmortem — Feb 18 API Outage (30 min)",
        summary:
          "30-min outage from DB pool exhaustion: billing reconciliation held 15 connections for 8+ minutes. Fix: paginate queries, per-service pool limits, and DB circuit breakers.",
        openQuestions: [
          "Do we need a separate pool for background jobs vs online traffic?",
          "What’s the cap per service (and how do we enforce it)?",
        ],
        sources: [
          {
            id: "note-incident-0218",
            title: "Incident Postmortem — Feb 18 API Outage (30 min)",
            type: "note",
            url: "/wiki/note-incident-0218",
          },
          {
            id: "user-diego",
            title: "Diego Alvarez — SRE / On-call Lead",
            type: "user",
            url: "/wiki/user-diego",
          },
        ],
      },
    },
    {
      id: "demo-incident-4",
      senderId: "user-sarah",
      recipientId: "user-diego",
      text: "Makes sense. I’ll propose: separate pools for background vs online, plus a hard cap for reconciliation.",
      timestamp: m(52),
    },
    {
      id: "demo-incident-5",
      senderId: "user-mei",
      recipientId: "user-sarah",
      text: "If you do separate pools, please make sure the backfill job uses the background pool with strict concurrency. We can set a default limiter.",
      timestamp: m(56),
    },
    {
      id: "demo-incident-6",
      senderId: "user-sarah",
      recipientId: "user-mei",
      text: "Yes — I’ll add explicit limits and a “fail fast” error that points to the runbook.",
      timestamp: m(60),
    },
    {
      id: "demo-incident-7",
      senderId: "user-diego",
      recipientId: "user-sarah",
      text: "Nice. If you can add metrics (pool utilization, queue depth, and breaker trips) it’ll help on-call.",
      timestamp: m(63),
    },
    {
      id: "demo-incident-8",
      senderId: "user-sarah",
      recipientId: "user-diego",
      text: "On it — will add dashboards + alerts with thresholds. I’ll post links in this channel when ready.",
      timestamp: m(68),
    },
  ],

  "security-review": [
    {
      id: "demo-sec-1",
      senderId: "user-leila",
      recipientId: "user-sarah",
      text: "Can you confirm the ownership-check middleware covers both invoices and invoice PDFs? The audit calls out IDOR specifically on the download route.",
      timestamp: m(58),
    },
    {
      id: "demo-sec-2",
      senderId: "user-sarah",
      recipientId: "user-leila",
      text: "Good catch. I’ll enforce at the resource-loader layer so both paths share it. Want a short threat model note in the PR?",
      timestamp: m(62),
    },
    {
      id: "demo-sec-3",
      senderId: "user-leila",
      recipientId: "user-sarah",
      text: "Yes please. Attaching audit summary so the PR references exact remediation language + deadline.",
      timestamp: m(66),
      attachedContext: {
        topic: "Q1 Security Audit — Critical Findings & Remediation",
        summary:
          "Pen test found 2 critical issues: JWTs remain valid after password reset and an IDOR on billing invoice endpoints. Remediation deadline: March 15.",
        openQuestions: [
          "Do we need a temporary feature flag for invoice download?",
          "Should we add an audit log entry for invoice access?",
        ],
        sources: [
          {
            id: "note-security-audit",
            title: "Q1 Security Audit — Critical Findings & Remediation",
            type: "note",
            url: "/wiki/note-security-audit",
          },
          {
            id: "user-leila",
            title: "Leila Hassan — Security Engineer",
            type: "user",
            url: "/wiki/user-leila",
          },
        ],
      },
    },
    {
      id: "demo-sec-4",
      senderId: "user-sarah",
      recipientId: "user-leila",
      text: "Will do — I’ll include attacker story + enforcement point. Also considering an audit log entry for invoice access; do you want that in scope?",
      timestamp: m(70),
    },
    {
      id: "demo-sec-5",
      senderId: "user-leila",
      recipientId: "user-sarah",
      text: "If it’s easy, yes. Otherwise leave it as a follow-up ticket with clear acceptance criteria.",
      timestamp: m(74),
    },
    {
      id: "demo-sec-6",
      senderId: "user-sarah",
      recipientId: "user-leila",
      text: "Got it. I’ll do a minimal structured log entry (invoiceId, viewerId, outcome) and keep payload small.",
      timestamp: m(78),
    },
  ],

  "release-train": [
    {
      id: "demo-release-1",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "Release train check: is the Envoy rollout note ready to publish? Jordan asked for one more legal-safe wording pass on the latency claim.",
      timestamp: m(72),
    },
    {
      id: "demo-release-2",
      senderId: "user-sarah",
      recipientId: "user-rina",
      text: "Yes — updating to ‘In staging load tests, P95 improved from 45ms → 8ms’ + a variability note. Attaching the draft release note.",
      timestamp: m(76),
      attachedContext: {
        topic: "API Gateway Rollout — Release Notes (Draft)",
        summary:
          "Customer-facing release notes for Kong → Envoy migration. Covers latency improvements, new rate-limiting, and DNS caching. Blocked on legal + marketing sign-off.",
        openQuestions: [
          "Do we need to describe the dual-run period publicly?",
          "Should rate limiting be opt-in initially?",
        ],
        sources: [
          {
            id: "note-gateway-release",
            title: "API Gateway Rollout — Release Notes (Draft)",
            type: "note",
            url: "/wiki/note-gateway-release",
          },
          {
            id: "note-api-gateway",
            title: "API Gateway — Kong vs Envoy Benchmark",
            type: "note",
            url: "/wiki/note-api-gateway",
          },
        ],
      },
    },
    {
      id: "demo-release-3",
      senderId: "user-jordan",
      recipientId: "user-sarah",
      text: "Looks good with that wording. Please add “results vary by workload” and avoid “guaranteed.”",
      timestamp: m(80),
    },
    {
      id: "demo-release-4",
      senderId: "user-sarah",
      recipientId: "user-jordan",
      text: "Added. Also trimmed the copy to keep it scannable.",
      timestamp: m(83),
    },
    {
      id: "demo-release-4b",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "FYI for the train: if someone reports CDN weirdness after upgrade, there’s an open Next.js issue about /_next/data responses missing Content-Length (vercel/next.js#90281): https://github.com/vercel/next.js/issues/90281. Not saying it’s us, but it’s an easy scapegoat — let’s keep our rollout checklist crisp.",
      timestamp: m(85),
    },
    {
      id: "demo-release-5",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "Thanks. Last thing: do we have a clearly documented rollback procedure linked from the checklist?",
      timestamp: m(86),
    },
    {
      id: "demo-release-6",
      senderId: "user-sarah",
      recipientId: "user-rina",
      text: "Yes — linking the 5-minute switchback runbook and adding canary ramp steps (1% → 10% → 50% → 100%).",
      timestamp: m(89),
    },
    {
      id: "demo-release-7",
      senderId: "user-priya",
      recipientId: "user-rina",
      text: "+1. I’ll align marketing on publish date once legal is done.",
      timestamp: m(93),
    },
  ],

  "qa-triage": [
    {
      id: "demo-qa-1",
      senderId: "user-nina",
      recipientId: "user-sarah",
      text: "Do you have 15 minutes to look at a flaky billing test? It passes locally but times out in CI. I suspect DB pool contention.",
      timestamp: m(46),
    },
    {
      id: "demo-qa-2",
      senderId: "user-sarah",
      recipientId: "user-nina",
      text: "Yes — if the test runner shares a pool with integration jobs, timeouts will be random. Let’s capture pool metrics during the run.",
      timestamp: m(49),
    },
    {
      id: "demo-qa-3",
      senderId: "user-nina",
      recipientId: "user-sarah",
      text: "Also, builds are still slow — 22 minutes average. Any chance we can parallelize integration tests?",
      timestamp: m(53),
    },
    {
      id: "demo-qa-4",
      senderId: "user-sarah",
      recipientId: "user-nina",
      text: "Yes — test shards + caching should cut it down. Attaching the CI note so we reference the baseline.",
      timestamp: m(57),
      attachedContext: {
        topic: "CI/CD Pipeline — Build Time Optimization",
        summary:
          "CI averages 22 minutes. Target under 8 via parallel test shards, dependency caching, and a persistent test DB. Biggest win: GitHub Actions matrix.",
        sources: [
          {
            id: "note-cicd",
            title: "CI/CD Pipeline — Build Time Optimization",
            type: "note",
            url: "/wiki/note-cicd",
          },
        ],
      },
    },
    {
      id: "demo-qa-5",
      senderId: "user-nina",
      recipientId: "user-sarah",
      text: "Perfect. If you can land the matrix + a stable test DB, I’ll take ownership of flake tracking weekly.",
      timestamp: m(61),
    },
    {
      id: "demo-qa-6",
      senderId: "user-sarah",
      recipientId: "user-nina",
      text: "Deal. I’ll post PRs in this channel so you can review the test changes.",
      timestamp: m(65),
    },
  ],

  "eng-leadership": [
    {
      id: "demo-lead-1",
      senderId: "user-owen",
      recipientId: "user-sarah",
      text: "Need a quick summary for the weekly update: platform migration status + anything at risk.",
      timestamp: m(38),
    },
    {
      id: "demo-lead-2",
      senderId: "user-sarah",
      recipientId: "user-owen",
      text: "Auth extraction complete. Billing extraction is in dual-write/backfill planning; critical risks are DB pool saturation and rollback readiness. Mitigations: throttle + staged cutover.",
      timestamp: m(42),
    },
    {
      id: "demo-lead-3",
      senderId: "user-priya",
      recipientId: "user-owen",
      text: "Onboarding redesign looks strong (34% Day-7 activation lift). Planning 100% rollout next sprint.",
      timestamp: m(48),
    },
    {
      id: "demo-lead-4",
      senderId: "user-owen",
      recipientId: "user-priya",
      text: "Great — please include a note on “integration step” risk and mitigation.",
      timestamp: m(55),
    },
    {
      id: "demo-lead-5",
      senderId: "user-sarah",
      recipientId: "user-owen",
      text: "Gateway migration is tracking. We’re recommending opt-in rate limiting week 1 with allowlist, then flip default after metrics look good.",
      timestamp: m(59),
    },
    {
      id: "demo-lead-6",
      senderId: "user-owen",
      recipientId: "user-sarah",
      text: "Perfect. Keep it crisp and include the rollback story — leadership cares about “how do we undo it?”",
      timestamp: m(67),
    },
    {
      id: "demo-lead-7",
      senderId: "user-sarah",
      recipientId: "user-owen",
      text: "Will do — I’ll explicitly call out the 5-minute switchback for the gateway and the staged cutover plan for billing.",
      timestamp: m(71),
    },
  ],
};

export const DIRECT_MESSAGES: Record<string, Message[]> = {
  "user-marcus": [
    {
      id: "dm-marcus-1",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Heads up: mobile perf is still borderline. If backend can reduce payload size on transactions, it’ll help scroll.",
      timestamp: m(20),
    },
    {
      id: "dm-marcus-2",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "I can add a “thin” transactions endpoint (fields + pagination) and gate it behind a feature flag for v2.",
      timestamp: m(27),
    },
    {
      id: "dm-marcus-3",
      senderId: "user-marcus",
      recipientId: "user-sarah",
      text: "Perfect. If we can cut JSON size by ~30%, it’ll reduce GC pressure during refresh.",
      timestamp: m(32),
    },
    {
      id: "dm-marcus-4",
      senderId: "user-sarah",
      recipientId: "user-marcus",
      text: "Send me the heaviest response + what fields you actually need and I’ll shape the endpoint.",
      timestamp: m(36),
    },
  ],
  "user-priya": [
    {
      id: "dm-priya-1",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Quick Q: can the onboarding wizard resume without storing state client-side? I’d rather not rely on localStorage.",
      timestamp: m(28),
    },
    {
      id: "dm-priya-2",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Yes — store progress server-side keyed by accountId + an idempotency token. Client just fetches the latest step.",
      timestamp: m(35),
    },
    {
      id: "dm-priya-3",
      senderId: "user-priya",
      recipientId: "user-sarah",
      text: "Great. If you can also log step timing, I’ll use it to validate copy changes.",
      timestamp: m(40),
    },
    {
      id: "dm-priya-4",
      senderId: "user-sarah",
      recipientId: "user-priya",
      text: "Will do — step start/end timestamps + completion outcome.",
      timestamp: m(45),
    },
  ],
  "user-diego": [
    {
      id: "dm-diego-1",
      senderId: "user-diego",
      recipientId: "user-sarah",
      text: "Can we please make the incident action items measurable? Last postmortem had “improve reliability” with no concrete targets.",
      timestamp: m(50),
    },
    {
      id: "dm-diego-2",
      senderId: "user-sarah",
      recipientId: "user-diego",
      text: "Agree — writing: pagination shipped, per-service pool caps enforced, circuit breaker fails fast with a clear error. Plus dashboards + alerts.",
      timestamp: m(54),
    },
    {
      id: "dm-diego-3",
      senderId: "user-diego",
      recipientId: "user-sarah",
      text: "+1. Also consider splitting background jobs onto a separate pool so they can’t starve online traffic.",
      timestamp: m(58),
    },
    {
      id: "dm-diego-4",
      senderId: "user-sarah",
      recipientId: "user-diego",
      text: "Yes — I’ll propose that in the design doc and tie it to the Feb 18 incident data.",
      timestamp: m(61),
    },
  ],
  "user-mei": [
    {
      id: "dm-mei-1",
      senderId: "user-mei",
      recipientId: "user-sarah",
      text: "For billing backfill: what’s the acceptable replication lag threshold before we pause writes?",
      timestamp: m(12),
    },
    {
      id: "dm-mei-2",
      senderId: "user-sarah",
      recipientId: "user-mei",
      text: "Let’s define it explicitly: if lag > X seconds for Y minutes, pause backfill and keep dual-write only. We’ll pick X/Y with data.",
      timestamp: m(16),
    },
    {
      id: "dm-mei-3",
      senderId: "user-mei",
      recipientId: "user-sarah",
      text: "Perfect. I’ll draft a runbook section with knobs + clear “pause / resume” steps.",
      timestamp: m(21),
    },
    {
      id: "dm-mei-4",
      senderId: "user-sarah",
      recipientId: "user-mei",
      text: "Thanks — please include “how to validate data parity” checks too.",
      timestamp: m(26),
    },
  ],
  "user-alex": [
    {
      id: "dm-alex-1",
      senderId: "user-alex",
      recipientId: "user-sarah",
      text: "Design system question: should tokens ship as a package so apps can pin versions?",
      timestamp: m(6),
    },
    {
      id: "dm-alex-2",
      senderId: "user-sarah",
      recipientId: "user-alex",
      text: "Yes — publish tokens as a package and pin per app. If you send the token pipeline doc, I’ll reference constraints in the implementation plan.",
      timestamp: m(11),
    },
    {
      id: "dm-alex-3",
      senderId: "user-alex",
      recipientId: "user-sarah",
      text: "Great. I’ll keep the naming scheme stable so downstream diffs are clean.",
      timestamp: m(17),
    },
  ],
  "user-rina": [
    {
      id: "dm-rina-1",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "I’m updating the release checklist — can you add rollback runbook links and canary ramp steps for the gateway rollout?",
      timestamp: m(70),
    },
    {
      id: "dm-rina-2",
      senderId: "user-sarah",
      recipientId: "user-rina",
      text: "Understood. I’ll add the rollback runbook link + a 5-minute switchback procedure, plus canary ramp steps.",
      timestamp: m(74),
    },
    {
      id: "dm-rina-3",
      senderId: "user-rina",
      recipientId: "user-sarah",
      text: "Thanks — once that’s in, I’m comfortable going live with allowlist-only week 1.",
      timestamp: m(79),
    },
  ],
  "user-jordan": [
    {
      id: "dm-jordan-1",
      senderId: "user-jordan",
      recipientId: "user-sarah",
      text: "I’m fine with “load-test results” but not “guaranteed latency.” Can you tweak the release note so it’s clearly test-environment data?",
      timestamp: m(66),
    },
    {
      id: "dm-jordan-2",
      senderId: "user-sarah",
      recipientId: "user-jordan",
      text: "Yep — changing to “In staging load tests, P95 improved from 45ms → 8ms” and adding “results vary.” Anything else you want avoided?",
      timestamp: m(69),
    },
    {
      id: "dm-jordan-3",
      senderId: "user-jordan",
      recipientId: "user-sarah",
      text: "That’s perfect. Also avoid implying the change is “instant” — safer to say “expected to improve.”",
      timestamp: m(73),
    },
  ],
  "user-sam": [
    {
      id: "dm-sam-1",
      senderId: "user-sam",
      recipientId: "user-sarah",
      text: "Customer escalation: ACME says onboarding step 3 is confusing and they’re stuck. Any quick fix we can ship with the 100% rollout?",
      timestamp: m(34),
    },
    {
      id: "dm-sam-2",
      senderId: "user-sarah",
      recipientId: "user-sam",
      text: "If we add “skip for now” + clearer explanation of what the integration enables, that reduces friction without a full redesign.",
      timestamp: m(37),
    },
    {
      id: "dm-sam-3",
      senderId: "user-sam",
      recipientId: "user-sarah",
      text: "Agree. I’ll send 2 customer quotes and a proposed tooltip copy.",
      timestamp: m(41),
    },
  ],
  "user-nina": [
    {
      id: "dm-nina-1",
      senderId: "user-nina",
      recipientId: "user-sarah",
      text: "Do you have 15 min to look at a flaky billing test? It passes locally but times out in CI.",
      timestamp: m(46),
    },
    {
      id: "dm-nina-2",
      senderId: "user-sarah",
      recipientId: "user-nina",
      text: "Yes — if the test runner shares the same pool as integration jobs, timeouts will be random. Let’s capture pool metrics during the run.",
      timestamp: m(49),
    },
    {
      id: "dm-nina-3",
      senderId: "user-nina",
      recipientId: "user-sarah",
      text: "If you can add a tiny retry budget + better error logs, it’ll reduce triage time.",
      timestamp: m(55),
    },
  ],
  "user-owen": [
    {
      id: "dm-owen-1",
      senderId: "user-owen",
      recipientId: "user-sarah",
      text: "Do you have a 2-sentence exec summary on platform migration status? I’m writing the weekly update.",
      timestamp: m(38),
    },
    {
      id: "dm-owen-2",
      senderId: "user-sarah",
      recipientId: "user-owen",
      text: "Auth extraction complete; Billing extraction is in dual-write/backfill planning and is the critical path. Risk mitigated via staged cutover + explicit rollback.",
      timestamp: m(42),
    },
    {
      id: "dm-owen-3",
      senderId: "user-owen",
      recipientId: "user-sarah",
      text: "Perfect — add one concrete metric we’ll watch during backfill.",
      timestamp: m(47),
    },
  ],
  "user-leila": [
    {
      id: "dm-leila-1",
      senderId: "user-leila",
      recipientId: "user-sarah",
      text: "If you can include a short threat model in the IDOR fix PR, it’ll speed up security sign-off. Audit deadline is March 15.",
      timestamp: m(60),
    },
    {
      id: "dm-leila-2",
      senderId: "user-sarah",
      recipientId: "user-leila",
      text: "Will do. I’ll include attacker story + enforcement point. Also considering an audit log entry for invoice access — do you want that in scope?",
      timestamp: m(64),
    },
    {
      id: "dm-leila-3",
      senderId: "user-leila",
      recipientId: "user-sarah",
      text: "Yes if easy; otherwise ticket it. Main thing is ownership checks are consistent for JSON + PDF paths.",
      timestamp: m(68),
    },
  ],
};

export function getChannelById(channelId: string): DemoChannel | undefined {
  return CHANNELS.find((channel) => channel.id === channelId);
}