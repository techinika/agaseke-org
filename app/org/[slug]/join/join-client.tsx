"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Shield,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PublicOrgHeader from "@/components/shared/public-org-header";
import PublicOrgFooter from "@/components/shared/public-org-footer";
import { useActiveTiers } from "@/hooks/use-tiers";
import { useOrganizationBySlug } from "@/hooks/use-organization";
import { useOrgMembers } from "@/hooks/use-members";
import { useAuthStore } from "@/store/auth-store";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { BrandColorWrapper } from "@/components/shared/brand-color-wrapper";
import { OrgNotFound } from "@/components/shared/org-not-found";
import type { OrgServerData } from "@/lib/firebase/server";
import type { Organization } from "@/types/organization";

interface JoinClientProps {
  slug: string;
  initialOrg: OrgServerData | null;
}

export default function JoinClient({ slug, initialOrg }: JoinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { data: queryOrg, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const org = (queryOrg ?? initialOrg) as Organization | null | undefined;
  const { data: tiers, isLoading: tiersLoading } = useActiveTiers(
    org?.id ?? "",
  );
  const { data: members } = useOrgMembers(org?.id ?? "", "active");

  const preselectedTierId = searchParams.get("tierId");

  if (preselectedTierId && !orgLoading && !tiersLoading) {
    const tierExists = tiers?.some((t) => t.id === preselectedTierId);
    if (tierExists) {
      if (!user) {
        router.push(
          `/auth/login?redirect=/org/${slug}/join?tierId=${preselectedTierId}`,
        );
        return null;
      }
      router.replace(`/org/${slug}/join/checkout?tierId=${preselectedTierId}`);
      return null;
    }
  }

  function handleJoin(tierId: string) {
    if (!user) {
      router.push(`/auth/login?redirect=/org/${slug}/join`);
      return;
    }
    router.push(`/org/${slug}/join/checkout?tierId=${tierId}`);
  }

  if (orgLoading || tiersLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-5xl px-4">
          <Skeleton className="mx-auto mb-4 h-10 w-64" />
          <Skeleton className="mx-auto mb-12 h-6 w-96" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return <OrgNotFound icon={Users} />;
  }

  return (
    <BrandColorWrapper org={org}>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />
        <div className="relative h-48 bg-gradient-to-br from-primary/90 via-primary/60 to-primary/30 sm:h-56">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-end gap-4">
                {org.logoURL && (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg sm:size-20">
                    <img
                      src={org.logoURL}
                      alt={org.name}
                      className="size-full rounded-xl object-cover"
                    />
                  </div>
                )}
                <div className="pb-1">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                    Join {org.name}
                  </h1>
                  <p
                    className="mt-1 max-w-2xl text-sm text-white/80 sm:text-base"
                    dangerouslySetInnerHTML={{ __html: org.description }}
                  ></p>
                  {members && (
                    <p className="mt-1 text-xs text-white/60 sm:text-sm">
                      {members.length} member{members.length !== 1 ? "s" : ""}{" "}
                      and growing
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          {tiers && tiers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className={`group relative rounded-2xl border bg-card transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    index === 1 ? "border-primary shadow-md" : ""
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary px-4 py-1 text-xs font-semibold shadow-sm">
                        <Star className="mr-1 size-3" /> Popular
                      </Badge>
                    </div>
                  )}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl ${
                          index === 1
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {index === 0 ? (
                          <Shield className="size-5" />
                        ) : index === 1 ? (
                          <Sparkles className="size-5" />
                        ) : (
                          <Star className="size-5" />
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {tier.description}
                    </p>

                    <div className="mt-6">
                      <span className="text-4xl font-bold">
                        {CURRENCY_SYMBOL}
                        {tier.price}
                      </span>
                      <span className="ml-1.5 text-sm text-muted-foreground">
                        /
                        {tier.billingCycle === "one_time"
                          ? "once"
                          : tier.billingCycle === "monthly"
                            ? "month"
                            : "year"}
                      </span>
                    </div>

                    {tier.benefits.length > 0 && (
                      <ul className="mt-6 space-y-3">
                        {tier.benefits.map((benefit, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm"
                          >
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className={`mt-8 w-full h-12 text-base font-semibold ${
                        index === 1 ? "shadow-md" : ""
                      }`}
                      variant={index === 1 ? "default" : "outline"}
                      onClick={() => handleJoin(tier.id)}
                    >
                      {tier.price === 0 ? "Join for free" : `Join ${tier.name}`}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <Users className="mx-auto mb-4 size-12 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">
                No membership tiers available
              </h2>
              <p className="mt-2 text-muted-foreground">
                This organization hasn&apos;t set up membership options yet.
                Check back later.
              </p>
            </div>
          )}
        </div>
        <PublicOrgFooter />
      </div>
    </BrandColorWrapper>
  );
}
