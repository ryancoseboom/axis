"use client";

import Link from "next/link";
import { useState } from "react";
import { buildUserContextFromSetup, sampleRyanSetup } from "@/axis/setup";
import {
  buildSetupConfirmationSummary,
  buildSetupKnowledgeReview,
  type PillarKnowledgeReview,
  type SetupConfirmationSummary
} from "@/axis/setupPresentation";
import { confirmSetupForToday } from "@/axis/setupHandoff";
import styles from "./setup.module.css";

export default function SetupPage() {
  const [confirmed, setConfirmed] = useState(false);
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const pillars = context.pillarMemory?.pillars ?? [];
  const programs = context.pillarMemory?.programs ?? [];
  const knowledgeReview = buildSetupKnowledgeReview(sampleRyanSetup);
  const confirmationSummary = buildSetupConfirmationSummary(sampleRyanSetup);

  function confirmStartingProfile() {
    confirmSetupForToday(sampleRyanSetup);
    setConfirmed(true);
  }

  return (
    <main className={styles.page}>
      <section className={styles.header} aria-labelledby="setup-title">
        <p className={styles.kicker}>Setup</p>
        <h1 id="setup-title">The foundation Axis reasons from.</h1>
        <p>{sampleRyanSetup.identityProfile.desiredIdentityStatement}</p>
      </section>

      <section className={styles.band} aria-labelledby="identity-title">
        <div>
          <p className={styles.label}>Identity</p>
          <h2 id="identity-title">Values and non-negotiables</h2>
        </div>
        <div className={styles.listGrid}>
          <SetupList title="Values" items={sampleRyanSetup.identityProfile.values} />
          <SetupList title="Non-negotiables" items={sampleRyanSetup.identityProfile.nonNegotiables} />
          <SetupList title="Aspirations" items={sampleRyanSetup.identityProfile.longTermAspirations} />
        </div>
      </section>

      <section className={styles.band} aria-labelledby="pillars-title">
        <div>
          <p className={styles.label}>Pillars</p>
          <h2 id="pillars-title">Active areas of development</h2>
        </div>
        <div className={styles.pillars}>
          {pillars.map((pillar) => (
            <article key={pillar.id} className={styles.pillar}>
              <div>
                <h3>{pillar.name}</h3>
                <p>{pillar.description}</p>
              </div>
              <dl>
                <div>
                  <dt>Priority</dt>
                  <dd>{pillar.priority}</dd>
                </div>
                <div>
                  <dt>Concepts</dt>
                  <dd>{pillar.knowledgeMap.nodes.length}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.band} aria-labelledby="programs-title">
        <div>
          <p className={styles.label}>Programs</p>
          <h2 id="programs-title">Structured routines</h2>
        </div>
        <div className={styles.summaryRows}>
          {programs.map((program) => (
            <div key={program.id} className={styles.summaryRow}>
              <span>{program.name}</span>
              <span>{program.days.length} days</span>
            </div>
          ))}
          <div className={styles.summaryRow}>
            <span>Calendar</span>
            <span>{sampleRyanSetup.calendar.preferredProvider} / {sampleRyanSetup.calendar.importStatus}</span>
          </div>
        </div>
      </section>

      <section className={styles.band} aria-labelledby="knowledge-title">
        <div>
          <p className={styles.label}>Knowledge</p>
          <h2 id="knowledge-title">What Axis thinks you already know</h2>
        </div>
        <div className={styles.knowledgeReview}>
          <p className={styles.reviewIntro}>This is the starting point Axis will reason from. It is not a score, and it is not permanent.</p>
          {knowledgeReview.map((pillar) => (
            <KnowledgeReviewCard key={pillar.pillarName} review={pillar} />
          ))}
        </div>
      </section>

      <section className={styles.confirmationBand} aria-labelledby="confirmation-title">
        <div>
          <p className={styles.label}>Confirm</p>
          <h2 id="confirmation-title">Set this as the starting profile</h2>
        </div>
        <div className={styles.confirmationPanel}>
          {!confirmed ? (
            <>
              <p>This will let Axis reason from this setup in the local shell. Nothing is saved yet.</p>
              <button className={styles.primaryAction} type="button" onClick={confirmStartingProfile}>
                Use this as my starting profile
              </button>
            </>
          ) : (
            <ConfirmationSummary summary={confirmationSummary} />
          )}
        </div>
      </section>
    </main>
  );
}

function SetupList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.setupList}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function KnowledgeReviewCard({ review }: { review: PillarKnowledgeReview }) {
  const contextLine = [review.domainName, review.currentLevel, review.credential].filter(Boolean).join(" / ");

  return (
    <article className={styles.reviewCard}>
      <header>
        <h3>{review.pillarName}</h3>
        <p>{contextLine}</p>
      </header>
      {review.groups.length > 0 ? (
        <div className={styles.stateGroups}>
          {review.groups.map((group) => (
            <div key={group.status} className={styles.stateGroup}>
              <p>{group.label}</p>
              <ul>
                {group.concepts.map((concept) => (
                  <li key={concept}>{concept}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyReview}>Axis does not have enough setup evidence here yet.</p>
      )}
    </article>
  );
}

function ConfirmationSummary({ summary }: { summary: SetupConfirmationSummary }) {
  return (
    <div className={styles.confirmedState}>
      <div>
        <p className={styles.confirmedEyebrow}>Starting profile is ready</p>
        <p className={styles.identityLine}>{summary.identityStatement}</p>
      </div>

      <div className={styles.confirmationGrid}>
        <ConfirmationList title="Active pillars" items={summary.activePillars.map((pillar) => pillar.pillarName)} />
        <ConfirmationList title="Domains Axis will use" items={summary.attachedDomains.map((domain) => `${domain.domainName} for ${domain.pillarName}`)} />
        <ConfirmationList
          title="Programs and routines"
          items={[
            ...summary.activePrograms.map((program) => [program.name, program.cadence].filter(Boolean).join(" / ")),
            ...summary.activeRoutines.map((routine) => `${routine.name} / ${routine.cadence}`)
          ]}
        />
        <ConfirmationList
          title="Calendar"
          items={[`${summary.calendar.preferredProvider} / ${summary.calendar.importStatus}`]}
        />
      </div>

      <Link className={styles.todayLink} href="/today">Continue to Today</Link>
    </div>
  );
}

function ConfirmationList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.confirmationList}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Nothing active yet.</p>
      )}
    </div>
  );
}
