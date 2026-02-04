#!/usr/bin/env npx tsx
/**
 * Human-in-the-Loop Example
 *
 * Demonstrates the core HITL pattern: an AI agent that pauses
 * for human approval before taking an action.
 *
 * Usage:
 *   JUSTACK_API_KEY=jstk_xxx npx tsx examples/hitl.ts
 *
 * Dev mode:
 *   JUSTACK_API_KEY=jstk_xxx JUSTACK_API_URL=http://localhost:8787/v1 npx tsx examples/hitl.ts
 */

import { JustackClient } from "../src/index";

const apiKey = process.env.JUSTACK_API_KEY;
if (!apiKey) {
  console.error("Error: JUSTACK_API_KEY environment variable is required");
  process.exit(1);
}

const client = new JustackClient({
  apiKey,
  baseUrl: process.env.JUSTACK_API_URL,
});

async function main() {
  // Create a recipient (or use an existing one)
  const recipient = await client.recipients.create({
    name: "Developer",
    externalId: "hitl-example-user",
  });

  // Get the invite URL to share with the human
  const { url: inviteUrl } = await client.recipients.getInviteUrl(
    recipient.recipientId
  );
  console.log(`\nShare this URL with your reviewer: ${inviteUrl}\n`);

  // Create a session for this interaction
  const session = await client.sessions.create({
    name: "Deploy to Production",
    recipients: [recipient.recipientId],
  });

  console.log("Session created. Waiting for human approval...\n");

  try {
    // Log progress to keep the human informed
    await session.log("## Deployment Ready\n\nAll tests passed. Ready to deploy.");

    // Ask for approval - this blocks until the human responds
    const { approved, notes } = await session.ask(
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
