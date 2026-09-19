// middleware/chatSecurity.ts

export function scanMessage(content: string): { blocked: boolean; reason: string | null } {
  if (typeof content !== 'string' || !content.trim()) {
    return { blocked: false, reason: null };
  }

  // 1. 10-digit Indian mobile number pattern (contiguous or standard phone separators)
  const phonePattern = /(?:(?:\+|0{0,2})91[\s.-]*)?[6-9]\d{1,4}[\s.-]*\d{2,4}[\s.-]*\d{3,5}\b/g;
  const matches = content.match(phonePattern);
  if (matches) {
    for (const m of matches) {
      const digits = m.replace(/\D/g, '');
      const core10 = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : (digits.startsWith('0') && digits.length === 11 ? digits.slice(1) : digits);
      if (core10.length === 10 && /^[6-9]/.test(core10)) {
        return { blocked: true, reason: 'Platform rules violation — sharing phone numbers or personal contact info is not allowed on YBEX.' };
      }
    }
  }

  // 2. Spaced single-digit phone evasion (e.g. 9 8 7 6 5 4 3 2 1 0)
  const spacedDigitsPattern = /\b[6-9](?:[\s._\-,/]{1,3}\d){9}\b/;
  const spacedMatch = content.match(spacedDigitsPattern);
  if (spacedMatch) {
    const digits = spacedMatch[0].replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return { blocked: true, reason: 'Platform rules violation — personal phone number sharing not allowed on YBEX.' };
    }
  }

  // 3. Email address pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  if (emailPattern.test(content)) {
    return { blocked: true, reason: 'Platform rules violation — sharing email addresses is not allowed on YBEX.' };
  }

  // 4. WhatsApp / Telegram / Direct external invite links
  const externalLinkPattern = /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|chat\.whatsapp\.com|api\.whatsapp\.com|t\.me|telegram\.me)\/\S+/gi;
  if (externalLinkPattern.test(content)) {
    return { blocked: true, reason: 'Platform rules violation — external messaging links are not allowed in negotiations.' };
  }

  return { blocked: false, reason: null };
}

export async function handleViolation(userId: string, messageId: string, threadId: string, supabase: any) {
  if (!supabase) return { count: 0, restrictionUntil: null, isSuspended: false };

  const { data: existing } = await supabase
    .from('user_violations')
    .select('violation_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const count = (existing?.violation_count || 0) + 1;
  let restrictionUntil = null;
  let isSuspended = false;

  if (count === 3) {
    restrictionUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (count >= 5) {
    isSuspended = true;
    await supabase.from('users').update({ is_suspended: true }).eq('user_id', userId);
  }

  await supabase.from('user_violations').insert({
    user_id: userId,
    violation_type: 'CONTACT_SHARING',
    message_id: messageId,
    thread_id: threadId,
    violation_count: count,
    restriction_until: restrictionUntil,
    is_suspended: isSuspended
  });

  return { count, restrictionUntil, isSuspended };
}

