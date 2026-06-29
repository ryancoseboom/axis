"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildTodayCapturedShellOptions,
  buildTodayCapturedShellSummaryLines,
  submitTodayCapturedShellObservations,
  type TodayCapturedShellAction,
  type TodayCapturedShellResult
} from "@/axis/todayCapturedShell";
import styles from "./captured.module.css";

export default function CapturedDevPage() {
  const [note, setNote] = useState("");
  const [result, setResult] = useState<TodayCapturedShellResult | undefined>();
  const options = useMemo(() => buildTodayCapturedShellOptions(), []);
  const [selectedActions, setSelectedActions] = useState<Set<TodayCapturedShellAction>>(() => new Set(options.filter((option) => option.selected).map((option) => option.action)));
  const summaryLines = useMemo(() => result ? buildTodayCapturedShellSummaryLines(result.summary) : [], [result]);

  function toggleAction(action: TodayCapturedShellAction) {
    setSelectedActions((current) => {
      const next = new Set(current);

      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }

      return next;
    });
  }

  function submitSelected() {
    setResult(submitTodayCapturedShellObservations({
      actions: [...selectedActions],
      note: note.trim() || undefined
    }));
  }

  return (
    <main className={styles.page}>
      <section className={styles.header} aria-labelledby="captured-title">
        <p className={styles.kicker}>Dev / Today Captured</p>
        <h1 id="captured-title">Record what actually happened.</h1>
        <p>This local shell updates the in-memory context only. A refresh clears it.</p>
      </section>

      <section className={styles.captureBand} aria-labelledby="observations-title">
        <div>
          <p className={styles.label}>Observations</p>
          <h2 id="observations-title">Structured evidence</h2>
        </div>

        <label className={styles.noteField}>
          <span>Optional note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="A sentence is enough."
          />
        </label>

        <div className={styles.actionList}>
          {options.map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() => toggleAction(item.action)}
              className={styles.captureAction}
              data-selected={selectedActions.has(item.action)}
              aria-pressed={selectedActions.has(item.action)}
            >
              <span>{item.label}</span>
              <span>{item.reason ?? item.description}</span>
            </button>
          ))}
        </div>
        <button className={styles.submitCapture} type="button" onClick={submitSelected}>
          Capture selected observations
        </button>
      </section>

      <section className={styles.summaryBand} aria-labelledby="summary-title">
        <div>
          <p className={styles.label}>Summary</p>
          <h2 id="summary-title">What Axis can carry forward</h2>
        </div>

        {result ? (
          <div className={styles.summary}>
            <SummaryGroup title="What moved forward" items={result.summary.whatMovedForward} />
            <SummaryGroup title="What was missed" items={result.summary.whatWasMissed} />
            <SummaryGroup title="What may matter tomorrow" items={result.summary.whatMayMatterTomorrow} />
            {summaryLines.length === 0 ? <p className={styles.empty}>The observation was captured as evidence.</p> : null}
            <Link className={styles.todayLink} href="/today">Generate the next Today from this context</Link>
          </div>
        ) : (
          <p className={styles.empty}>Capture one observation to see the local summary.</p>
        )}
      </section>
    </main>
  );
}

function SummaryGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.summaryGroup}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Nothing to show here yet.</p>
      )}
    </div>
  );
}
