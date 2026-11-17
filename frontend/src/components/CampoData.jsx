import { mascararData } from "../utils/data.js";

export default function CampoData({ label, value, onChange, placeholder = "dd/mm/aaaa" }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(mascararData(e.target.value))}
        className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
      />
    </label>
  );
}