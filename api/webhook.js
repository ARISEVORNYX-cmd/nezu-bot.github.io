module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  if (!DISCORD_WEBHOOK_URL) {
    return res.status(500).json({ error: 'Discord webhook URL not configured' });
  }

  try {
    const payload = req.body;

    // Extract GitHub webhook info
    const repository = payload.repository?.full_name || 'Unknown repo';
    const pusher = payload.pusher?.name || 'Unknown user';
    const ref = payload.ref || 'refs/heads/main';
    const branch = ref.replace('refs/heads/', '');
    const compare = payload.compare || '';
    const commits = payload.commits || [];
    const commitCount = commits.length;

    // Build commit list (max 5 to keep embed clean)
    const commitList = commits.slice(0, 5).map((c) => {
      const message = c.message?.split('\n')[0] || 'No message';
      const url = c.url || c.html_url || '#';
      return `- [${message}](${url})`;
    }).join('\n');

    const embed = {
      title: `🚀 New push to ${repository}`,
      description: `**Branch:** \`${branch}\`\n**Pusher:** ${pusher}\n**Commits:** ${commitCount}`,
      color: 0x5865F2,
      fields: commitList ? [{ name: 'Commits', value: commitList }] : [],
      footer: { text: 'GitHub → Discord Webhook' },
      timestamp: new Date().toISOString(),
    };

    if (compare) {
      embed.fields = embed.fields || [];
      embed.fields.push({ name: 'Compare', value: `[View changes](${compare})`, inline: true });
    }

    const discordPayload = {
      embeds: [embed],
      username: 'GitHub',
      avatar_url:
        'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
