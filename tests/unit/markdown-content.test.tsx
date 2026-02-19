import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownContent from "@/components/MarkdownContent";

describe("MarkdownContent", () => {
  it("renders plain text unchanged", () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders bold text as <strong>", () => {
    const { container } = render(
      <MarkdownContent content="This is **bold** text" />
    );
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe("bold");
  });

  it("renders italic text as <em>", () => {
    const { container } = render(
      <MarkdownContent content="This is *italic* text" />
    );
    const em = container.querySelector("em");
    expect(em).not.toBeNull();
    expect(em!.textContent).toBe("italic");
  });

  it("renders fenced code blocks with <pre><code>", () => {
    const { container } = render(
      <MarkdownContent content={'```js\nconsole.log("hi")\n```'} />
    );
    const pre = container.querySelector("pre");
    const code = container.querySelector("pre code");
    expect(pre).not.toBeNull();
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('console.log("hi")\n');
  });

  it("renders inline code with <code>", () => {
    const { container } = render(
      <MarkdownContent content="Use `console.log` for debugging" />
    );
    const codes = container.querySelectorAll("code");
    const inlineCode = Array.from(codes).find(
      (c) => !c.closest("pre") && c.textContent === "console.log"
    );
    expect(inlineCode).not.toBeUndefined();
    expect(inlineCode!.classList.contains("bg-black/30")).toBe(true);
  });

  it("renders unordered lists", () => {
    const { container } = render(
      <MarkdownContent content={"- Apple\n- Banana\n- Cherry"} />
    );
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
  });

  it("renders ordered lists", () => {
    const { container } = render(
      <MarkdownContent content={"1. First\n2. Second\n3. Third"} />
    );
    const ol = container.querySelector("ol");
    expect(ol).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
  });

  it("renders links with correct href", () => {
    const { container } = render(
      <MarkdownContent content="Visit [Example](https://example.com)" />
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("https://example.com");
    expect(link!.textContent).toBe("Example");
    expect(link!.getAttribute("target")).toBe("_blank");
  });

  it("renders headers with correct hierarchy", () => {
    const { container } = render(
      <MarkdownContent content={"# H1\n## H2\n### H3"} />
    );
    expect(container.querySelector("h1")?.textContent).toBe("H1");
    expect(container.querySelector("h2")?.textContent).toBe("H2");
    expect(container.querySelector("h3")?.textContent).toBe("H3");
  });

  it("renders GFM tables", () => {
    const { container } = render(
      <MarkdownContent
        content={"| A | B |\n|---|---|\n| 1 | 2 |"}
      />
    );
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("th").length).toBe(2);
    expect(container.querySelectorAll("td").length).toBe(2);
  });
});
