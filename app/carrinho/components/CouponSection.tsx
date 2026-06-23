"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tag, X, Loader2, Check, Truck, Percent, DollarSign } from "lucide-react";
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

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  PORCENTAGEM: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
  VALOR_FIXO: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  FRETE_GRATIS: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
};

function getDiscountIcon(type: string) {
  switch (type) {
    case "PORCENTAGEM": return <Percent className="w-4 h-4" />;
    case "FRETE_GRATIS": return <Truck className="w-4 h-4" />;
    default: return <DollarSign className="w-4 h-4" />;
  }
}

function formatDiscount(coupon: AvailableCoupon): string {
  switch (coupon.discount_type) {
    case "PORCENTAGEM":
      return `${coupon.discount_value}% OFF${coupon.max_discount_cap ? ` (máx R$${coupon.max_discount_cap.toFixed(0)})` : ""}`;
    case "VALOR_FIXO":
      return `R$${coupon.discount_value.toFixed(2)} OFF`;
    case "FRETE_GRATIS":
      return coupon.discount_value > 0 ? `R$${coupon.discount_value.toFixed(2)} no frete` : "Frete grátis";
    default:
      return "";
  }
}

interface AvailableCoupon {
  code: string;
  description: string | null;
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
  const { orderMetadata, setOrderMetadata } = useCart();
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [inputCode, setInputCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.getAvailableCoupons().then(setAvailableCoupons).catch(() => {});
  }, [api]);

  useEffect(() => {
    if (orderMetadata.couponCode && !appliedCoupon) {
      setAppliedCoupon({
        code: orderMetadata.couponCode as string,
        discount_amount: (orderMetadata.couponDiscount as number) || 0,
        discount_type: (orderMetadata.couponDiscountType as string) || "",
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

  const handleToggleCoupon = (code: string) => {
    if (appliedCoupon?.code === code) {
      handleRemove();
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      validateCode(code);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setInputCode("");
    setStatus("idle");
    setErrorMsg("");
    applyResult(null);
  };

  const colors = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.VALOR_FIXO;

  if (availableCoupons.length === 0 && !showManualInput && !appliedCoupon) {
    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Tag className="w-4 h-4" />
          <span>Tem um cupom de desconto?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Available coupons as banners */}
      {availableCoupons.map((coupon) => {
        const c = colors(coupon.discount_type);
        const isSelected = appliedCoupon?.code === coupon.code;
        const isDisabled = appliedCoupon && appliedCoupon.code !== coupon.code;

        return (
          <button
            key={coupon.code}
            onClick={() => handleToggleCoupon(coupon.code)}
            disabled={status === "loading"}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
              isSelected
                ? `${c.bg} ${c.border} ring-1 ring-offset-1 ring-current ${c.text}`
                : isDisabled
                  ? "bg-gray-50 border-gray-200 opacity-50"
                  : `bg-white border-gray-200 hover:${c.bg} hover:${c.border}`
            }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
              isSelected ? `${c.border} ${c.bg}` : "border-gray-300"
            }`}>
              {isSelected && <Check className={`w-3 h-3 ${c.text}`} />}
            </div>

            <div className={`flex-shrink-0 ${c.text}`}>
              {getDiscountIcon(coupon.discount_type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isSelected ? c.text : "text-gray-900"}`}>
                  {formatDiscount(coupon)}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>
                  {coupon.code}
                </span>
              </div>
              {coupon.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{coupon.description}</p>
              )}
              {coupon.min_purchase_amount && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Mín. R${coupon.min_purchase_amount.toFixed(0)}
                </p>
              )}
            </div>

            {status === "loading" && appliedCoupon?.code !== coupon.code && inputCode === coupon.code && (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
            )}
          </button>
        );
      })}

      {/* Applied coupon confirmation */}
      {appliedCoupon && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${colors(appliedCoupon.discount_type).bg} ${colors(appliedCoupon.discount_type).border} border`}>
          <div className="flex items-center gap-2">
            <Check className={`w-4 h-4 ${colors(appliedCoupon.discount_type).text}`} />
            <span className={`text-sm font-medium ${colors(appliedCoupon.discount_type).text}`}>
              -R$ {appliedCoupon.discount_amount.toFixed(2)}
            </span>
          </div>
          <button onClick={handleRemove} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual input */}
      {!appliedCoupon && (
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">Ou digite um código:</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
              placeholder="CÓDIGO DO CUPOM"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-wide"
            />
            {status === "loading" && !availableCoupons.find(c => c.code === inputCode) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          {status === "error" && errorMsg && (
            <p className="text-xs text-red-500 mt-1.5">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
};
