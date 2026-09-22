export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-px w-full" />
      <div className="skeleton h-40 w-full" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
