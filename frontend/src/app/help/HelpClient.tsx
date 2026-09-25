"use client";

import { CONTACT_EMAIL, mailto } from "@/lib/contact";
import { useState } from "react";
import Link from "next/link";
import { HELP_TOPICS } from "@/lib/helpContent";
import { LANDING } from "@/content/landing";
import Card from "@/components/Card";
import { Section } from "@/components/marketing/Section";
import Button from "@/components/Button";

export default function HelpClient() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = LANDING.faq.groups.map(group => {
    const filteredQuestions = group.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...group, questions: filteredQuestions };
  }).filter(group => group.questions.length > 0);

  return (
    <main className="flex-1">
      {/* Hero with Search */}
      <Section className="py-16 sm:py-24 lg:py-32 bg-surface">
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            How can we help?
          </h1>
          <p className="text-lg text-muted mb-8">
            Search our help centre for quick answers to common questions.
          </p>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              placeholder="Search questions..."
              className="w-full pl-12 pr-4 py-4 bg-canvas-deep border border-line rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* Topic Shortcuts */}
      {!searchQuery && (
        <Section className="py-12 bg-canvas-deep">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold mb-8">Browse topics</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {HELP_TOPICS.map((topic, i) => (
                <Link key={i} href={topic.href} className="block group">
                  <Card className="h-full hover:border-brand-orange/50 transition-colors">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-brand-orange-dark transition-colors">{topic.title}</h3>
                    <p className="text-sm text-muted">{topic.body}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* FAQ Accordions / List */}
      <Section className="py-16 sm:py-24 bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {searchQuery && filteredGroups.length === 0 && (
            <div className="text-center py-12 text-muted">
              No results found for &quot;{searchQuery}&quot;. Please try another search or contact support.
            </div>
          )}
          
          <div className="space-y-12">
            {filteredGroups.map((group, i) => (
              <div key={i}>
                <h2 className="font-display text-2xl font-bold mb-6 text-brand-orange-dark">{group.name}</h2>
                <div className="space-y-4">
                  {group.questions.map((q, j) => (
                    <details key={j} className="group bg-canvas-deep rounded-2xl border border-line [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between p-6 cursor-pointer font-bold select-none text-ink">
                        {q.q}
                        <svg className="w-5 h-5 text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-6 pb-6 text-muted border-t border-line/50 pt-4">
                        {q.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Still stuck / Contact */}
      <Section className="py-16 sm:py-24 bg-canvas-deep border-t border-line">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold mb-4">Still stuck?</h2>
          <p className="text-lg text-muted mb-8">Our support team is here to help you sort it out.</p>
          
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer">
              <Card className="text-center hover:border-brand-green/50 transition-colors h-full">
                <div className="w-12 h-12 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </div>
                <h3 className="font-bold mb-1">WhatsApp</h3>
                <p className="text-sm text-muted">Chat with us directly</p>
              </Card>
            </a>
            
            <a href={mailto()} target="_blank" rel="noopener noreferrer">
              <Card className="text-center hover:border-brand-orange/50 transition-colors h-full">
                <div className="w-12 h-12 bg-brand-orange/10 text-brand-orange-dark rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Email</h3>
                <p className="text-sm text-muted">{CONTACT_EMAIL}</p>
              </Card>
            </a>
            
            <a href={mailto("Incident Report")} target="_blank" rel="noopener noreferrer">
              <Card className="text-center hover:border-red-500/50 transition-colors h-full">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Report incident</h3>
                <p className="text-sm text-muted">File a safety or order report</p>
              </Card>
            </a>
          </div>
        </div>
      </Section>
    </main>
  );
}
