"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SIZES } from "@/lib/constants";
import type { BusinessRecord } from "@/types";

/** Group businesses by industry then by size */
function groupByIndustryAndSize(businesses: BusinessRecord[]) {
  const byIndustry = new Map<string, Map<string, BusinessRecord[]>>();
  for (const b of businesses) {
    const ind = b.industry ?? "Other";
    if (!byIndustry.has(ind)) byIndustry.set(ind, new Map());
    const bySize = byIndustry.get(ind)!;
    const size = b.size ?? "Small";
    if (!bySize.has(size)) bySize.set(size, []);
    bySize.get(size)!.push(b);
  }
  // Sort sizes: Small, Medium, Large
  for (const bySize of byIndustry.values()) {
    const order = [...bySize.entries()].sort((a, b) => {
      const i = SIZES.indexOf(a[0] as (typeof SIZES)[number]);
      const j = SIZES.indexOf(b[0] as (typeof SIZES)[number]);
      return (i === -1 ? 99 : i) - (j === -1 ? 99 : j);
    });
    bySize.clear();
    for (const [s, list] of order) bySize.set(s, list);
  }
  return byIndustry;
}

export interface IndustryAccordionProps {
  businesses: BusinessRecord[];
  renderBusiness?: (b: BusinessRecord) => React.ReactNode;
}

export function IndustryAccordion({ businesses, renderBusiness }: IndustryAccordionProps) {
  const grouped = groupByIndustryAndSize(businesses);
  const industryOrder = Array.from(grouped.keys()).sort();

  return (
    <Accordion type="multiple" className="w-full" defaultValue={industryOrder}>
      {industryOrder.map((industry) => {
        const bySize = grouped.get(industry)!;
        const sizeOrder = Array.from(bySize.keys()).sort((a, b) => {
          const i = SIZES.indexOf(a as (typeof SIZES)[number]);
          const j = SIZES.indexOf(b as (typeof SIZES)[number]);
          return (i === -1 ? 99 : i) - (j === -1 ? 99 : j);
        });
        const total = sizeOrder.reduce((acc, s) => acc + (bySize.get(s)?.length ?? 0), 0);
        return (
          <AccordionItem key={industry} value={industry}>
            <AccordionTrigger>
              {industry} <span className="text-muted-foreground font-normal">({total})</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-1">
                {sizeOrder.map((size) => {
                  const list = bySize.get(size) ?? [];
                  if (list.length === 0) return null;
                  return (
                    <div key={size}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{size}</h4>
                      <ul className="space-y-1">
                        {list.map((b) => (
                          <li key={b.id}>
                            {renderBusiness ? (
                              renderBusiness(b)
                            ) : (
                              <span>
                                {b.name}
                                {b.rating != null && (
                                  <span className="text-muted-foreground text-sm ml-2">
                                    ★ {b.rating} ({b.reviews})
                                  </span>
                                )}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
