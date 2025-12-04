"use client";

export default function ScanButton({ regulation }: { regulation: string }) {
  const runScan = async () => {
    await fetch(`/api/regulations/${regulation}`);
    location.reload();
  };

  return (
    <button
      onClick={runScan}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Start New Scan
    </button>
  );
}
