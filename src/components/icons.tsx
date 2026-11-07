// Minimal favicons/placeholder files to keep metadata links valid.
// The admin uploads real images via Supabase Storage.

export function AppleTouchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
      <rect width="180" height="180" rx="36" fill="#b45309" />
      <text x="50%" y="50%" fontSize="120" textAnchor="middle" dy=".35em" fill="#fff">
        M
      </text>
    </svg>
  );
}

export function PlaceholderLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <rect width="128" height="128" rx="24" fill="#b45309" />
      <text x="50%" y="50%" fontSize="72" textAnchor="middle" dy=".35em" fill="#fff">
        M
      </text>
    </svg>
  );
}
