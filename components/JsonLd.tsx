/**
 * Emits a schema.org JSON-LD block. Structured data must be a real script
 * tag in the HTML so crawlers see it without executing the page.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built by our own code from local content, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
