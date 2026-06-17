const { createClient } = require('@supabase/supabase-js');
const { google }       = require('googleapis');

// Maps the dropdown text to a 24-h start time
const TIME_MAP = {
  '9:00 AM – 10:00 AM':  '09:00',
  '10:00 AM – 11:00 AM': '10:00',
  '11:00 AM – 12:00 PM': '11:00',
  '4:00 PM – 5:00 PM':   '16:00',
  '5:00 PM – 6:00 PM':   '17:00',
  '6:00 PM – 7:00 PM':   '18:00',
};

function slotToTime(slot) {
  return TIME_MAP[slot] ?? '09:00';
}

async function telegramNotify(text) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:    process.env.TELEGRAM_DOCTOR_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    }
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    parentName, phone, email,
    childName,  childAge,
    vaccine,    date,   time,  notes,
  } = req.body ?? {};

  if (!parentName || !phone || !childName || !childAge || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ── 1. Build appointment timestamps (IST = UTC+5:30) ──────────────
  const startISO = `${date}T${slotToTime(time)}:00+05:30`;
  const apptStart = new Date(startISO);
  const apptEnd   = new Date(apptStart.getTime() + 30 * 60 * 1000); // 30-min slot

  // ── 2. Save to Supabase ────────────────────────────────────────────
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: appt, error: dbErr } = await supabase
    .from('appointments')
    .insert({
      parent_name:          parentName,
      phone,
      patient_email:        email     || null,
      child_name:           childName,
      child_age:            childAge,
      vaccine:              vaccine   || 'Not specified',
      preferred_date:       date,
      preferred_time:       time      || 'Not specified',
      appointment_datetime: apptStart.toISOString(),
      notes:                notes     || null,
      status:               'pending',
    })
    .select()
    .single();

  if (dbErr) {
    console.error('Supabase insert error:', dbErr);
    return res.status(500).json({ error: 'Failed to save appointment. Please try again.' });
  }

  // ── 3. Create Google Calendar event ───────────────────────────────
  let calendarAdded = false;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key:  (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const cal = google.calendar({ version: 'v3', auth });

    const { data: event } = await cal.events.insert({
      calendarId:  process.env.GOOGLE_CALENDAR_ID,
      sendUpdates: email ? 'all' : 'none', // sends calendar invite + 30-min email reminder to patient
      requestBody: {
        summary:     `Vaccination: ${childName} (${vaccine || 'Consultation'})`,
        description: [
          `Parent : ${parentName}`,
          `Phone  : ${phone}`,
          `Child  : ${childName} (${childAge})`,
          `Vaccine: ${vaccine || 'TBD'}`,
          `Notes  : ${notes || 'None'}`,
        ].join('\n'),
        start:     { dateTime: apptStart.toISOString(), timeZone: 'Asia/Kolkata' },
        end:       { dateTime: apptEnd.toISOString(),   timeZone: 'Asia/Kolkata' },
        attendees: email ? [{ email }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 }, // doctor's Google Calendar popup
            { method: 'email', minutes: 30 }, // patient email reminder from Google
          ],
        },
      },
    });

    await supabase
      .from('appointments')
      .update({ google_event_id: event.id })
      .eq('id', appt.id);

    calendarAdded = true;
  } catch (err) {
    // Non-fatal — the booking is still saved; calendar is best-effort
    console.error('Google Calendar error:', err.message);
  }

  // ── 4. Telegram notification to doctor ────────────────────────────
  try {
    await telegramNotify(
      `<b>New Appointment Booked</b>\n\n` +
      `<b>Parent :</b> ${parentName}\n` +
      `<b>Phone  :</b> ${phone}\n` +
      `<b>Email  :</b> ${email || 'Not provided'}\n` +
      `<b>Child  :</b> ${childName} (${childAge})\n` +
      `<b>Vaccine:</b> ${vaccine || 'TBD'}\n` +
      `<b>Date   :</b> ${date}\n` +
      `<b>Time   :</b> ${time || 'TBD'}\n` +
      `<b>Notes  :</b> ${notes || 'None'}\n` +
      `<b>Calendar:</b> ${calendarAdded ? 'Added to Google Calendar' : 'Calendar not configured yet'}`
    );
  } catch (err) {
    console.error('Telegram notify error:', err.message);
  }

  return res.status(200).json({ success: true, id: appt.id });
};
