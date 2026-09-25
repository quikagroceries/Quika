// The one inbox every "email us" link and apply form on the site points at.
// Temporary: quika.ng has no DNS/mail set up yet, so anything sent to
// hello@/agents@/riders@quika.ng bounced. Once the company domain's mailboxes
// exist, change this (or split it back into per-purpose addresses).
// Subjects on each link keep applications, support and press apart.
export const CONTACT_EMAIL = "qykagroup@gmail.com";

export function mailto(subject?: string) {
  return `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
