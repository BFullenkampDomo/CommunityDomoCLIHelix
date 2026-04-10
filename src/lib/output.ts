/**
 * Standardized CLI output. JSON to stdout on success, structured error to stderr on failure.
 */
export async function output(
  res: Response,
  transform?: (data: unknown) => unknown
): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = { error: true, status: res.status, message: text };
    console.error(JSON.stringify(err, null, 2));
    process.exit(1);
  }

  let data: unknown = await res.json();
  if (transform) data = transform(data);
  console.log(JSON.stringify(data, null, 2));
}
