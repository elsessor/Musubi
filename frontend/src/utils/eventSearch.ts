export function matchesEventSearch(event: { title?: string; description?: string; committee?: string; location?: string }, query: string): boolean {
  const search = query.trim().toLocaleLowerCase();
  return !search || [event.title, event.description, event.committee, event.location]
    .some((value) => value?.toLocaleLowerCase().includes(search));
}
