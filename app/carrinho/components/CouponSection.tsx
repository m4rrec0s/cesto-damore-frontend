"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tag, X, Loader2, Check } from "lucide-react";
import useApi from "@/app/hooks/use-api";
import { useCart } from "@/app/hooks/use-cart";

const ERROR_MESSAGES: Record<string, string> = {
  COUPON_NOT_FOUND: "Cupom não encontrado",
  COUPON_INACTIVE: "Cupom inativo",
  COUPON_EXPIRED: "Cupom expirado",
  COUPON_EXHAUSTED: "Cupom esgotado",
  BELOW_MIN_PURCHASE: "Valor mínimo não atingido",
  COUPON_NOT_FOR_USER: "Cupom não disponível para você",
  NOT_FIRST_PURCHASE: "Válido apenas para primeira compra",
  ALREADY_USED: "Você já usou este cupom",
};

interface AvailableCoupon {
  code: string;
  description: string;
  coupon_type: string;
  discount_type: string;
  discount_value: number;
  max_discount_cap: number | null;
  min_purchase_amount: number | null;
  valid_until: string | null;
}

interface AppliedCoupon {
  code: string;
  discount_amount: number;
  discount_type: string;
  description?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export const CouponSection = () => {
  const api = useApi();
  const { cart, orderMetadata, setOrderMetadata } = useCart();
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.getAvailableCoupons().then(setAvailableCoupons).catch(() => {});
  }, [api]);

  // Restore applied coupon from orderMetadata on mount
  useEffect(() => {
    if (orderMetadata.couponCode && !appliedCoupon) {
      setAppliedCoupon({
        code: orderMetadata.couponCode as string,
        discount_amount: (orderMetadata.couponDiscount as number) || 0,
        discount_type: (orderMetadata.couponDiscountType as string) || "fixed",
        description: orderMetadata.couponDescription as string | undefined,
      });
      setStatus("success");
    }
  }, []);

  const applyResult = useCallback(
    (coupon: AppliedCoupon | null) => {
      setAppliedCoupon(coupon);
      if (coupon) {
        setOrderMetadata((prev: Record<string, unknown>) => ({
          ...prev,
          couponCode: coupon.code,
          couponDiscount: coupon.discount_amount,
          couponDiscountType: coupon.discount_type,
          couponDescription: coupon.description,
        }));
      } else {
        setOrderMetadata((prev: Record<string, unknown>) => {
          const { couponCode, couponDiscount, couponDiscountType, couponDescription, ...rest } = prev;
          void couponCode; void couponDiscount; void couponDiscountType; void couponDescription;
          return rest;
        });
      }
    },
    [setOrderMetadata],
  );

  const validateCode = useCallback(
    async (code: string) => {
      if (!code.trim()) return;
      setStatus("loading");
      setErrorMsg("");
      try {
        const res = await api.validateCoupon(code.trim());
        if (res.valid) {
          setStatus("success");
          applyResult({
            code: res.coupon_code,
            discount_amount: res.discount_amount,
            discount_type: res.discount_type,
            description: res.description,
          });
        } else {
          setStatus("error");
          setErrorMsg(ERROR_MESSAGES[res.error_code] || "Cupom inválido");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Erro ao validar cupom");
      }
    },
    [api, applyResult],
  );

  const handleInputChange = (value: string) => {
    setInputCode(value);
    setStatus("idle");
    setErrorMsg("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => validateCode(value), 600);
    }
  };

  const handleSelectCoupon = (code: string) => {
    setInputCode(code);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    validateCode(code);
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setInputCode("");
    setStatus("idle");
    setErrorMsg("");
    applyResult(null);
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Cupom de desconto</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">{appliedCoupon.code}</span>
            <span className="text-xs text-green-600">
              -R$ {appliedCoupon.discount_amount.toFixed(2)}
            </span>
          </div>
          <button onClick={handleRemove} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
              placeholder="Digite o código do cupom"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {status === "loading" && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          {status === "error" && errorMsg && (
            <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
          )}

          {availableCoupons.length > 0 && (
            <div className="mt-3 space-y-2">
              <span className="text-xs text-gray-500">Cupons disponíveis:</span>
              <div className="flex flex-wrap gap-2">
                {availableCoupons.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleSelectCoupon(c.code)}
                    className="text-xs border border-dashed border-gray-300 rounded px-2 py-1 text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    {c.code}
                    {c.description && (
                      <span className="text-gray-400 ml-1">· {c.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
