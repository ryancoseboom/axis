import { buildUserContextFromSetup, sampleRyanSetup } from "@/axis/setup";
import { buildSetupKnowledgeReview, type PillarKnowledgeReview } from "@/axis/setupPresentation";
import styles from "./setup.module.css";

export default function SetupPage() {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const pillars = context.pillarMemory?.pillars ?? [];
  const programs = context.pillarMemory?.programs ?? [];
  const knowledgeReview = buildSetupKnowledgeReview(sampleRyanSetup);

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
