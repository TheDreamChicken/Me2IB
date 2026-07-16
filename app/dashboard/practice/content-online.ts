// Online interview (HireVue & friends) prep content. Static, no DB.

import type { PracticeItem } from "./content";

export const ONLINE_ITEMS: PracticeItem[] = [
  {
    question: "What actually happens in a one-way video interview.",
    answer: [
      {
        type: "p",
        text: "A one-way (HireVue-style) interview is you, your webcam, and a question on a screen — no human on the other end. Firms use it to screen thousands of applicants before anyone spends live interview time on you.",
      },
      {
        type: "list",
        items: [
          "**The format:** a question appears as text or a pre-recorded clip, you get **~30 seconds to think** and **1–3 minutes to answer**, usually 3–6 questions total. Some setups allow one retake per question; many allow none — check before you start.",
          "**Who's watching:** sometimes a recruiter skimming at 2x speed; sometimes software scores it first — pace, structure, word choice — before any human presses play. Assume both.",
          "**What they ask:** overwhelmingly the classics — tell me about yourself, why this firm, why this role, a teamwork or leadership story, a failure story. Occasionally a light technical or \"react to this scenario.\"",
          "**The honest part:** talking to a lens feels weird for everyone. The awkwardness you feel is far less visible on the recording than it seems in the moment — structure and energy are what actually come through.",
        ],
      },
    ],
  },
  {
    question: "The games — pymetrics, HireVue assessments, and friends.",
    answer: [
      {
        type: "p",
        text: "Plenty of banks and some consultancies add short game-based assessments. They measure traits and processing, not finance knowledge — you can't cram for them, but knowing the formats keeps you calm and quick.",
      },
      {
        type: "list",
        items: [
          "**Balloon risk game:** pump a balloon to bank money; it pops at a random point and you lose the round's takings. Roughly measures risk appetite and how you learn from feedback. Approach: pump with a consistent strategy, watch where balloons tend to pop, and adjust — steady beats reckless or frozen.",
          "**Arithmetic sprints:** rapid-fire mental math against a clock. Measures processing speed and accuracy under pressure. Approach: this is literally the Math Gym tab — train until two-digit arithmetic is automatic.",
          "**Memory / digit span:** repeat back growing sequences of digits or positions. Measures working memory. Approach: chunk into groups of two or three and rehearse them rhythmically in your head.",
          "**Tower / planning tasks:** rearrange discs or towers in the fewest possible moves. Measures planning before acting. Approach: pause and map the full sequence first — moves are usually scored more heavily than time.",
          "**Keep perspective:** your profile is compared against people who did well in the role, across many games at once. Play honestly and consistently — trying to game one \"ideal answer\" usually backfires.",
        ],
      },
    ],
  },
  {
    question: "Setup that helps more than you'd think.",
    answer: [
      {
        type: "list",
        items: [
          "**Light your face from the front** — a window or lamp behind your laptop, never behind you. Backlight turns you into a silhouette.",
          "**Eyes at the camera, camera at eye level.** Stack books under the laptop and put the question text as close to the webcam dot as you can — that's what reads as eye contact.",
          "**Frame it boring:** head and shoulders, a little headroom, plain background. A tidy wall beats an interesting bookshelf.",
          "**Sound check:** quiet room, earbud mic is fine, soft furnishings kill echo. Do one 20-second test recording and listen back.",
          "**Timer discipline:** use the prep seconds to jot three bullet beats, talk to the beats, glance at the countdown only at natural pauses — and land the plane ten seconds early rather than getting cut off mid-sentence.",
          "**Tech insurance:** updated browser, notifications off, phone hotspot ready as backup wifi. Ten minutes of setup buys a lot of calm.",
        ],
      },
    ],
  },
  {
    question: "How to practice (without over-practicing).",
    answer: [
      {
        type: "steps",
        items: [
          "**Record yourself answering the classic five on your phone:** tell me about yourself, why this firm, why this role, a teamwork story, a failure story. Watch it back twice — once with sound, once muted. Posture and eye line jump out on mute.",
          "**Do three reps, not ten.** Rep one is always rough; rep three is about as good as it gets before answers start sounding scripted. Keep the beats, lose the script.",
          "**Train the arithmetic games in the Math Gym tab** — 60-second sprints are almost exactly the assessment format, streaks and all.",
          "**Use the official free practice.** HireVue has a practice experience where you can feel out the interface before it counts, and many firms email a practice link with the invite — always take it.",
        ],
      },
    ],
  },
];
