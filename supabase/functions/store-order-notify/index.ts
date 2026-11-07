// supabase/functions/store-order-notify/index.ts
//
// Emails for a new Church Store order. Called by submit_store_order() in the
// database (through public.call_edge_function), never by browsers.
//   1. "New store order" → fundraising@umcdanielson.org (or STORE_ORDERS_EMAIL)
//   2. "We got your order" → the customer, if they gave an email
//
// Deploy:
//   supabase functions deploy store-order-notify --project-ref zdpstnmfcfbcmhtfayls

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const CRON_SECRET    = Deno.env.get('CRON_SECRET')
const ORDERS_EMAIL   = Deno.env.get('STORE_ORDERS_EMAIL') || 'fundraising@umcdanielson.org'
const FROM_ADDRESS   = 'UMCD Church Store <noreply@umcdanielson.org>'
const STORE_URL      = 'https://store.umcdanielson.org'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Not allowed' }, 403)

  try {
    const { orderId } = await req.json()
    if (!orderId) return json({ error: 'orderId is required' }, 400)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single()
    if (!order) return json({ error: 'Order not found' }, 404)
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at')

    const table = itemsTable(items || [], order.total_estimated)
    const sent: string[] = []

    // 1. Fundraising
    await send(ORDERS_EMAIL, `New store order ${order.order_number} — ${order.customer_name} ($${money(order.total_estimated)})`, shell('New Store Order', `
      <p><strong>${esc(order.customer_name)}</strong> placed order <strong>${esc(order.order_number)}</strong>.</p>
      <p style="margin:0 0 4px;">${order.customer_email ? `📧 <a href="mailto:${esc(order.customer_email)}" style="color:#7A0047;">${esc(order.customer_email)}</a><br/>` : ''}${order.customer_phone ? `📞 ${esc(order.customer_phone)}` : ''}</p>
      ${order.notes ? `<p><strong>Notes:</strong> ${esc(order.notes)}</p>` : ''}
      ${table}
      <p style="margin-top:20px;"><a href="${STORE_URL}/admin/orders" style="background:#7A0047;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Open Store Orders</a></p>
    `), order.customer_email || undefined)
    sent.push('fundraising')

    // 2. Customer
    if (order.customer_email) {
      await send(order.customer_email, `We got your order — ${order.order_number}`, shell('Thank you for your order!', `
        <p>Hi ${esc(order.customer_name.split(' ')[0])},</p>
        <p>Thank you for supporting the United Methodist Church of Danielson. Here's what you ordered:</p>
        ${table}
        <p><strong>What happens next:</strong> Corissa will be in touch to arrange pickup. You pay when you pick up your order (cash, check or Venmo). Nothing has been charged.</p>
        <p style="font-size:13px;color:#777;">Your order number is <strong>${esc(order.order_number)}</strong>. Questions? Just reply to this email.</p>
      `), ORDERS_EMAIL)
      sent.push('customer')
    }
    return json({ sent })
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})

function itemsTable(items: any[], total: number) {
  const rows = items.map((i) => {
    const extras = [
      i.design_name_snapshot ? `${esc(i.design_name_snapshot)}${i.placement ? ` — ${esc(i.placement)}` : ''}` : '',
      i.design2_name_snapshot ? `+ ${esc(i.design2_name_snapshot)}${i.placement2 ? ` — ${esc(i.placement2)}` : ''}` : '',
      i.personalization_text ? `Personalized: “${esc(i.personalization_text)}”${i.personalization_placement ? ` — ${esc(i.personalization_placement)}` : ''}` : '',
    ].filter(Boolean).join('<br/>')
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;vertical-align:top;"><strong>${esc(i.product_name_snapshot)}</strong><br/>
        <span style="color:#555;font-size:13px;">${esc(i.color || '')}${i.color ? ' · ' : ''}Size ${esc(i.size)}${extras ? '<br/>' + extras : ''}</span></td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;vertical-align:top;">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">$${money(i.line_total)}</td></tr>`
  }).join('')
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;">
    <tr style="background:#F7E6F0;color:#3D0026;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right;">Total</th></tr>
    ${rows}
    <tr><td colspan="2" style="padding:8px;text-align:right;font-weight:bold;">Estimated total</td><td style="padding:8px;text-align:right;font-weight:bold;">$${money(total)}</td></tr>
  </table>`
}

const money = (n: number) => Number(n || 0).toFixed(2)

async function send(to: string, subject: string, html: string, replyTo?: string) {
  const body: Record<string, unknown> = { from: FROM_ADDRESS, to: [to], subject, html }
  if (replyTo) body.reply_to = replyTo
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Email to ${to} failed: ${await res.text()}`)
}

function shell(subtitle: string, bodyHtml: string) {
  return `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
    <div style="background:#3D0026; color:white; padding:20px 24px;">
      <h1 style="margin:0; font-size:20px;">United Methodist Church of Danielson</h1>
      <p style="margin:4px 0 0; font-size:15px;">${subtitle}</p>
    </div>
    <div style="padding:24px; color:#222; font-size:15px; line-height:1.6;">${bodyHtml}</div></div>`
}

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
