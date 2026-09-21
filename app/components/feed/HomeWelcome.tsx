import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { PublicFeedItem } from "@/app/hooks/use-api";
import {
  ArrowRight,
  ArrowUpRight,
  Instagram,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";

interface HomeWelcomeProps {
  bestSellers: PublicFeedItem[];
}

function getBestSeller(item: PublicFeedItem) {
  const data = item.item_data;
  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    typeof data.price !== "number"
  )
    return null;
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    imageUrl: typeof data.image_url === "string" ? data.image_url : null,
  };
}

function AnaSearchMark() {
  return (
    <span
      className="pointer-events-none absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-rose-100"
      aria-hidden="true"
    >
      <img src="/ana-idle.png" alt="" className="h-6 w-6 object-contain" />
    </span>
  );
}

export function HomeWelcome({ bestSellers }: HomeWelcomeProps) {
  const router = useRouter();
  type DiscoveryProduct = {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [recommendations, setRecommendations] = useState<DiscoveryProduct[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  const discover = async (surprise: boolean) => {
    setLoading(true);
    setMessage("");
    setRecommendations([]);
    try {
      const visitorKey = "cda-discovery-visitor";
      let visitorId = window.localStorage.getItem(visitorKey);
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        window.localStorage.setItem(visitorKey, visitorId);
      }
      const response = await fetch("/api/backend/discovery/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-discovery-visitor": visitorId,
        },
        body: JSON.stringify(surprise ? { surprise: true } : { prompt }),
      });
      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("A curadoria está indisponível no momento.");
      }
      if (!data || typeof data !== "object")
        throw new Error("Resposta inválida");
      const result = data as {
        message?: unknown;
        products?: unknown;
        error?: unknown;
      };
      if (response.status === 429) {
        const catalogResponse = await fetch(
          `/api/backend/products?perPage=4&search=${encodeURIComponent(prompt)}`,
        );
        const catalog: unknown = await catalogResponse.json();
        if (
          catalog &&
          typeof catalog === "object" &&
          "products" in catalog &&
          Array.isArray(catalog.products)
        ) {
          setMessage("Encontrei essas opções para você 🤩");
          setRecommendations(
            catalog.products.filter(
              (product): product is DiscoveryProduct =>
                Boolean(product) &&
                typeof product === "object" &&
                "id" in product &&
                typeof product.id === "string" &&
                "name" in product &&
                typeof product.name === "string" &&
                "price" in product &&
                typeof product.price === "number" &&
                "image_url" in product &&
                (typeof product.image_url === "string" ||
                  product.image_url === null),
            ),
          );
          return;
        }
      }
      if (!response.ok || typeof result.message !== "string") {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Não consegui preparar sua seleção.",
        );
      }
      setMessage(result.message);
      if (Array.isArray(result.products)) {
        setRecommendations(
          result.products.filter(
            (product): product is DiscoveryProduct =>
              Boolean(product) &&
              typeof product === "object" &&
              "id" in product &&
              typeof product.id === "string" &&
              "name" in product &&
              typeof product.name === "string" &&
              "price" in product &&
              typeof product.price === "number" &&
              "image_url" in product &&
              (typeof product.image_url === "string" ||
                product.image_url === null),
          ),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não consegui preparar sua seleção.",
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim())
      router.push(`/busca?q=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <>
      <section className="overflow-hidden border-b border-rose-100 bg-[#fff8f6] text-[#35111a]">
        <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
          <div className="relative">
            <div className="hidden">
              <p className="flex items-center gap-2 text-sm font-bold">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500">
                  <Zap className="h-4 w-4 fill-current" />
                </span>{" "}
                Mais vendidos da semana
              </p>
              <Link
                href="/categorias"
                className="flex items-center gap-1 text-sm font-semibold text-rose-200 hover:text-white"
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative lg:min-h-[520px]">
              <div className="relative z-10 max-w-[680px]">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-rose-700">
                  Presentes que contam histórias
                </p>
                <h1 className="max-w-3xl text-[2.7rem] font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-[4.5rem]">
                  Encontre o presente{" "}
                  <span className="text-rose-700">ideal com IA.</span>
                </h1>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#704653] sm:text-lg">
                  Conte para quem é e qual ocasião. Nós cuidamos das ideias.
                </p>
                <form
                  onSubmit={submit}
                  className="relative mt-6 flex max-w-xl rounded-xl border border-rose-200 bg-white p-1.5 shadow-[0_8px_18px_rgba(91,6,24,0.08)]"
                >
                  <AnaSearchMark />
                  <input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ex.: aniversário para minha mãe"
                    className="min-w-0 flex-1 rounded-xl py-3 pl-12 pr-4 text-sm text-[#35111a] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    aria-label="Encontrar presentes"
                    className="grid h-11 w-11 place-items-center rounded-xl bg-[#4a1422] text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => router.push("/busca?q=surpreenda-me")}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white/70 px-4 text-sm font-semibold text-[#5b0618] transition hover:bg-[#5b0618] hover:text-white"
                >
                  <Sparkles className="h-4 w-4" /> Quero uma surpresa
                </button>
              </div>
              <div className="pointer-events-none relative hidden w-full sm:block lg:absolute lg:-bottom-16 lg:-right-10 lg:-top-16 lg:mt-0 lg:h-auto lg:w-auto lg:translate-x-[max(0px,calc((100vw-1440px)/2))]">
                <img
                  src="/hero-img-new.png"
                  alt="Pessoa entregando uma cesta romântica Cesto d'Amore"
                  className="relative h-auto w-full object-contain lg:h-full lg:w-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-4 py-9 sm:px-6 sm:py-12 lg:px-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
              Escolhas da semana
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#35111a]">
              Mais vendidos
            </h2>
          </div>
          <Link
            href="/categorias"
            className="flex items-center gap-1 text-sm font-semibold text-rose-700 hover:text-rose-900"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          {bestSellers
            .map(getBestSeller)
            .filter(
              (
                product,
              ): product is NonNullable<ReturnType<typeof getBestSeller>> =>
                product !== null,
            )
            .slice(0, 4)
            .map((product) => (
              <Link
                key={product.id}
                href={`/produto/${product.id}`}
                className="group overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-rose-50">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-[#35111a]">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-rose-600">
                    R$ {product.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}

export function SocialReelsRail() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">
            No nosso atelier
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#35111a] sm:text-3xl">
            Inspire-se antes de escolher
          </h2>
        </div>
        <a
          href="https://www.instagram.com/cestodamorecg/"
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 text-sm font-bold text-rose-700 hover:text-rose-900 sm:flex"
        >
          <Instagram className="h-4 w-4" /> Ver Instagram{" "}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
      <a
        href="https://www.instagram.com/cestodamorecg/"
        target="_blank"
        rel="noreferrer"
        className="group grid min-h-52 place-items-center overflow-hidden rounded-[1.5rem] border border-rose-100 bg-[radial-gradient(circle_at_top_left,_#ffe3e8,_#fff7f4_48%,_#f7e9e6)] p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(74,20,34,0.12)]"
      >
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#4a1422] text-white">
            <Instagram className="h-5 w-5" />
          </span>
          <p className="mt-4 text-lg font-semibold text-[#35111a]">
            Veja bastidores, montagens e entregas reais
          </p>
          <p className="mt-1 text-sm text-[#74535b]">
            Novos Reels serão exibidos aqui assim que os links forem
            selecionados.
          </p>
        </div>
      </a>
    </section>
  );
}
