import Link from "next/link";
import Image from "next/image";

export default function SobreNosPage() {
  return (
    <div className="bg-rose-50 min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-rose-100 text-gray-800 leading-relaxed">
        <header className="mb-10 border-b border-rose-100 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Cesto d&apos;Amore
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            Uma empresa feita para transformar carinho em momentos
            inesqueciveis.
          </p>
        </header>

        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Nossa História
            </h2>
            <div className="space-y-4 text-justify text-gray-700">
              <p>
                A <strong>Cesto d&apos;Amore</strong> nasceu em Campina Grande
                com o propósito de tornar o ato de presentear mais simples,
                afetivo e especial. Cada pedido representa uma historia, e nosso
                trabalho é cuidar para que essa mensagem chegue com beleza e
                qualidade a quem você ama.
              </p>
              <p>
                Ao longo dos anos, consolidamos nossa atuação em cestas de
                presente personalizados e vários tipos de buquês, com atenção
                aos detalhes em cada etapa, da seleção dos itens até a entrega
                final.
              </p>
            </div>
          </div>

          <div>
            <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-rose-200 bg-rose-50">
              <Image
                src="/paulo.png"
                alt="Foto da equipe Cesto d'Amore"
                fill
                className="object-cover aspect-square"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              <strong>CEO da Cesto d&apos;Amore:</strong> Paulo Roberto
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Nossa História
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Cuidado</h3>
              <p className="text-sm text-gray-700">
                Cada presente e montado com atenção para que o resultado final
                represente exatamente o que o cliente deseja comunicar.
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Qualidade</h3>
              <p className="text-sm text-gray-700">
                Selecionamos produtos e parceiros com criterios rigorosos para
                manter alto padrao de apresentação e frescor.
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Pontualidade</h3>
              <p className="text-sm text-gray-700">
                Nossa logística prioriza o horario combinado para preservar o
                impacto de cada surpresa.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Diretrizes Corporativas
          </h2>
          <div className="space-y-4 text-gray-700 text-justify">
            <p>
              Implementamos processos de personalização para que cada pedido
              reflita o perfil e a intenção de quem presenteia.
            </p>
            <p>
              Mantemos controle de qualidade em todas as etapas para assegurar
              consistência, apresentação e satisfação em cada entrega.
            </p>
            <p>
              Trabalhamos com logística organizada para cumprir prazos e manter
              a experiencia positiva do cliente do pedido ate o recebimento.
            </p>
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-rose-100 text-sm text-gray-600">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <p className="font-semibold text-gray-800 mb-1">
                Cesto d&apos;Amore | Presentes e Flores
              </p>
              <p>Sede Administrativa: Campina Grande, PB</p>
              <p>Canal de Comunicação: cestodamore17@gmail.com</p>
            </div>
            <div className="flex gap-4">
              <Link href="/categorias" className="hover:text-rose-600">
                Ver Catálogo
              </Link>
              <Link href="/" className="hover:text-rose-600">
                Início
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
