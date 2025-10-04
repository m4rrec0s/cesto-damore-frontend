"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { CreditCard, Lock } from "lucide-react"

export interface CreditCardData {
  cardNumber: string
  cardholderName: string
  expirationMonth: string
  expirationYear: string
  securityCode: string
  identificationType: string
  identificationNumber: string
  email: string
  installments: number
}

interface CreditCardFormProps {
  onSubmit: (data: CreditCardData) => void
  isProcessing?: boolean
  defaultEmail?: string
  defaultName?: string
}

export function CreditCardForm({
  onSubmit,
  isProcessing = false,
  defaultEmail = "",
  defaultName = "",
}: CreditCardFormProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardholderName, setCardholderName] = useState(defaultName)
  const [expirationMonth, setExpirationMonth] = useState("")
  const [expirationYear, setExpirationYear] = useState("")
  const [securityCode, setSecurityCode] = useState("")
  const [identificationType, setIdentificationType] = useState("CPF")
  const [identificationNumber, setIdentificationNumber] = useState("")
  const [email, setEmail] = useState(defaultEmail)
  const [installments, setInstallments] = useState(1)

  // Formatação do número do cartão (XXXX XXXX XXXX XXXX)
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned
    return formatted.substring(0, 19) // 16 dígitos + 3 espaços
  }

  // Formatação do CPF (XXX.XXX.XXX-XX)
  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    return cleaned.substring(0, 11)
  }

  // Formatação do CNPJ (XX.XXX.XXX/XXXX-XX)
  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 14) {
      return cleaned
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
    }
    return cleaned.substring(0, 14)
  }

  const handleIdentificationChange = (value: string) => {
    if (identificationType === "CPF") {
      setIdentificationNumber(formatCPF(value))
    } else {
      setIdentificationNumber(formatCNPJ(value))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validações básicas
    const cleanCardNumber = cardNumber.replace(/\s/g, "")
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      alert("Número do cartão inválido")
      return
    }

    if (!cardholderName.trim()) {
      alert("Nome do titular é obrigatório")
      return
    }

    if (!expirationMonth || !expirationYear) {
      alert("Data de validade é obrigatória")
      return
    }

    if (securityCode.length < 3 || securityCode.length > 4) {
      alert("Código de segurança inválido")
      return
    }

    const cleanIdentification = identificationNumber.replace(/\D/g, "")
    if (identificationType === "CPF" && cleanIdentification.length !== 11) {
      alert("CPF inválido")
      return
    }
    if (identificationType === "CNPJ" && cleanIdentification.length !== 14) {
      alert("CNPJ inválido")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      alert("Email inválido")
      return
    }

    onSubmit({
      cardNumber: cleanCardNumber,
      cardholderName: cardholderName.trim(),
      expirationMonth,
      expirationYear,
      securityCode,
      identificationType,
      identificationNumber: cleanIdentification,
      email: email.trim(),
      installments,
    })
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i)

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="h-5 w-5 text-rose-600" />
        <h3 className="text-lg font-semibold text-gray-900">Dados do Cartão de Crédito</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Número do Cartão */}
        <div>
          <Label htmlFor="cardNumber">Número do Cartão *</Label>
          <Input
            id="cardNumber"
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
            className="mt-1"
          />
        </div>

        {/* Nome do Titular */}
        <div>
          <Label htmlFor="cardholderName">Nome do Titular *</Label>
          <Input
            id="cardholderName"
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase().substring(0, 50))}
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            required
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Digite o nome exatamente como está impresso no cartão</p>
        </div>

        {/* Validade e CVV */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="expirationMonth">Mês *</Label>
            <Select value={expirationMonth} onValueChange={setExpirationMonth} required>
              <SelectTrigger id="expirationMonth" className="mt-1">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = (i + 1).toString().padStart(2, "0")
                  return (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expirationYear">Ano *</Label>
            <Select value={expirationYear} onValueChange={setExpirationYear} required>
              <SelectTrigger id="expirationYear" className="mt-1">
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
          </div>

          <div>
            <Label htmlFor="securityCode">CVV *</Label>
            <Input
              id="securityCode"
              type="text"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, "").substring(0, 4))}
              placeholder="123"
              maxLength={4}
              required
              className="mt-1"
            />
          </div>
        </div>

        {/* Tipo e Número de Documento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="identificationType">Documento *</Label>
            <Select
              value={identificationType}
              onValueChange={(value) => {
                setIdentificationType(value)
                setIdentificationNumber("")
              }}
              required
            >
              <SelectTrigger id="identificationType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNPJ">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="identificationNumber">Número do {identificationType} *</Label>
            <Input
              id="identificationNumber"
              type="text"
              value={identificationNumber}
              onChange={(e) => handleIdentificationChange(e.target.value)}
              placeholder={identificationType === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
              required
              className="mt-1"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="mt-1"
          />
        </div>

        {/* Parcelas */}
        <div>
          <Label htmlFor="installments">Parcelas *</Label>
          <Select
            value={installments.toString()}
            onValueChange={(value) => setInstallments(Number.parseInt(value))}
            required
          >
            <SelectTrigger id="installments" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}x sem juros
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Informação de Segurança */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Pagamento 100% seguro</p>
            <p>
              Seus dados são criptografados e processados com segurança pelo Mercado Pago. Não armazenamos informações
              do seu cartão.
            </p>
          </div>
        </div>

        {/* Botão de Submissão */}
        <Button type="submit" disabled={isProcessing} className="w-full bg-rose-600 hover:bg-rose-700" size="lg">
          {isProcessing ? "Processando..." : "Confirmar Pagamento"}
        </Button>
      </form>
    </Card>
  )
}
