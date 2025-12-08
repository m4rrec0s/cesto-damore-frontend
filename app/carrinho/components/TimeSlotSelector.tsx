"use client";

interface TimeSlot {
  value: string;
  label: string;
}

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedValue: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function TimeSlotSelector({
  slots,
  selectedValue,
  onSelect,
  disabled = false,
}: TimeSlotSelectorProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Nenhum horário disponível para esta data</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        title="Selecione um horário de entrega"
        value={selectedValue}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border-2 font-medium text-sm bg-white appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500
          transition-all duration-200
          ${
            selectedValue
              ? "border-rose-500 text-gray-900"
              : "border-gray-200 text-gray-500"
          }
          ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-gray-100"
              : "hover:border-rose-300"
          }`}
      >
        <option value="">Selecione um horário</option>
        {slots.map((slot) => (
          <option key={slot.value} value={slot.value}>
            {slot.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-[calc(50%+8px)] transform -translate-y-1/2 pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
