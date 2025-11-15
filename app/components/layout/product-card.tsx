import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  props: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    categories?: Array<{
      category: {
        id: string;
        name: string;
      };
    }>;
    discount?: number;
  };
}

export function ProductCard({ props }: ProductCardProps) {
  const finalPrice = props.discount
    ? props.price - (props.discount * props.price) / 100
    : props.price;

  return (
    <Link
      href={`/produto/${props.id}`}
      className="group flex flex-col relative w-full h-full min-w-[200px] max-w-[300px] bg-white rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-rose-300"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
        <Image
          src={props.image_url || "/placeholder.png"}
          alt={props.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
        />

        {props.discount && props.discount > 0 ? (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-xl animate-pulse">
            -{props.discount.toFixed(0)}%
          </div>
        ) : null}

        {props.categories && props.categories.length > 0 ? (
          <div className="absolute bottom-3 left-3 gap-1.5 flex">
            {props.categories[0] && (
              <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-md border border-gray-200">
                {props.categories[0].category.name}
              </div>
            )}
            {props.categories.length > 1 && (
              <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 shadow-md border border-gray-200">
                +{props.categories.length - 1}
              </div>
            )}
          </div>
        ) : null}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-gray-50 group-hover:from-rose-50 group-hover:to-pink-50 transition-all duration-300">
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors min-h-[2.5rem]">
          {props.name}
        </h3>

        <div className="flex flex-col gap-1">
          {props.discount && props.discount > 0 ? (
            <span className="text-sm text-gray-400 line-through font-medium">
              {props.price.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          ) : null}
          <div className="flex flex-col items-start gap-2">
            <span className="text-2xl font-black text-rose-600 group-hover:text-rose-700 transition-colors">
              {finalPrice.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
            <span className="text-xs text-gray-500 font-medium group-hover:text-rose-500 transition-colors">
              Ver detalhes →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
