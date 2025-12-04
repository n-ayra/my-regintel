import type { RegConfig } from "@/lib/core/pipeline";

export const SVHC_CONFIG: RegConfig = {
  id: "svhc_eu_reach",
  searchQueries: [
    "EU REACH SVHC regulation updates Annex XIV",
  ],
  primarySourceUrl: "https://echa.europa.eu/recommendations-for-inclusion-in-the-authorisation-list",
  allowedDomains: ["echa.europa.eu", "assent.com", "subsportplus.eu"],
  triggerWords: ["SVHC", "Annex XIV", "authorisation", "candidate list"],
  maxArticles: 10, // limit to 10 articles per scan
};
