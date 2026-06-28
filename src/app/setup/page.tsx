import { buildUserContextFromSetup, sampleRyanSetup } from "@/axis/setup";
import styles from "./setup.module.css";

export default function SetupPage() {
  const context = buildUserContextFromSetup(sampleRyanSetup);
  const pillars = context.pillarMemory?.pillars ?? [];
  const programs = context.pillarMemory?.programs ?? [];

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
