/**
 * Minimal markdown renderer for help-center articles. Supports exactly the
 * subset the articles use — headings, paragraphs, lists, bold, inline code,
 * links, and callouts — rendered to styled React elements. No raw HTML ever
 * passes through, so article content can't inject markup.
 */

import React from "react";
import Link from "next/link";
import { Lightbulb, AlertTriangle } from "lucide-react";

// ── Inline formatting: **bold**, `code`, [text](href) ────────────────────────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Tokenize on bold / code / link patterns.
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern);
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-ink">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      out.push(
        <code key={key} className="rounded bg-white/[0.06] border border-edge px-1.5 py-0.5 font-mono text-[0.85em] text-amber-bright">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("[")) {
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        const [, label, href] = m;
        out.push(
          <Link key={key} href={href} className="text-amber underline underline-offset-2 hover:text-amber-bright">
            {label}
          </Link>
        );
      } else {
        out.push(part);
      }
    } else if (part) {
      out.push(part);
    }
  });
  return out;
}

// ── Block-level rendering ─────────────────────────────────────────────────────

export function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const flushList = (items: string[], ordered: boolean) => {
    const ListTag = ordered ? "ol" : "ul";
    blocks.push(
      <ListTag
        key={`b${key++}`}
        className={
          ordered
            ? "list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-ink-soft marker:text-amber/70 marker:font-semibold"
            : "list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-ink-soft marker:text-amber/60"
        }
      >
        {items.map((item, j) => (
          <li key={j}>{renderInline(item, `li${key}-${j}`)}</li>
        ))}
      </ListTag>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`b${key++}`} className="mt-10 mb-3 text-xl font-semibold text-ink first:mt-0">
          {renderInline(line.slice(3), `h${key}`)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`b${key++}`} className="mt-7 mb-2 text-base font-semibold text-ink">
          {renderInline(line.slice(4), `h${key}`)}
        </h3>
      );
      i++;
      continue;
    }

    // Callouts: "> tip: ..." and "> note: ..."
    if (line.startsWith("> ")) {
      const raw = line.slice(2);
      const isWarn = raw.toLowerCase().startsWith("note:") || raw.toLowerCase().startsWith("careful:");
      const body = raw.replace(/^(tip|note|careful):\s*/i, "");
      const Icon = isWarn ? AlertTriangle : Lightbulb;
      blocks.push(
        <div
          key={`b${key++}`}
          className={`my-4 flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${
            isWarn
              ? "border-orange-500/25 bg-orange-500/[0.05] text-orange-200/90"
              : "border-amber/25 bg-amber/[0.05] text-ink-soft"
          }`}
        >
          <Icon className={`size-4 shrink-0 mt-0.5 ${isWarn ? "text-orange-400" : "text-amber"}`} />
          <span>{renderInline(body, `c${key}`)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      flushList(items, false);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      flushList(items, true);
      continue;
    }

    // Paragraph: consume consecutive non-empty, non-special lines
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].startsWith("- ") &&
      !lines[i].startsWith("> ") &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b${key++}`} className="my-4 text-[15px] leading-relaxed text-ink-soft">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    );
  }

  return <>{blocks}</>;
}
