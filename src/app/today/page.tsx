"use client";

import { FormEvent, useMemo, useState } from "react";
import { generateToday } from "@/axis/engine";
import { morningInputToUserContext, parseFocusWindowPhrase, parseMorningLines, type MorningInput } from "@/axis/morningInput";
import { sampleRyanContext } from "@/axis/sampleRyanContext";
import { clearConfirmedSetupContext, getConfirmedSetupContext, setupContextIndicatorText } from "@/axis/setupHandoff";
import { buildAdjustAlternatives, buildBecausePresentation, type AdjustAlternative } from "@/axis/todayPresentation";
import type { TimelineItem, UserContext } from "@/axis/types";
import styles from "./today.module.css";

type TodayMode = "morning" | "now";
type TodaySource = { kind: "input"; input: MorningInput } | { kind: "demo" } | { kind: "setup"; context: UserContext };

type MorningDraft = {
  mainIntention: string;
  commitments: string;
  uninterruptedTime: string;
};

const emptyDraft: MorningDraft = {
  mainIntention: "",
  commitments: "",
  uninterruptedTime: ""
};

export default function TodayPage() {
  const [mode, setMode] = useState<TodayMode>("morning");
  const [showAdjust, setShowAdjust] = useState(false);
  const [preferredDecisionId, setPreferredDecisionId] = useState<string | undefined>();
  const [source, setSource] = useState<TodaySource | undefined>(() => {
    const setupContext = getConfirmedSetupContext();
    return setupContext ? { kind: "setup", context: setupContext } : undefined;
  });
  const [draft, setDraft] = useState<MorningDraft>(emptyDraft);
  const userContext = useMemo(() => {
    if (!source) {
      return undefined;
    }

    if (source.kind === "setup") return source.context;
    return source.kind === "demo" ? sampleRyanContext : morningInputToUserContext(source.input);
  }, [source]);
  const today = useMemo(() => (userContext ? generateToday(userContext, { preferredDecisionId }) : undefined), [userContext, preferredDecisionId]);
  const because = useMemo(() => (today ? buildBecausePresentation(today) : undefined), [today]);
  const adjustAlternatives = useMemo(() => (today ? buildAdjustAlternatives(today) : []), [today]);
  const setupContextIndicator = source?.kind === "setup" ? setupContextIndicatorText(source.context) : undefined;

  function updateDraft(field: keyof MorningDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetGeneratedState() {
    setPreferredDecisionId(undefined);
    setShowAdjust(false);
    setMode("morning");
  }

  function submitMorning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearConfirmedSetupContext();
    resetGeneratedState();
    setSource({ kind: "input", input: draftToMorningInput(draft) });
  }

  function useSampleThursday() {
    clearConfirmedSetupContext();
    resetGeneratedState();
    setSource({ kind: "demo" });
  }

  function editInputs() {
    clearConfirmedSetupContext();
    resetGeneratedState();
    setSource(undefined);
  }

  if (!today || !because) {
    return <MorningInputSurface draft={draft} onChange={updateDraft} onSubmit={submitMorning} onUseSample={useSampleThursday} />;
  }

  const now = today.protectedSession;
  const next = today.timeline.find((item) => item.time > now.preferredWindow.end);
  const isAdjusted = Boolean(preferredDecisionId);

  // This is the whole Morning -> Begin -> Now threshold for Version Zero.
  // It is intentionally local UI state: Morning is for choosing; Now is for doing.
  function beginToday() {
    setShowAdjust(false);
    setMode("now");
  }

  // Version Zero does not persist completion or alter the computed Today.
  // These actions simply let the user leave Now mode and review or adjust the day.
  function returnToMorning() {
    setShowAdjust(false);
    setMode("morning");
  }

  function toggleAdjust() {
    setShowAdjust((current) => !current);
  }

  function selectAlternative(alternative: AdjustAlternative) {
    setPreferredDecisionId(alternative.sourceDecisionId);
    setShowAdjust(false);
  }

  function restoreAxisRecommendation() {
    setPreferredDecisionId(undefined);
    setShowAdjust(false);
  }

  if (mode === "now") {
    return (
      <main className={`${styles.page} ${styles.nowMode}`}>
        <section className={styles.focus} aria-labelledby="focus-title">
          <p className={styles.kicker}>Now</p>
          <time>{now.preferredWindow.start}-{now.preferredWindow.end}</time>
          <h1 id="focus-title">{now.title}</h1>
          <p>Protects {now.protects}</p>
          {isAdjusted ? <p className={styles.adjustedNote}>Adjusted for today.</p> : null}
          <div className={styles.focusActions}>
            <button className={styles.doneButton} type="button" onClick={returnToMorning}>
              Done
            </button>
            <button className={styles.adjustButton} type="button" onClick={toggleAdjust} aria-expanded={showAdjust}>
              Adjust
            </button>
            {isAdjusted ? (
              <button className={styles.restoreButton} type="button" onClick={restoreAxisRecommendation}>
                Restore Axis recommendation
              </button>
            ) : null}
          </div>
          {showAdjust ? <AdjustAlternatives alternatives={adjustAlternatives} onSelect={selectAlternative} /> : null}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.header} aria-labelledby="today-title">
        <div className={styles.headerRow}>
          <p className={styles.kicker}>Today</p>
          <button className={styles.editInputsButton} type="button" onClick={editInputs}>
            {setupContextIndicator ? "Use Morning input instead" : "Edit inputs"}
          </button>
        </div>
        <h1 id="today-title">{today.theme}</h1>
        {setupContextIndicator ? <p className={styles.contextNote}>{setupContextIndicator}</p> : null}
      </section>

      <section className={styles.now} aria-labelledby="now-title">
        <div className={styles.nowMeta}>
          <p className={styles.label}>Now</p>
          <time>{now.preferredWindow.start}-{now.preferredWindow.end}</time>
        </div>
        <div className={styles.nowBody}>
          <h2 id="now-title">{now.title}</h2>
          <p>Protects {now.protects}</p>
          <button className={styles.beginButton} type="button" onClick={beginToday}>
            Begin today
          </button>
        </div>
      </section>

      <section className={styles.nextProtected} aria-label="Next and protected session">
        <div>
          <p className={styles.label}>Next</p>
          <h2>{next?.title ?? "Keep the protected session clear"}</h2>
          <p>{next ? `${next.time} / Protects ${next.protects}` : "Stay with the work."}</p>
        </div>
        <div>
          <p className={styles.label}>Protected Session</p>
          <h2>{today.protectedSession.title}</h2>
          <p>{today.protectedSession.evidence.join(" / ")}</p>
        </div>
      </section>

      <section className={styles.timeline} aria-labelledby="timeline-title">
        <div className={styles.sectionHeading}>
          <p className={styles.label}>Timeline</p>
          <h2 id="timeline-title">Quiet order for the day</h2>
        </div>
        <ol>
          {today.timeline.map((item) => (
            <TimelineRow key={`${item.time}-${item.title}`} item={item} />
          ))}
        </ol>
      </section>

      <details className={styles.reasoning}>
        <summary>
          <span>Because</span>
          <span>{today.confidence}% confidence</span>
        </summary>
        <ul>
          <li>{because.explanation}</li>
          <li className={styles.confidenceReason}>{because.confidenceLine}</li>
        </ul>
      </details>
    </main>
  );
}

