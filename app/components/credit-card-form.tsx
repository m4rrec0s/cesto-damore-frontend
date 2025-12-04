"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/components/ui/field";
import { motion } from "framer-motion";
import { useApi } from "@/app/hooks/use-api";

export interface CreditCardData {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
  email: string;
  installments: number;
  issuer_id?: string;
  payment_method_id?: string;
}

interface CreditCardFormProps {
  onSubmit: (data: CreditCardData) => Promise<void>;
  isProcessing?: boolean;
  defaultEmail?: string;
  defaultName?: string;
  amount: number;
}

interface ValidationErrors {
  cardNumber?: string;
  cardholderName?: string;
  expirationMonth?: string;
  expirationYear?: string;
  securityCode?: string;
  identificationType?: string;
  identificationNumber?: string;
  email?: string;
}

// Algoritmo de Luhn para validar número do cartão
const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(cleanNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

// Detecta a bandeira do cartão
const detectCardBrand = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s/g, "");

  const patterns: Record<string, RegExp> = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2[2-7])/,
    amex: /^3[47]/,
    elo: /^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6500|6504|6505|6507|6509|6516|6550)/,
  };

  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanNumber)) {
      return brand;
    }
  }

  return "unknown";
};

// Valida CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, "");
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number.parseInt(cleanCPF[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== Number.parseInt(cleanCPF[10])) return false;

  return true;
};

// Valida CNPJ
const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, "");
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== Number.parseInt(cleanCNPJ[12])) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number.parseInt(cleanCNPJ[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== Number.parseInt(cleanCNPJ[13])) return false;

  return true;
};

const cardBrandIcons: Record<
  string,
  { label: string; svgPath?: string; gradient: string }
> = {
  visa: {
    label: "Visa",
    svgPath: "/visa.svg",
    gradient: "from-blue-600 to-blue-500",
  },
  mastercard: {
    label: "Mastercard",
    svgPath: "/mastercard.svg",
    gradient: "from-red-600 to-orange-500",
  },
  amex: {
    label: "American Express",
    svgPath: "/american-express.svg",
    gradient: "from-cyan-600 to-blue-500",
  },
  elo: {
    label: "Elo",
    svgPath: "/elo.svg",
    gradient: "from-purple-600 to-pink-500",
  },
  unknown: { label: "Cartão", gradient: "from-gray-500 to-gray-400" },
};

