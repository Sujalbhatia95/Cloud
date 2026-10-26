import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Placeholder } from "./Placeholder";

/**
 * Renders admin-edited Markdown safely (raw HTML is not rendered). Placeholders like
 * "[DEMO ONLY — …]" are highlighted so they cannot be mistaken for real information.
 */
export function Markdown({ source }: { source: string }) {
  // Turn placeholders into a link with a sentinel href, then render that link as a highlighted span.
  const prepared = source.replace(/\[(DEMO ONLY[^\]]*)\]/g, (_, inner: string) => `[${inner.replace(/[[\]]/g, "")}](#placeholder)`);
  return (
    <div className="prose-legal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            if (href === "#placeholder") return <Placeholder text={`[${String(children)}]`} />;
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
