export default function TermosUsoPage() {
  const lastUpdated = "09 de Março de 2026";

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4 shadow-inner">
      <div className="max-w-[800px] mx-auto bg-white p-12 md:p-20 shadow-xl border border-gray-200 text-gray-800  leading-relaxed min-h-[1100px]">
        <header className="mb-12 border-b-2 border-gray-900 pb-8 uppercase text-center md:text-left tracking-widest">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Termos de Uso
          </h1>
          <p className="text-gray-500 text-xs tracking-widest italic">
            Cesto d&apos;Amore | Acordo de Utilização da Plataforma
          </p>
        </header>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            1. Consentimento e Objeto
          </h2>
          <p className="mb-4">
            Ao acessar e utilizar este sítio, o usuário declara concordância
            integral e sem reservas com os presentes Termos de Uso. Este
            documento governa a aquisição de produtos de teores personalizados,
            cestas de presentes e flores, operados pela marca Cesto d&apos;Amore
            com foco regional em Campina Grande, PB.
          </p>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            2. Responsabilidades do Cadastrado
          </h2>
          <ul className="list-none space-y-4 text-sm">
            <li>
              <strong>I. Ilicitude de Informações:</strong> O usuário obriga-se
              a fornecer dados verídicos e completos no ato da transação, sob
              pena de suspensão de acesso por indícios de fraude ou má-fé.
            </li>
            <li>
              <strong>II. Logística de Entrega:</strong> É incumbência exclusiva
              do contratante o fornecimento do endereço de entrega correto e a
              garantia de receptividade no local indicado, ou a designação de um
              portador responsável.
            </li>
          </ul>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            3. Modificações e Distrato
          </h2>
          <p className="mb-4 text-sm font-bold uppercase tracking-widest border-l-2 border-gray-200 pl-4">
            Procedimentos para cancelamento:
          </p>
          <div className="text-sm border border-gray-300 p-6 italic text-gray-600 bg-gray-50">
            Cancelamentos com reembolso integral são admitidos até 24 (vinte e
            quatro) horas antes da entrega programada. Pedidos de última hora
            (mesmo dia) não comportam cancelamento após o início da produção ou
            montagem artesanal.
          </div>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            4. Propriedade Intelectual
          </h2>
          <p className="text-sm">
            A Cesto d&apos;Amore detém exclusividade sobre todo o conteúdo
            digital disponível neste sítio (textos, imagens, logotipia e
            layout). A reprodução parcial ou total por terceiros, sem prévia
            autorização formal, constitui violação de direitos autorais e
            sujeita o infrator às sanções legais.
          </p>
        </section>

        <footer className="mt-24 border-t border-gray-200 pt-10 text-center tracking-widest">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase">
            5. Foro e Legislação
          </h2>
          <p className="text-[10px] text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
            Este contrato é regido pelas leis da República Federativa do Brasil.
            Fica eleito o foro da Comarca de Campina Grande, Paraíba, para
            dirimir eventuais controvérsias decorrentes deste instrumento.
          </p>
          <div className="text-[10px] text-gray-400 font-sans font-bold">
            DATA DA ÚLTIMA REVISÃO: {lastUpdated}
          </div>
        </footer>
      </div>
    </div>
  );
}