export function CreditCardForm({
  onSubmit,
  isProcessing = false,
  defaultEmail = "",
  defaultName = "",
  amount,
}: CreditCardFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState(defaultName);
  const [expirationMonth, setExpirationMonth] = useState("");
  const [expirationYear, setExpirationYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [identificationType, setIdentificationType] = useState("CPF");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [installments, setInstallments] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [cardBrand, setCardBrand] = useState<string>("unknown");
  const [formError, setFormError] = useState<string | null>(null);
  const [installmentsList, setInstallmentsList] = useState<
    Array<{
      installments: number;
      recommended_installments?: boolean;
      installment_rate?: number;
      discount?: number;
      installment_amount?: number;
      total_amount?: number;
      recommended_message?: string;
    }>
  >([]);
  const [issuerId, setIssuerId] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const api = useApi();

  const generateDefaultInstallments = useCallback(() => {
    const defaultList = [];
    for (let i = 1; i <= 12; i++) {
      defaultList.push({
        installments: i,
        recommended_message: `${i}x de ${(amount / i).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}`,
        installment_amount: amount / i,
        total_amount: amount,
      });
    }
    setInstallmentsList(defaultList);
  }, [amount]);

  const fetchInstallments = useCallback(
    async (bin: string) => {
      try {
        const response = await api.getInstallments(amount, bin);
        if (response.success && response.payer_costs) {
          setInstallmentsList(response.payer_costs);
          setIssuerId(response.issuer?.id);
          setPaymentMethodId(response.payment_method_id);

          // Resetar seleção se não for válida
          if (
            !response.payer_costs.find(
              (i: { installments: number }) => i.installments === installments
            )
          ) {
            setInstallments(1);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar parcelas:", error);
        // Fallback para parcelas padrão se falhar
        generateDefaultInstallments();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [amount, installments, generateDefaultInstallments]
  );

  useEffect(() => {
    if (cardNumber) {
      const brand = detectCardBrand(cardNumber);
      setCardBrand(brand);

      // Buscar parcelas se tivermos pelo menos 6 dígitos (BIN)
      const cleanNumber = cardNumber.replace(/\s/g, "");
      if (cleanNumber.length >= 6) {
        const bin = cleanNumber.substring(0, 6);
        fetchInstallments(bin);
      }
    } else {
      setCardBrand("unknown");
      setInstallmentsList([]);
    }
  }, [cardNumber, amount, installments, fetchInstallments]);

  // Formatação do número do cartão (XXXX XXXX XXXX XXXX)
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // 16 dígitos + 3 espaços
  };

  // Formatação do CPF (XXX.XXX.XXX-XX)
  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return cleaned.substring(0, 11);
  };

  // Formatação do CNPJ (XX.XXX.XXX/XXXX-XX)
  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
    return cleaned.substring(0, 14);
  };

  const handleIdentificationChange = (value: string) => {
    if (identificationType === "CPF") {
      setIdentificationNumber(formatCPF(value));
    } else {
      setIdentificationNumber(formatCNPJ(value));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validar número do cartão
    if (!cardNumber.trim()) {
      newErrors.cardNumber = "Número do cartão é obrigatório";
    } else if (!validateCardNumber(cardNumber)) {
      newErrors.cardNumber = "Número do cartão inválido";
    }

    // Validar nome do titular
    if (!cardholderName.trim()) {
      newErrors.cardholderName = "Nome do titular é obrigatório";
    }
    // else if (cardholderName.trim().split(" ").length < 2) {
    //   newErrors.cardholderName = "Informe nome e sobrenome";
    // }

    // Validar mês de expiração
    if (!expirationMonth) {
      newErrors.expirationMonth = "Mês é obrigatório";
    } else {
      const month = Number.parseInt(expirationMonth);
      if (month < 1 || month > 12) {
        newErrors.expirationMonth = "Mês inválido";
      }
    }

    // Validar ano de expiração
    if (!expirationYear) {
      newErrors.expirationYear = "Ano é obrigatório";
    } else {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const year = Number.parseInt(expirationYear);

      if (year < currentYear) {
        newErrors.expirationYear = "Cartão expirado";
      } else if (
        year === currentYear &&
        Number.parseInt(expirationMonth) < currentMonth
      ) {
        newErrors.expirationMonth = "Cartão expirado";
      }
    }

    // Validar CVV
    if (!securityCode.trim()) {
      newErrors.securityCode = "CVV é obrigatório";
    } else if (!/^\d{3,4}$/.test(securityCode)) {
      newErrors.securityCode = "CVV inválido (3 ou 4 dígitos)";
    }

    // Validar documento
    if (!identificationNumber.trim()) {
      newErrors.identificationNumber = `${identificationType} é obrigatório`;
    } else {
      const cleanDoc = identificationNumber.replace(/\D/g, "");
      if (identificationType === "CPF") {
        if (!validateCPF(cleanDoc)) {
          newErrors.identificationNumber = "CPF inválido";
        }
      } else if (identificationType === "CNPJ") {
        if (!validateCNPJ(cleanDoc)) {
          newErrors.identificationNumber = "CNPJ inválido";
        }
      }
    }

    // Validar email
    if (!email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError("Por favor, corrija os erros no formulário");
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    const cleanIdentification = identificationNumber.replace(/\D/g, "");

    try {
      await onSubmit({
        cardNumber: cleanCardNumber,
        cardholderName: cardholderName.trim(),
        expirationMonth,
        expirationYear,
        securityCode,
        identificationType,
        identificationNumber: cleanIdentification,
        email: email.trim(),
        installments,
        issuer_id: issuerId || undefined,
        payment_method_id: paymentMethodId || undefined,
      });
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Erro ao processar pagamento. Tente novamente."
      );
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);

  return (
    <Card className="p-8 bg-white border-slate-200 rounded-2xl shadow-md w-full">
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {formError}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="cardNumber">Número do Cartão *</FieldLabel>
              <div className="relative">
                <Input
                  id="cardNumber"
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className={`pr-40 text-lg tracking-widest font-semibold ${
                    errors.cardNumber ? "border-red-500" : ""
                  }`}
                />
                {cardBrand !== "unknown" && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute right-3 -top-1.5 overflow-hidden"
                  >
                    {cardBrandIcons[cardBrand].svgPath ? (
                      <Image
                        src={cardBrandIcons[cardBrand].svgPath!}
                        alt={cardBrandIcons[cardBrand].label}
                        width={46}
                        height={25}
                        className="object-contain"
                      />
                    ) : (
                      <div
                        className={`px-4 py-2 rounded-lg bg-gradient-to-r ${cardBrandIcons[cardBrand].gradient} text-white text-sm font-bold`}
                      >
                        {cardBrandIcons[cardBrand].label}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              <FieldDescription>
                Digite os 13 a 19 dígitos do seu cartão
              </FieldDescription>
              <FieldError>{errors.cardNumber}</FieldError>
            </FieldContent>
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="cardholderName">
                Nome do Titular *
              </FieldLabel>
              <Input
                id="cardholderName"
                type="text"
                value={cardholderName}
                onChange={(e) =>
                  setCardholderName(
                    e.target.value.toUpperCase().substring(0, 50)
                  )
                }
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className={errors.cardholderName ? "border-red-500" : ""}
              />
              <FieldDescription>
                Exatamente como aparece no cartão
              </FieldDescription>
              <FieldError>{errors.cardholderName}</FieldError>
            </FieldContent>
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="expirationMonth">Mês *</FieldLabel>
                <Select
                  value={expirationMonth}
                  onValueChange={setExpirationMonth}
                >
                  <SelectTrigger
                    id="expirationMonth"
                    className={errors.expirationMonth ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = (i + 1).toString().padStart(2, "0");
                      return (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FieldError>{errors.expirationMonth}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="expirationYear">Ano *</FieldLabel>
                <Select
                  value={expirationYear}
                  onValueChange={setExpirationYear}
                >
                  <SelectTrigger
                    id="expirationYear"
                    className={errors.expirationYear ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="AAAA" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.expirationYear}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldContent>
                <FieldLabel htmlFor="securityCode">CVV *</FieldLabel>
                <Input
                  id="securityCode"
                  type="password"
                  inputMode="numeric"
                  value={securityCode}
                  onChange={(e) =>
                    setSecurityCode(
                      e.target.value.replace(/\D/g, "").substring(0, 4)
                    )
                  }
                  placeholder="•••"
                  maxLength={4}
                  className={errors.securityCode ? "border-red-500" : ""}
                />
                <FieldError>{errors.securityCode}</FieldError>
              </FieldContent>
            </Field>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field>
              <FieldContent>
                <FieldLabel htmlFor="identificationType">
                  Documento *
                </FieldLabel>
                <Select
                  value={identificationType}
                  onValueChange={(value) => {
                    setIdentificationType(value);
                    setIdentificationNumber("");
                  }}
                >
                  <SelectTrigger id="identificationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>

            <Field className="sm:col-span-2">
              <FieldContent>
                <FieldLabel htmlFor="identificationNumber">
                  Número do {identificationType} *
                </FieldLabel>
                <Input
                  id="identificationNumber"
                  type="text"
                  inputMode="numeric"
                  value={identificationNumber}
                  onChange={(e) => handleIdentificationChange(e.target.value)}
                  placeholder={
                    identificationType === "CPF"
                      ? "000.000.000-00"
                      : "00.000.000/0000-00"
                  }
                  className={
                    errors.identificationNumber ? "border-red-500" : ""
                  }
                />
                <FieldError>{errors.identificationNumber}</FieldError>
              </FieldContent>
            </Field>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="email">Email para recibo *</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              <FieldError>{errors.email}</FieldError>
            </FieldContent>
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="installments">Parcelar em *</FieldLabel>
              <Select
                value={installments.toString()}
                onValueChange={(value) => setInstallments(parseInt(value))}
              >
                <SelectTrigger id="installments" className="w-full">
                  <SelectValue placeholder="Selecione as parcelas" />
                </SelectTrigger>
                <SelectContent>
                  {installmentsList.length > 0 ? (
                    installmentsList.map(
                      (option: {
                        installments: number;
                        recommended_installments?: boolean;
                        installment_rate?: number;
                        installment_amount?: number;
                        recommended_message?: string;
                      }) => (
                        <SelectItem
                          key={option.installments}
                          value={option.installments.toString()}
                        >
                          {/* ✅ USAR recommended_message que já vem formatado com juros */}
                          {option.recommended_message ||
                            `${option.installments}x de R$ ${(
                              option.installment_amount ||
                              amount / option.installments
                            ).toFixed(2)}`}
                        </SelectItem>
                      )
                    )
                  ) : (
                    <SelectItem value="1">
                      1x de R$ {amount.toFixed(2)}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 mt-6"
        >
          <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Pagamento 100% seguro</p>
            <p className="text-xs mt-1">
              Seus dados são criptografados e protegidos
            </p>
          </div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          type="submit"
          disabled={isProcessing}
          className="w-full mt-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Lock className="h-5 w-5" />
              Confirmar Pagamento
            </>
          )}
        </motion.button>
      </form>
    </Card>
  );
}
