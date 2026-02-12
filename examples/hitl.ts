#!/usr/bin/env npx tsx
/**
 * Human-in-the-Loop Example
 *
 * Demonstrates the core HITL pattern: an AI agent that pauses
 * for human approval before taking an action.
 *
 * Usage:
 *   JUSTACK_API_KEY=jstk_xxx npx tsx examples/hitl.ts user@example.com
 */

import { JustackClient } from "@justack/sdk";

const apiKey = process.env.JUSTACK_API_KEY;
const email = process.argv[2];

if (!apiKey || !email) {
  console.error("Usage: JUSTACK_API_KEY=jstk_xxx npx tsx examples/hitl.ts <email>");
  process.exit(1);
}

const client = new JustackClient({ apiKey });

async function main() {
  // Create a session for this interaction
  const session = await client.sessions.create({
    name: "Deploy to Production",
    recipients: [email],
  });

  try {
    // Log progress to keep the human informed
    await session.log("## Deployment Ready\n\nAll tests passed. Ready to deploy.");

    // Ask for approval - this blocks until the human responds
    const response = await session.ask(
      "Should I deploy **v2.1.0** to production?",
      {
        inputs: [
          {
            type: "confirm",
            name: "approved",
            label: "Approve deployment",
          },
          {
            type: "text",
            name: "notes",
            label: "Notes (optional)",
            placeholder: "Any concerns or comments?",
          },
        ] as const,
      }
    );
    console.log(response)
    const {notes, approved} = response;

    // Act on the human's decision
    if (approved) {
      console.log("Deployment approved!");
      if (notes) console.log(`Notes: ${notes}`);
      await session.log("Deploying to production...");
      // ... perform deployment ...
      await session.log("Deployment complete!");
    } else {
      console.log("Deployment rejected.");
      if (notes) console.log(`Reason: ${notes}`);
      await session.log("Deployment cancelled.");
    }
  } finally {
    session.close();
  }
}

main().catch(console.error);
