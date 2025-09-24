// Teste rápido da nova lógica
console.log("🧪 Testando nova lógica: tempo até o FINAL do slot");

function generateTimeSlots(date, isWeekend = false, minHours = 1, currentTime = new Date()) {
    const windows = isWeekend
        ? [{ start: "08:00", end: "11:00" }]
        : [
            { start: "07:30", end: "12:00" },
            { start: "14:00", end: "17:00" },
        ];

    const slots = [];

    windows.forEach((window) => {
        const startTime = window.start.split(":");
        const endTime = window.end.split(":");
        const startHour = parseInt(startTime[0]);
        const startMinute = parseInt(startTime[1]);
        const endHour = parseInt(endTime[0]);
        const endMinute = parseInt(endTime[1]) || 0;

        // Gerar todos os slots possíveis
        const possibleSlots = [];

        // 1. Slots do padrão da janela
        let currentMinutes = startHour * 60 + startMinute;
        const windowEndMinutes = endHour * 60 + endMinute;

        while (currentMinutes < windowEndMinutes) {
            let nextSlotMinutes = currentMinutes + 60;
            if (nextSlotMinutes > windowEndMinutes) {
                nextSlotMinutes = windowEndMinutes;
            }

            possibleSlots.push({ start: currentMinutes, end: nextSlotMinutes });
            currentMinutes = nextSlotMinutes;
        }

        // 2. Slots de hora em hora
        for (let hour = startHour; hour < endHour; hour++) {
            const slotStart = hour * 60;
            let slotEnd = (hour + 1) * 60;

            if (slotStart >= startHour * 60 + startMinute && slotEnd <= windowEndMinutes) {
                possibleSlots.push({ start: slotStart, end: slotEnd });
            } else if (slotStart >= startHour * 60 + startMinute && slotStart < windowEndMinutes) {
                possibleSlots.push({ start: slotStart, end: windowEndMinutes });
            }
        }

        // Remover duplicatas e ordenar
        const uniqueSlots = possibleSlots
            .filter((slot, index, arr) =>
                arr.findIndex(s => s.start === slot.start && s.end === slot.end) === index
            )
            .sort((a, b) => a.start - b.start);

        uniqueSlots.forEach(slot => {
            const slotStartHour = Math.floor(slot.start / 60);
            const slotStartMin = slot.start % 60;
            const slotEndHour = Math.floor(slot.end / 60);
            const slotEndMin = slot.end % 60;

            const slotStart = `${slotStartHour.toString().padStart(2, "0")}:${slotStartMin.toString().padStart(2, "0")}`;
            const slotEnd = `${slotEndHour.toString().padStart(2, "0")}:${slotEndMin.toString().padStart(2, "0")}`;

            const slotEndDateTime = new Date(date);
            slotEndDateTime.setHours(slotEndHour, slotEndMin, 0, 0);

            const isToday = date.toDateString() === currentTime.toDateString();

            if (isToday) {
                // NOVA LÓGICA: verificar se há tempo até o FINAL do slot
                const minRequiredTime = new Date(currentTime.getTime() + minHours * 60 * 60 * 1000);

                if (minRequiredTime.getTime() <= slotEndDateTime.getTime()) {
                    slots.push(`${slotStart} - ${slotEnd}`);
                }
            } else {
                const minDeliveryTime = new Date(currentTime.getTime() + minHours * 60 * 60 * 1000);
                const slotStartDateTime = new Date(date);
                slotStartDateTime.setHours(slotStartHour, slotStartMin, 0, 0);

                if (slotStartDateTime.getTime() >= minDeliveryTime.getTime()) {
                    slots.push(`${slotStart} - ${slotEnd}`);
                }
            }
        });
    });

    return [...new Set(slots)].sort();
}

// Teste: 10:30 com 1h de preparo
const now = new Date();
now.setHours(10, 30, 0, 0);

console.log("\n⏰ Agora são:", now.toLocaleTimeString("pt-BR"));
console.log("🎯 Com 1h de preparo, término seria:", new Date(now.getTime() + 60 * 60 * 1000).toLocaleTimeString("pt-BR"));
console.log("📅 Slots disponíveis:", generateTimeSlots(now, false, 1, now));

console.log("\n🔍 O slot 11:00-12:00 deveria estar disponível?");
console.log("   10:30 + 1h = 11:30, e 11:30 <= 12:00 (final do slot)");
console.log("   Resposta: SIM! ✅");