import type { Metadata } from "next";
import { TierGate } from "@/components/tier-gate";
import { PracticeView } from "./practice-view";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <TierGate
      feature="practice"
      variant="page"
      title="The Practice section"
      blurb="Guides, hoverable key terms, worked examples, and the Math Gym — everything you need to prep for technicals."
      perks={[
        "Finance & consulting interview guides",
        "Hoverable key-term glossary with simple/detailed depths",
        "Worked examples that walk the math",
        "Math Gym: timed drills, big numbers, word problems & exhibit tables",
      ]}
    >
      <PracticeView />
    </TierGate>
  );
}
