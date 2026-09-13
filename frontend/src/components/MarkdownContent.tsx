import React from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Helper to parse inline formatting: **bold**, *italic*, `code`, [link](url)
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*{2}|_{2})(.*?)\1/);
      if (boldMatch) {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-teal-950">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Inline code: `code`
      const codeMatch = remaining.match(/^\`([^\`]+)\`/);
      if (codeMatch) {
        parts.push(
          <code
            key={keyIdx++}
            className="rounded bg-teal-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-teal-900 border border-teal-200"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Markdown Link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 underline font-medium hover:text-teal-900"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
      if (italicMatch) {
        parts.push(
          <em key={keyIdx++} className="italic text-slate-700">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Find next token
      const nextIdx = remaining.search(/(\*{1,2}|_{1,2}|\`|\[)/);
      if (nextIdx === -1) {
        parts.push(remaining);
        break;
      } else if (nextIdx === 0) {
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        parts.push(remaining.slice(0, nextIdx));
        remaining = remaining.slice(nextIdx);
      }
    }

    return parts;
  };

  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === "ul") {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-teal-600">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-decimal marker:text-teal-700">
            {listItems}
          </ol>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={`blank-${idx}`} className="h-2" />);
      return;
    }

    // Headings
    if (/^###\s+/.test(trimmed)) {
      flushList();
      elements.push(
        <h4 key={`h4-${idx}`} className="mt-3 mb-1 text-sm font-bold text-teal-950">
          {renderInline(trimmed.replace(/^###\s+/, ""))}
        </h4>
      );
      return;
    }

    if (/^##\s+/.test(trimmed)) {
      flushList();
      elements.push(
        <h3 key={`h3-${idx}`} className="mt-3 mb-1 text-base font-extrabold text-teal-950">
          {renderInline(trimmed.replace(/^##\s+/, ""))}
        </h3>
      );
      return;
    }

    if (/^#\s+/.test(trimmed)) {
      flushList();
      elements.push(
        <h2 key={`h2-${idx}`} className="mt-4 mb-2 text-lg font-black text-teal-950">
          {renderInline(trimmed.replace(/^#\s+/, ""))}
        </h2>
      );
      return;
    }

    // Bullet list item
    const ulMatch = trimmed.match(/^([-*•])\s+(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(
        <li key={`li-${idx}`} className="leading-relaxed">
          {renderInline(ulMatch[2])}
        </li>
      );
      return;
    }

    // Numbered list item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(
        <li key={`oli-${idx}`} className="leading-relaxed">
          {renderInline(olMatch[2])}
        </li>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

export default MarkdownContent;
