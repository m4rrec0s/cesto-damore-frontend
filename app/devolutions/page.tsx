export default function TrocasDevolucoesPage() {
  const lastUpdated = "09 de Março de 2026";

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4 shadow-inner">
      <div className="max-w-[800px] mx-auto bg-white p-12 md:p-20 shadow-xl border border-gray-200 text-gray-800  leading-relaxed min-h-[1100px]">
        <header className="mb-12 border-b-2 border-gray-900 pb-8 uppercase text-center md:text-left tracking-widest">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Trocas e Devoluções
          </h1>
          <p className="text-gray-500 text-xs tracking-widest italic font-sans mb-4">
            Cesto d&apos;Amore | Política de Sustentabilidade e Qualidade
          </p>
        </header>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            1. Natureza de Produtos Perecíveis
          </h2>
          <div className="border border-gray-100 p-8 bg-gray-50 text-sm leading-relaxed mb-6 font-sans italic border-l-4">
            A Cesto d&apos;Amore opera primariamente com mercadorias de natureza
            perecível (alimentos, flores e plantas vivas). Dado o seu caráter
            imediato de consumo e durabilidade limitada, as regras de devolução
            fundamentam-se na conferência minuciosa no ato da entrega.
          </div>
        </section>

        <section className="mb-10 text-justify border-b border-gray-100 pb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            2. Direito de Arrependimento e Exceções
          </h2>
          <p className="mb-6 text-sm">
            Conforme o Artigo 49 do Código de Defesa do Consumidor (CDC), o
            prazo para arrependimento é de até 07 (sete) dias corridos após o
            recebimento da mercadoria, sob a condição de devolução do produto em
            perfeito estado, em sua embalagem original e sem indícios de uso ou
            violação.
          </p>
          <div className="space-y-4 mb-2">
            <h3 className="font-bold mb-4 uppercase text-xs tracking-widest border-b border-gray-400 pb-1 w-fit">
              I. Exceções Legais e Normativas:
            </h3>
            <ul className="list-disc pl-6 space-y-4 text-sm leading-relaxed text-gray-700 italic">
              <li>
                <strong>Bens Personalizados:</strong> Itens fabricados
                exclusivamente para o contratante (bordados, gravações, cartões
                manuscritos) não comportam devolução sem defeito de fabricação.
              </li>
              <li>
                <strong>Mercadorias de Consumo:</strong> Cestas cujos itens
                alimentícios tenham sido abertos ou consumidos.
              </li>
              <li>
                <strong>Inadequação de Cuidados:</strong> Flores e plantas que
                sofreram danos por falta de irrigação ou exposição solar
                inadequada após o recebimento.
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            3. Avarias e Reposição em Transporte
          </h2>
          <p className="text-sm">
            Ocorrendo avaria (danos físicos) ou vício de qualidade evidente na
            entrega, a Cesto d&apos;Amore compromete-se com a reposição imediata
            sem ônus adicional. O procedimento exige comunicação formal imediata
            via canal de WhatsApp corporativo, acompanhada de registro
            fotográfico detalhado da irregularidade, sem NENHUMA violação da
            integridade original do(s) produto(s).
          </p>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            4. Política de Estorno Financeiro
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6 tracking-tight text-xs uppercase bg-gray-50 border border-gray-200 p-8">
            <div>
              <h3 className="font-bold mb-2">
                Transações Online (Mercado Pago)
              </h3>
              <p className="mb-4">
                O estorno ocorre conforme as normas da administradora do cartão
                de crédito, com visualização na fatura em até 2 (duas) janelas
                de fechamento mensais.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Transações via PIX</h3>
              <p>
                Reembolso processado em até 24 (vinte e quatro) horas úteis,
                condicionado à devolução conferida da mercadoria.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-20 border-t border-gray-300 pt-10 text-center uppercase tracking-[0.2em] font-sans">
          <div className="text-[10px] text-gray-500 mb-10 leading-relaxed font-bold">
            PARA SOLICITAÇÕES FORMAIS: cestodamore17@gmail.com
          </div>
          <div className="text-[10px] text-gray-400 font-bold border border-gray-300 p-2 w-fit mx-auto">
            DATA DA ÚLTIMA REVISÃO: {lastUpdated}
          </div>
        </footer>
      </div>
    </div>
  );
}
