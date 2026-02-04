#!/usr/bin/env npx tsx
/**
 * Ping-Pong Example
 *
 * A simple back-and-forth conversation between agent and human.
 * Shows log messages, ask inputs, and session cleanup.
 *
 * Usage:
 *   JUSTACK_API_KEY=jstk_xxx npx tsx examples/ping-pong.ts
 *
 * Dev mode:
 *   JUSTACK_API_KEY=jstk_xxx JUSTACK_API_URL=http://localhost:8787/v1 npx tsx examples/ping-pong.ts
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
  // Create or find a recipient
  const recipient = await client.recipients.create({
    name: "Pong Player",
    externalId: "ping-pong-user",
  });

  const { url } = await client.recipients.getInviteUrl(recipient.recipientId);
  console.log(`\nOpen this URL to play: ${url}\n`);

  // Create session
  const session = await client.sessions.create({
    name: "Ping Pong Game",
    recipients: [recipient.recipientId],
  });

  console.log("Game started! Waiting for responses...\n");

  try {
    // Round 1: Ping
    await session.log("# Round 1");
    await session.log("Agent says: **Ping!**");

    const { response: r1 } = await session.ask("Your turn:", {
      inputs: [
        {
          type: "select",
          name: "response",
          label: "Say",
          options: ["Pong!", "Ping?", "Pass"],
        },
      ] as const,
    });
    console.log(`Human: ${r1}`);

    // Round 2: Continue
    await session.log("# Round 2");
    await session.log("Agent says: **Ping!**");

    const { response: r2 } = await session.ask("Your turn:", {
      inputs: [
        {
          type: "select",
          name: "response",
          label: "Say",
          options: ["Pong!", "Ping?", "Pass"],
        },
      ] as const,
    });
    console.log(`Human: ${r2}`);

    // Round 3: Final
    await session.log("# Final Round");
    await session.log("Agent says: **PING!!!**");

    const { response: r3, message } = await session.ask("Last chance:", {
      inputs: [
        {
          type: "select",
          name: "response",
          label: "Say",
          options: ["PONG!!!", "I give up"],
        },
        {
          type: "text",
          name: "message",
          label: "Victory message",
          placeholder: "Say something epic...",
        },
      ] as const,
    });
    console.log(`Human: ${r3}`);
    if (message) console.log(`Message: ${message}`);

    // Game over
    await session.log("## Game Over\n\nThanks for playing!");
    console.log("\nGame complete!");
  } finally {
    session.close();
  }
}

main().catch(console.error);
