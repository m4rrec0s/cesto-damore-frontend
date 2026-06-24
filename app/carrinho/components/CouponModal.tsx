"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  Check,
  Truck,
  Percent,
  DollarSign,
  Tag,
} from "lucide-react";
import useApi from "@/app/hooks/use-api";
import { useCartContext } from "@/app/hooks/cart-context";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/app/components/ui/drawer";

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

const TYPE_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badge: string;
    iconBg: string;
    hoverBg: string;
  }
> = {
  PORCENTAGEM: {
    bg: "bg-gradient-to-r from-purple-50 to-violet-50",
    border: "border-purple-200",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    iconBg: "bg-purple-100",
    hoverBg: "hover:border-purple-300 hover:bg-purple-50",
  },
  VALOR_FIXO: {
    bg: "bg-gradient-to-r from-blue-50 to-cyan-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-100",
    hoverBg: "hover:border-blue-300 hover:bg-blue-50",
  },
  FRETE_GRATIS: {
    bg: "bg-gradient-to-r from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-100",
    hoverBg: "hover:border-emerald-300 hover:bg-emerald-50",
  },
};

function getDiscountIcon(type: string) {
  switch (type) {
    case "PORCENTAGEM":
      return <Percent className="w-5 h-5" />;
    case "FRETE_GRATIS":
      return <Truck className="w-5 h-5" />;
    default:
      return <DollarSign className="w-5 h-5" />;
  }
}

function formatDiscount(coupon: AvailableCoupon): string {
  switch (coupon.discount_type) {
    case "PORCENTAGEM":
      return `${coupon.discount_value}% OFF`;
    case "VALOR_FIXO":
      return `R$ ${coupon.discount_value.toFixed(2)} OFF`;
    case "FRETE_GRATIS":
      return coupon.discount_value > 0
        ? `R$ ${coupon.discount_value.toFixed(2)} no frete`
        : "Frete grátis";
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

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

const CouponContent = ({
  availableCoupons,
  inputCode,
  status,
  errorMsg,
  appliedCoupon,
  onInputChange,
  onToggleCoupon,
  onRemove,
  onClose,
}: {
  availableCoupons: AvailableCoupon[];
  inputCode: string;
  status: Status;
  errorMsg: string;
  appliedCoupon: AppliedCoupon | null;
  onInputChange: (value: string) => void;
  onToggleCoupon: (code: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const colors = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.VALOR_FIXO;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {availableCoupons.map((coupon) => {
          const c = colors(coupon.discount_type);
          const isSelected = appliedCoupon?.code === coupon.code;
          const isDisabled = appliedCoupon && appliedCoupon.code !== coupon.code;

          return (
            <button
              key={coupon.code}
              onClick={() => onToggleCoupon(coupon.code)}
              disabled={status === "loading"}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? `${c.bg} ${c.border} shadow-sm`
                  : isDisabled
                    ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                    : `bg-white border-gray-200 ${c.hoverBg}`
              }`}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? `${c.border} ${c.iconBg}` : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <Check className={`w-3.5 h-3.5 ${c.text}`} />
                )}
              </div>

              <div
                className={`flex-shrink-0 p-2.5 rounded-lg ${c.iconBg} ${c.text}`}
              >
                {getDiscountIcon(coupon.discount_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base font-bold ${isSelected ? c.text : "text-gray-900"}`}
                  >
                    {formatDiscount(coupon)}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.badge}`}
                  >
                    {coupon.code}
                  </span>
                </div>
                {coupon.description && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {coupon.description}
                  </p>
                )}
                {coupon.min_purchase_amount && (
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-gray-300" />
                    Mínimo R$ {coupon.min_purchase_amount.toFixed(0)}
                  </p>
                )}
              </div>

              {status === "loading" &&
                appliedCoupon?.code !== coupon.code &&
                inputCode === coupon.code && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                )}
            </button>
          );
        })}

        <div className="pt-2">
          <div className="relative">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => onInputChange(e.target.value.toUpperCase())}
              placeholder="DIGITE SEU CÓDIGO"
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3483fa]/20 focus:border-[#3483fa] uppercase tracking-wider font-medium transition-all"
            />
            {status === "loading" &&
              !availableCoupons.find((c) => c.code === inputCode) && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
          </div>
          {status === "error" && errorMsg && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {appliedCoupon && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-[#3483fa] hover:bg-[#2968c8] text-white font-bold rounded-xl transition-colors"
          >
            Aplicar cupom
          </button>
        </div>
      )}
    </>
  );
};

export const CouponModal = ({ open, onClose }: CouponModalProps) => {
  const api = useApi();
  const { orderMetadata, setOrderMetadata } = useCartContext();
  const isMobile = useIsMobile();
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>(
    [],
  );
  const [inputCode, setInputCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      api
        .getAvailableCoupons()
        .then(setAvailableCoupons)
        .catch(() => {});
    }
  }, [api, open]);

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
          const {
            couponCode,
            couponDiscount,
            couponDiscountType,
            couponDescription,
            ...rest
          } = prev;
          void couponCode;
          void couponDiscount;
          void couponDiscountType;
          void couponDescription;
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

  const handleClose = () => {
    onClose();
  };

  const contentProps = {
    availableCoupons,
    inputCode,
    status,
    errorMsg,
    appliedCoupon,
    onInputChange: handleInputChange,
    onToggleCoupon: handleToggleCoupon,
    onRemove: handleRemove,
    onClose: handleClose,
  };

  if (!open) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#3483fa]/10">
                  <Tag className="w-5 h-5 text-[#3483fa]" />
                </div>
                <div>
                  <DrawerTitle className="text-lg font-bold">
                    Cupom de desconto
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-gray-500">
                    Selecione ou digite um código
                  </DrawerDescription>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <CouponContent {...contentProps} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#3483fa]/10">
              <Tag className="w-5 h-5 text-[#3483fa]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Cupom de desconto
              </h2>
              <p className="text-xs text-gray-500">
                Selecione ou digite um código
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <CouponContent {...contentProps} />
      </div>
    </div>
  );
};
