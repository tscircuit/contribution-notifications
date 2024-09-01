import { WebhookClient } from "discord.js";
import { WebClient } from "@slack/web-api";
import { AnalyzedPR } from "../index";

// Initialize Discord webhook client if the environment variable is set
let discordWebhook: WebhookClient | null = null;
if (process.env.DISCORD_WEBHOOK_URL) {
	discordWebhook = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
} else {
	console.warn(
		"Discord webhook URL not set. Discord notifications will be skipped.",
	);
}

// Initialize Slack client if the environment variable is set
let slackClient: WebClient | null = null;
if (process.env.SLACK_BOT_TOKEN) {
	slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
} else {
	console.warn("Slack bot token not set. Slack notifications will be skipped.");
}

async function postToDiscord(message: string) {
	if (discordWebhook) {
		await discordWebhook.send(message);
	}
}

async function postToSlack(message: string) {
	if (slackClient && process.env.SLACK_CHANNEL_ID) {
		await slackClient.chat.postMessage({
			channel: process.env.SLACK_CHANNEL_ID,
			text: message,
		});
	} else if (slackClient && !process.env.SLACK_CHANNEL_ID) {
		console.warn("Slack channel ID not set. Slack message not sent.");
	}
}

export async function notifyPRChange(pr: AnalyzedPR) {
	const message = `
[${pr.state === "merged" ? "merged" : "opened"}] ${pr.contributor} ${pr.impact} PR in ${pr.repo}: ${pr.url}
${pr.description.slice(0, 300).replace(/\n/g, " ")}`.trim();

	await postToDiscord(message);
	await postToSlack(message);
}
