const { createClient } = require('@supabase/supabase-js');

// Sends a Telegram message to the doctor
async function telegramSend(text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:    process.env.TELEGRAM_DOCTOR_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  // ── Auth: Vercel cron sends  Authorization: Bearer <CRON_SECRET>  ──
  // cron-job.org: add the same header manually in the cron job config.
  const authHeader = req.headers['authorization'] ?? '';
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find appointments whose datetime falls in the window 28–32 minutes from now
  const now  = new Date();
  const from = new Date(now.getTime() + 28 * 60 * 1000).toISOString();
  const to   = new Date(now.getTime() + 32 * 60 * 1000).toISOString();

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('reminder_sent', false)
    .eq('status', 'pending')
    .gte('appointment_datetime', from)
    .lte('appointment_datetime', to);

  if (error) {
    console.error('Supabase query error:', error);
    return res.status(500).json({ error: error.message });
  }

  let sent = 0;
  for (const appt of appts ?? []) {
    const label = new Date(appt.appointment_datetime).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday:  'long',
      day:      'numeric',
      month:    'short',
      hour:     '2-digit',
      minute:   '2-digit',
      hour12:   true,
    });

    // Telegram reminder to doctor
    await telegramSend(
      `REMINDER — Appointment in 30 minutes\n\n` +
      `<b>Child  :</b> ${appt.child_name} (${appt.child_age})\n` +
      `<b>Parent :</b> ${appt.parent_name}\n` +
      `<b>Phone  :</b> ${appt.phone}\n` +
      `<b>Vaccine:</b> ${appt.vaccine}\n` +
      `<b>Time   :</b> ${label}\n\n` +
      `Patient ${appt.patient_email ? 'has received a Google Calendar reminder.' : 'did not provide email — call to confirm.'}`
    );

    // Mark reminder sent so it doesn't fire again
    await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appt.id);

    sent++;
  }

  return res.status(200).json({ ok: true, remindersSent: sent, checkedAt: now.toISOString() });
};