function MorningInputSurface({
  draft,
  onChange,
  onSubmit,
  onUseSample
}: {
  draft: MorningDraft;
  onChange: (field: keyof MorningDraft, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseSample: () => void;
}) {
  const hasCommitments = parseMorningLines(draft.commitments).length > 0;
  const hasFocusOverride = draft.uninterruptedTime.trim().length > 0;

  return (
    <main className={`${styles.page} ${styles.inputPage}`}>
      <section className={`${styles.header} ${styles.morningHeader}`} aria-labelledby="morning-title">
        <p className={styles.kicker}>Morning</p>
        <h1 id="morning-title">What would you regret not protecting today?</h1>
      </section>
      <form className={styles.morningConversation} onSubmit={onSubmit}>
        <label className={`${styles.field} ${styles.primaryQuestion}`}>
          <span>The thing that matters</span>
          <textarea
            value={draft.mainIntention}
            onChange={(event) => onChange("mainIntention", event.target.value)}
            placeholder="A sentence is enough."
            rows={3}
          />
        </label>

        <div className={styles.realityBlock}>
          <p className={styles.realityIntro}>Then, reality.</p>
          <label className={styles.field}>
            <span>What already has a claim on the day?</span>
            <textarea
              value={draft.commitments}
              onChange={(event) => onChange("commitments", event.target.value)}
              placeholder="Meetings, calls, promises. One per line if there are several."
              rows={3}
            />
          </label>
          {hasCommitments ? (
            <details className={styles.overrideFocus} open={hasFocusOverride}>
              <summary>Use a different focus window</summary>
              <label className={styles.field}>
                <span>Optional override</span>
                <input
                  value={draft.uninterruptedTime}
                  onChange={(event) => onChange("uninterruptedTime", event.target.value)}
                  placeholder="9:00-10:30 is enough."
                />
              </label>
            </details>
          ) : (
            <label className={styles.field}>
              <span>Uninterrupted time, if you know it</span>
              <input
                value={draft.uninterruptedTime}
                onChange={(event) => onChange("uninterruptedTime", event.target.value)}
                placeholder="Optional. Axis can infer this later."
              />
            </label>
          )}
        </div>

        <div className={styles.inputActions}>
          <button className={styles.beginButton} type="submit">
            Generate Today
          </button>
          <button className={styles.editInputsButton} type="button" onClick={onUseSample}>
            Open sample Thursday
          </button>
        </div>
      </form>
    </main>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  return (
    <li className={styles.timelineRow} data-kind={item.kind}>
      <time>{item.time}</time>
      <div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <p className={styles.protects}>Protects {item.protects}</p>
      </div>
    </li>
  );
}

function AdjustAlternatives({
  alternatives,
  onSelect
}: {
  alternatives: AdjustAlternative[];
  onSelect: (alternative: AdjustAlternative) => void;
}) {
  if (alternatives.length === 0) {
    return <p className={styles.adjustNote}>No better grounded alternative is available right now.</p>;
  }

  return (
    <div className={styles.adjustPanel} aria-label="Grounded alternatives">
      <p>Grounded alternatives</p>
      <ol>
        {alternatives.map((alternative) => (
          <li key={alternative.id}>
            <button type="button" onClick={() => onSelect(alternative)}>
              <span>{alternative.title}</span>
              <small>{alternative.detail}</small>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function draftToMorningInput(draft: MorningDraft): MorningInput {
  return {
    mainIntention: draft.mainIntention,
    commitments: parseMorningLines(draft.commitments),
    focusWindow: parseFocusWindowPhrase(draft.uninterruptedTime)
  };
}
