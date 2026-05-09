export type ToolResult = {
  isError: true;
  content: [{ type: "text"; text: string }];
};

export function toolError(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function toolErrorFromUnknown(err: unknown): ToolResult {
  if (err instanceof Error) {
    return toolError(err.message);
  }
  return toolError(String(err));
}

export function zodError(issues: { message: string }[]): ToolResult {
  const text = issues.map((i) => i.message).join("; ");
  return toolError(`Validation error: ${text}`);
}
