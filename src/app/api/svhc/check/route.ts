import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Call verify-update GET for a test / placeholder
    const res = await fetch("http://localhost:3000/api/svhc/verify-update");
    const data = await res.json();

    if (!data.match) {
      return NextResponse.json({
        update_found: false,
        message: "No recent verified SVHC update"
      });
    }

    return NextResponse.json({
      update_found: true,
      article_card: {
        title: data.match.title,
        url: data.match.url,
        summary: data.summary,
        published_date: data.update.published_date,
        impact_level: data.impact_level,
        matches: data.matches
      },
      update_date: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("Error in /api/svhc/check:", err.message);
    return NextResponse.json({
      update_found: false,
      message: "Failed to fetch SVHC update"
    });
  }
}
