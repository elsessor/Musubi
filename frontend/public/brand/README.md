# Musubi brand assets

Place the shared system icon at `frontend/public/brand/musubi-logo.svg`.
Its public URL is `/brand/musubi-logo.svg`.

Replace this file to update the logo across the landing page, authentication
screens, dashboard and admin sidebars, and browser tab icon. Keep the SVG's
`viewBox` and transparent background so it scales on phones and desktops.

In React components, use `MusubiLogo` from `@/components/brand/MusubiLogo`
instead of adding another logo path or drawing the logo inline. Use
`decorative` when nearby text already names Musubi.
