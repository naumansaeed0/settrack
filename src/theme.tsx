import { useEffect, useState } from "react";
export function ThemeControl() {
  const [choice, setChoice] = useState(() => {
    try {
      return localStorage.getItem("settrack:theme") || "system";
    } catch {
      return "system";
    }
  });
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        choice === "system" ? (media.matches ? "dark" : "light") : choice;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach(
          (meta) =>
            (meta.content = resolved === "dark" ? "#080f19" : "#edf3f6"),
        );
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("settrack:theme", choice);
    } catch {
      /*Session choice remains usable.*/
    }
    return () => media.removeEventListener("change", apply);
  }, [choice]);
  return (
    <label className="theme-control">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
      >
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>
  );
}
