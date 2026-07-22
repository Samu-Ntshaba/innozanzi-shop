"use client";

import { FormEvent, useState } from "react";

type UploadedFile = {
  name: string;
  path: string;
  size: number;
  type: string;
  url: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setUploaded(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Upload failed.");
      }

      setUploaded(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Upload a file</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Images and common documents up to 10 MB are supported.
        </p>

        <form className="mt-6 space-y-4" onSubmit={uploadFile}>
          <input
            className="block w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white"
            type="file"
            accept="image/*,.pdf,.txt,.csv,.zip,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <button
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!file || uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {uploaded && (
          <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">Upload complete</p>
            <a
              className="mt-1 block truncate underline"
              href={uploaded.url}
              target="_blank"
              rel="noreferrer"
            >
              {uploaded.name}
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
