export type PageResult<T> = { data: T[] | null; error: unknown | null };

export async function collectAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = 500,
): Promise<PageResult<T>> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    return { data: null, error: new Error('Invalid page size.') };
  }
  const all: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const result = await fetchPage(offset, offset + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    const page = result.data ?? [];
    all.push(...page);
    if (page.length < pageSize) return { data: all, error: null };
  }
}
