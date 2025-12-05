import type { RegConfig } from "@/lib/core/pipeline";

export const SVHC_CONFIG: RegConfig = {
  id: "svhc_eu_reach",
  searchQueries: [
    "EU REACH SVHC regulation updates as of now",
  ],
  primarySourceUrl: "https://echa.europa.eu/candidate-list-table",
  allowedDomains: ["echa.europa.eu", "assent.com", "subsportplus.eu"],
  triggerWords: ["SVHC", "Annex XIV", "authorisation", "candidate list"],
  maxArticles: 5, 
};
