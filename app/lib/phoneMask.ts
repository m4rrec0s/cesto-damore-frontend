/**
 * Formata número de telefone com máscara
 * Formato: +55 (XX) XXXXX-XXXX ou +55 (XX) XXXX-XXXX
 */
export function formatPhoneNumber(value: string): string {

  const numbers = value.replace(/\D/g, "");

  let cleaned = numbers;
  if (numbers.startsWith("55")) {
    cleaned = numbers.substring(2);
  }

  cleaned = cleaned.substring(0, 11);

  if (cleaned.length === 0) {
    return "";
  } else if (cleaned.length <= 2) {

    return `+55 (${cleaned}`;
  } else if (cleaned.length <= 6) {

    return `+55 (${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
  } else if (cleaned.length <= 10) {

    return `+55 (${cleaned.substring(0, 2)}) ${cleaned.substring(
      2,
      6
    )}-${cleaned.substring(6)}`;
  } else {

    return `+55 (${cleaned.substring(0, 2)}) ${cleaned.substring(
      2,
      7
    )}-${cleaned.substring(7, 11)}`;
  }
}

/**
 * Remove máscara do telefone, mantendo apenas dígitos
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida se o telefone está completo
 */
export function isValidPhone(value: string): boolean {
  const numbers = unformatPhoneNumber(value);

  return (
    numbers.length === 13 || numbers.length === 11 || numbers.length === 10
  );
}

/**
 * Normaliza telefone removendo o código do país e o 9 extra se necessário
 * Retorna no formato: DDDNNNNNNNNN (10 ou 11 dígitos)
 */
export function normalizePhoneForBackend(value: string): string {
  let numbers = unformatPhoneNumber(value);

  if (numbers.startsWith("55")) {
    numbers = numbers.substring(2);
  }

  if (numbers.length === 11) {

    return numbers;
  } else if (numbers.length === 10) {

    return numbers;
  }

  return numbers.substring(Math.max(0, numbers.length - 11));
}

/**
 * Normaliza telefone para formato internacional (com +55)
 */
export function normalizePhoneNumber(value: string): string {
  const numbers = unformatPhoneNumber(value);

  if (numbers.startsWith("55")) {
    return `+${numbers}`;
  }

  return `+55${numbers}`;
}

/**
 * Formata telefone para exibição
 * Ex: +5583988887777 -> +55 (83) 98888-7777
 */
export function displayPhoneNumber(value: string | null | undefined): string {
  if (!value) return "";

  const numbers = value.replace(/\D/g, "");

  if (numbers.startsWith("55") && numbers.length === 13) {

    const ddd = numbers.substring(2, 4);
    const firstPart = numbers.substring(4, 9);
    const secondPart = numbers.substring(9, 13);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  } else if (numbers.length === 11) {

    const ddd = numbers.substring(0, 2);
    const firstPart = numbers.substring(2, 7);
    const secondPart = numbers.substring(7, 11);
    return `+55 (${ddd}) ${firstPart}-${secondPart}`;
  }

  return value;
}
