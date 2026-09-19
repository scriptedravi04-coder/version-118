import express from "express";
import crypto from "crypto";
import { Resend, buildEmailHtml } from "./helpers";

// Support ticket routes: replying to a ticket, fetching a ticket's
// messages, listing a user's own tickets, and creating a new ticket
// (from either an order-support-modal or the general help-center flow —
// both funnel through the same createSupportTicketHandler).
export function setupSupportRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
    sendNotification,
    logAdminAction,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    sendNotification: (db: any, userId: string, type: string, message: string) => Promise<any>;
    logAdminAction: (user: any, action: string, targetType: string, targetId: string, details?: any) => Promise<any>;
  }
) {
  const getIsoNow = () => new Date().toISOString();

  router.post("/support/tickets/:id/reply", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'sub_admin' && user.team_role !== 'sub_admin')) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    const ticketId = req.params.id;
    const { message, attachments } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Reply message cannot be empty." });
    }

    // Find the ticket
    let ticket: any = null;
    if (supabase) {
      try {
        const { data: tData, error: tErr } = await (privilegedSupabase || supabase)
          .from('support_tickets')
          .select('*')
          .eq('ticket_id', ticketId)
          .maybeSingle();
        if (tData) ticket = tData;
        if (tErr) console.warn("Error finding ticket in Supabase:", tErr);
      } catch (e) {
        console.warn("Exception finding ticket in Supabase:", e);
      }
    }

    const db = getDb();
    if (!ticket) {
      ticket = (db.support_tickets || []).find((t: any) => t.ticket_id === ticketId || t.id === ticketId);
    }

    if (!ticket) {
      return res.status(404).json({ error: "Support ticket not found." });
    }

    const messageId = crypto.randomUUID();
    const newMsg = {
      message_id: messageId,
      ticket_id: ticketId,
      sender_id: user.user_id,
      sender_type: 'admin',
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      created_at: getIsoNow()
    };

    // Insert into Supabase ticket_messages
    if (supabase) {
      try {
        const { error: insertErr } = await (privilegedSupabase || supabase)
          .from('ticket_messages')
          .insert(newMsg);
        if (insertErr) {
          console.error("Supabase ticket_messages insert error:", insertErr);
        }
      } catch (e: any) {
        console.error("Supabase ticket_messages insert exception:", e?.message || e);
      }

      // Update support_tickets updated_at and assigned_admin_id
      try {
        await (privilegedSupabase || supabase)
          .from('support_tickets')
          .update({
            updated_at: getIsoNow(),
            assigned_admin_id: user.user_id
          })
          .eq('ticket_id', ticketId);
      } catch (e) {
        console.warn("Supabase support_tickets update exception:", e);
      }
    }

    // Local DB fallback & sync
    if (!db.ticket_messages) db.ticket_messages = [];
    db.ticket_messages.push(newMsg);
    if (db.support_tickets) {
      const locTicket = db.support_tickets.find((t: any) => t.ticket_id === ticketId || t.id === ticketId);
      if (locTicket) {
        locTicket.updated_at = getIsoNow();
        locTicket.assigned_admin_id = user.user_id;
      }
    }
    saveDb(db);

    // Look up recipient user for notification & Resend email
    let ticketUser: any = null;
    if (ticket.user_id) {
      if (supabase) {
        try {
          const { data: uData } = await (privilegedSupabase || supabase)
            .from('users')
            .select('user_id, email, name')
            .eq('user_id', ticket.user_id)
            .maybeSingle();
          if (uData) ticketUser = uData;
        } catch (e) {
          console.warn("Error fetching ticket user in Supabase:", e);
        }
      }
      if (!ticketUser && db.users) {
        ticketUser = db.users.find((u: any) => u.user_id === ticket.user_id);
      }
    }

    // Send email notification via Resend
    let emailSent = false;
    const toEmail = ticketUser?.email;
    const userName = ticketUser?.name || "User";
    const apiKey = process.env.RESEND_API_KEY;

    if (toEmail && toEmail.includes('@') && !toEmail.endsWith('.demo') && !toEmail.includes('@example.com')) {
      if (apiKey) {
        try {
          const resendClient = new Resend(apiKey);
          const fromEmail = process.env.RESEND_FROM_EMAIL || "Ybex Support <noreply@ybexmedia.in>";
          const appUrl = process.env.APP_URL || 'https://ybexmedia.in';

          const emailHtml = buildEmailHtml({
            title: `Support Resolution: Ticket #${ticketId.slice(0, 8)}`,
            greeting: `Hello ${userName},`,
            paragraphs: [
              `Our support resolution team has responded to your inquiry regarding "<strong>${ticket.subject || ticket.category || 'Support Request'}</strong>":`,
              `<div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 14px 18px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</div>`,
              `You can view the full conversation history or reply from your Helpdesk dashboard.`
            ],
            button: {
              text: "View Support Ticket",
              link: `${appUrl}/help`
            }
          });

          const resendRes = await resendClient.emails.send({
            from: fromEmail,
            to: [toEmail],
            subject: `[Support Ticket #${ticketId.slice(0, 8)}] Update: ${ticket.subject || 'Help Desk Response'}`,
            html: emailHtml
          });

          if (resendRes?.error) {
            console.warn("[Support Reply Email Error]:", resendRes.error);
          } else {
            emailSent = true;
            console.log(`[Support Reply Email Sent] Delivered to ${toEmail} for ticket ${ticketId}`);
          }
        } catch (mailErr: any) {
          console.error("[Support Reply Email Exception]:", mailErr?.message || mailErr);
        }
      } else {
        console.log(`[Support Reply Email Skipped - No RESEND_API_KEY] Would notify ${toEmail} for ticket ${ticketId}`);
      }
    }

    // In-app notification
    if (ticket.user_id) {
      try {
        await sendNotification(
          db,
          ticket.user_id,
          'SUPPORT_REPLY',
          `Support team replied to ticket #${ticketId.slice(0, 8)}: "${ticket.subject || 'Support Ticket'}"`
        );
      } catch (notifErr) {
        console.warn("Error sending in-app notification:", notifErr);
      }
    }

    // Log admin activity
    await logAdminAction(user, 'reply_ticket', 'support_ticket', ticketId, {
      message_preview: message.trim().slice(0, 80),
      recipient_email: toEmail || null,
      email_sent: emailSent
    });

    res.json({
      success: true,
      message: "Reply sent & email delivered to user",
      data: newMsg,
      email_delivered: emailSent
    });
  });

  router.get("/support/tickets/:id/messages", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const ticketId = req.params.id;
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        if (!error && data) return res.json(data);
      } catch (e) {}
    }

    const db = getDb();
    const msgs = (db.ticket_messages || []).filter((m: any) => m.ticket_id === ticketId);
    res.json(msgs);
  });

  router.get("/support/my-tickets", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const localMap: Map<any, any> = new Map((db.support_tickets || []).map((lt: any) => [lt.ticket_id, lt]));

    let tickets: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase)
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.user_id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          tickets = data.map((t: any) => {
            const localRec = localMap.get(t.ticket_id);
            const extractedOrderId = (typeof t.page_context === 'string' && t.page_context.startsWith('/deals/'))
              ? t.page_context.replace('/deals/', '').split(/[?#]/)[0]
              : null;
            return {
              ...t,
              order_id: t.order_id || localRec?.order_id || extractedOrderId || null,
              thread_id: t.thread_id || localRec?.thread_id || null
            };
          });
        } else if (error) {
          console.warn("[my-tickets] Supabase select error:", error);
        }
      } catch (e) {
        console.warn("[my-tickets] Supabase select exception:", e);
      }
    }

    if (tickets.length === 0) {
      const locTickets = (db.support_tickets || [])
        .filter((t: any) => t.user_id === user.user_id)
        .map((t: any) => ({
          ...t,
          order_id: t.order_id || null,
          thread_id: t.thread_id || null
        }));
      if (locTickets.length > 0) {
        tickets = locTickets;
      }
    }

    res.json({ tickets });
  });

  const createSupportTicketHandler = async (req: any, res: any) => {
    const user = await parseAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const {
      thread_id,
      order_id,
      campaign_title,
      deal_amount,
      issue_category,
      category,
      message,
      description,
      subject,
      brand_details,
      creator_details,
      priority,
      page_context,
      attachments
    } = req.body || {};

    const ticketMsg = (message || description || "").toString().trim();
    if (!ticketMsg && !subject) {
      return res.status(400).json({ error: "Message or subject is required to raise a support ticket." });
    }

    const ticketId = crypto.randomUUID();
    const resolvedCategory = issue_category || category || (order_id ? 'Order Dispute' : 'General Support');
    const resolvedSubject = (subject || "").toString().trim() || 
      (order_id ? `Order Dispute: ${campaign_title || 'Order #' + String(order_id).substring(0, 8)}` : `Support Request: ${resolvedCategory}`);
    const resolvedPriority = priority || (order_id ? 'HIGH' : 'MEDIUM');
    const resolvedThreadId = thread_id || null;
    const resolvedOrderId = order_id || null;
    const resolvedPageContext = page_context || (resolvedOrderId ? `/deals/${resolvedOrderId}` : '/help');
    const nowIso = getIsoNow();

    const ticketRecord = {
      ticket_id: ticketId,
      user_id: user.user_id,
      role: user.role || 'user',
      subject: resolvedSubject,
      category: resolvedCategory,
      status: 'OPEN',
      priority: resolvedPriority,
      assigned_admin_id: null,
      page_context: resolvedPageContext,
      created_at: nowIso,
      updated_at: nowIso,
      thread_id: resolvedThreadId
    };

    let messageRecord: any = null;
    if (ticketMsg) {
      messageRecord = {
        message_id: crypto.randomUUID(),
        ticket_id: ticketId,
        sender_id: user.user_id,
        sender_type: user.role === 'admin' ? 'admin' : 'user',
        message: ticketMsg,
        attachments: Array.isArray(attachments) ? attachments : [],
        created_at: nowIso
      };
    }

    if (supabase) {
      try {
        const { error: tErr } = await (privilegedSupabase || supabase)
          .from('support_tickets')
          .insert(ticketRecord);
        if (tErr) console.error("[createSupportTicket] Supabase support_tickets insert error:", tErr);
      } catch (e) {
        console.error("[createSupportTicket] Supabase support_tickets exception:", e);
      }

      if (messageRecord) {
        try {
          const { error: mErr } = await (privilegedSupabase || supabase)
            .from('ticket_messages')
            .insert(messageRecord);
          if (mErr) console.error("[createSupportTicket] Supabase ticket_messages insert error:", mErr);
        } catch (e) {
          console.error("[createSupportTicket] Supabase ticket_messages exception:", e);
        }
      }
    }

    // Local DB sync
    const db = getDb();
    if (!db.support_tickets) db.support_tickets = [];
    if (!db.ticket_messages) db.ticket_messages = [];

    const localTicket = {
      ...ticketRecord,
      order_id: resolvedOrderId,
      thread_id: resolvedThreadId,
      campaign_title: campaign_title || null,
      deal_amount: deal_amount || 0,
      brand_details: brand_details || null,
      creator_details: creator_details || null
    };
    db.support_tickets.unshift(localTicket);

    if (messageRecord) {
      db.ticket_messages.push(messageRecord);
    }
    saveDb(db);

    return res.status(201).json({
      success: true,
      ticket_id: ticketId,
      ticket: {
        ...ticketRecord,
        order_id: resolvedOrderId,
        thread_id: resolvedThreadId
      },
      message: "Support ticket created successfully"
    });
  };
  router.post("/support/order-ticket", createSupportTicketHandler);
  router.post("/support/tickets", createSupportTicketHandler);
}
