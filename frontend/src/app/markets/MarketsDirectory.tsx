"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DIRECTORY_MARKETS, VenueType } from "@/lib/marketDirectory";
import { Section } from "@/components/marketing/Section";
import FilterPills from "@/components/FilterPills";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { Stagger, StaggerItem } from "@/components/marketing/motion";
import WavyDivider from "@/components/WavyDivider";

const VENUE_OPTIONS = [
  { key: "all", label: "All Venues" },
  { key: "local_market", label: "Open-air Markets" },
  { key: "supermarket", label: "Supermarkets" },
];

const CITY_OPTIONS = [
  { key: "all", label: "All Cities" },
  { key: "Lagos", label: "Lagos" },
  { key: "Ibadan", label: "Ibadan" },
  { key: "Abuja", label: "Abuja" },
];

const STATUS_OPTIONS = [
  { key: "all", label: "All Status" },
  { key: "pilot", label: "Live" },
  { key: "coming_soon", label: "Coming soon" },
];

export function MarketsDirectory() {
  const [venueFilter, setVenueFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMarkets = useMemo(() => {
    return DIRECTORY_MARKETS.filter((market) => {
      const matchVenue = venueFilter === "all" || market.venueType === venueFilter;
      const matchCity = cityFilter === "all" || market.city.includes(cityFilter) || market.state.includes(cityFilter);
      const matchStatus = statusFilter === "all" || market.status === statusFilter;
      return matchVenue && matchCity && matchStatus;
    });
  }, [venueFilter, cityFilter, statusFilter]);

  return (
    <>
      <Section
        title="Find your market"
        lede="From bustling open-air stalls to trusted supermarkets, see where Qyka can shop for you."
        bg="canvas"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
          <div className="flex flex-wrap gap-4">
            <FilterPills
              variant="tabs"
              options={VENUE_OPTIONS}
              value={venueFilter}
              onChange={setVenueFilter}
              className="mb-0"
            />
            <FilterPills
              variant="tabs"
              options={CITY_OPTIONS}
              value={cityFilter}
              onChange={setCityFilter}
              className="mb-0"
            />
            <FilterPills
              variant="tabs"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              className="mb-0"
            />
          </div>
        </div>

        {filteredMarkets.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-xl text-muted font-medium mb-4">No markets found for this combination.</p>
            <Button onClick={() => {
              setVenueFilter("all");
              setCityFilter("all");
              setStatusFilter("all");
            }}>
              Reset filters
            </Button>
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMarkets.map((market) => (
              <StaggerItem key={market.id}>
                <Card className="flex flex-col h-full overflow-hidden p-0">
                  <div className="relative h-48 w-full bg-canvas-deep">
                    <Image
                      src={market.image}
                      alt={`Cover image for ${market.name}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-surface/90 backdrop-blur-sm text-ink text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                        {market.venueType === "supermarket" ? "Supermarket" : "Open-air Market"}
                      </span>
                      {market.status === "pilot" ? (
                        <span className="bg-brand-green/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          Live Now
                        </span>
                      ) : (
                        <span className="bg-ink/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-2">
                      <h3 className="font-display font-bold text-xl text-ink leading-tight mb-1">{market.name}</h3>
                      <p className="text-sm text-muted">{market.city}, {market.state}</p>
                    </div>
                    
                    <p className="text-sm text-ink mb-6 line-clamp-2">{market.blurb}</p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {market.categories.map((cat) => (
                        <span key={cat} className="text-xs bg-canvas-deep text-muted px-2 py-1 rounded-md capitalize">
                          {cat}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex gap-3">
                      {market.status === "pilot" ? (
                        <Link 
                          href={`/shop?market=${market.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 min-h-[44px] font-semibold text-base transition-all duration-150 select-none active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-brand-orange text-[#1A1A1A] shadow-sm hover:bg-brand-orange-dark hover:shadow active:bg-brand-orange-dark focus-visible:ring-brand-orange"
                        >
                          Shop here
                        </Link>
                      ) : (
                        <Button className="flex-1" variant="neutral">Join waitlist</Button>
                      )}
                      <Link 
                        href={`/markets/${market.id}`}
                        className="flex items-center justify-center min-h-[44px] rounded-2xl px-5 font-semibold active:scale-[0.98] border border-line hover:bg-canvas-deep transition-colors"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Section>
      
      <WavyDivider />

      <Section
        title="Don't see your city?"
        lede="We're expanding fast. Drop your city below and we'll bump it up the list."
        bg="canvas-deep"
        narrow
        className="text-center"
      >
        <form className="max-w-md mx-auto flex gap-2 mt-8" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            placeholder="E.g. Port Harcourt, Kano..."
            className="flex-1 h-[44px] rounded-2xl px-4 border border-line bg-surface text-ink focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            required
          />
          <Button type="submit">Vote</Button>
        </form>
      </Section>
    </>
  );
}
