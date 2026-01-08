export function cleanHtml(raw?: string | null): string {
  if (!raw) {
    return "";
  }
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Reduce 3+ newlines to 2
    .trim();
}

interface DeltaOp {
  insert: string | object; // insert peut être une string ou un objet (ex: image)
  attributes?: Record<string, any>;
}

interface DeltaFormat {
  ops: DeltaOp[];
}

export function parseDeltaToText(input: DeltaFormat | string): string {
  let data: DeltaFormat;

  const formatForHtml = (txt: string) => {
    if (!txt) {
      return "";
    }
    return txt.replace(/\n/g, "<br/>").replace(/•/g, "<br/>•");
  };

  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch (error) {
      return formatForHtml(input);
    }
  } else {
    data = input;
  }

  if (!data || !data.ops || !Array.isArray(data.ops)) {
    return typeof input === "string" ? formatForHtml(input) : "";
  }

  const text = data.ops
    .map(op => {
      if (typeof op.insert === "string") {
        return op.insert;
      }
      return "";
    })
    .join("");
  return formatForHtml(text);
}
