import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe("Markdown", () => {
  it("renders bold, italic, lists and paragraphs", () => {
    expect(html("**bold** and *italic*")).toContain("<strong>bold</strong>");
    expect(html("**bold** and *italic*")).toContain("<em>italic</em>");
    expect(html("- one\n- two")).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html("1. a\n2. b")).toContain("<ol>");
    expect(html("para one\n\npara two").match(/<p>/g)).toHaveLength(2);
  });

  it("links only http(s) URLs, opening safely", () => {
    const out = html("[site](https://example.com/x)");
    expect(out).toContain('href="https://example.com/x"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("never creates javascript: links", () => {
    const out = html("[click](javascript:alert(1))");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("href");
  });

  it("escapes raw HTML (React text nodes)", () => {
    const out = html("<script>alert(1)</script> <img src=x onerror=alert(1)>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });
});
