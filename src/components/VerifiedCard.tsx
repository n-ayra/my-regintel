"use client";
import { useState } from "react";

export default function VerifiedCard({ item }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="p-4 border rounded shadow cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <h3 className="font-semibold">{item.deduced_title}</h3>
      <span className={`text-sm ${item.impact_level === "High" ? "text-red-500" : "text-green-500"}`}>
        {item.impact_level}
      </span>
      <p className="text-xs text-gray-500">{item.created_at}</p>

      {open && (
        <div className="mt-4 space-y-2">
          <p>{item.summary_text}</p>
          <a className="text-blue-600 underline" href={item.primary_source_url}>
            Primary Source
          </a>
        </div>
      )}
    </div>
  );
}
