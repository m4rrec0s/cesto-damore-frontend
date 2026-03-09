export default function PoliticaPrivacidadePage() {
  const lastUpdated = "09 de Março de 2026";

  return (
    <div className="bg-gray-100 min-h-screen py-12 px-4 shadow-inner ">
      <div className="max-w-[800px] mx-auto bg-white p-12 md:p-20 shadow-xl border border-gray-200 text-gray-800 leading-relaxed min-h-[1100px]">
        <header className="mb-12 border-b-2 border-gray-900 pb-8 uppercase text-center md:text-left tracking-widest">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-gray-500 text-xs">
            Cesto d&apos;Amore | Gestão de Dados Pessoais
          </p>
        </header>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            1. Introdução
          </h2>
          <p className="mb-4">
            A segurança e a proteção dos dados pessoais são prioridades
            fundamentais para a Cesto d&apos;Amore. Esta Política de Privacidade
            detalha os procedimentos relativos à coleta, armazenamento e
            processamento de informações fornecidas por usuários ao utilizarem
            nossa plataforma e serviços, em estrita conformidade com a{" "}
            <strong>
              Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
            </strong>
            .
          </p>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            2. Coleta de Informações
          </h2>
          <p className="mb-4 text-sm text-gray-700 italic border-l-2 border-gray-200 pl-4">
            A coleta de dados restringe-se ao essencial para a prestação do
            serviço contratado:
          </p>
          <ul className="list-none space-y-4 text-sm">
            <li>
              <strong>I. Dados Cadastrais:</strong> Nome completo, CPF, correio
              eletrônico, contato telefônico e endereço completo para entrega.
            </li>
            <li>
              <strong>II. Dados Financeiros:</strong> Transações processadas via
              gateway Mercado Pago. A Cesto d&apos;Amore não armazena dados de
              cartões de crédito em seus servidores.
            </li>
            <li>
              <strong>III. Dados de Destinatários:</strong> Identificação e
              localização física de terceiros para fins exclusivos de entrega.
            </li>
          </ul>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            3. Finalidade do Tratamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="border border-gray-200 p-6 text-xs uppercase tracking-tight">
              <h3 className="font-bold mb-2">Execução Logística</h3>
              <p>
                Produção, embalagem e transporte de mercadorias conforme
                cronograma estabelecido.
              </p>
            </div>
            <div className="border border-gray-200 p-6 text-xs uppercase tracking-tight">
              <h3 className="font-bold mb-2">Segurança Transacional</h3>
              <p>
                Prevenção de fraudes e garantia da integridade operacional do
                sistema.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10 text-justify">
          <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase border-l-4 border-gray-900 pl-4 tracking-wider">
            4. Compartilhamento de Dados
          </h2>
          <p className="text-sm">
            A Cesto d&apos;Amore não comercializa base de dados pessoais. O
            compartilhamento ocorre exclusivamente com parceiros operacionais
            indispensáveis (instituições financeiras e transportadores), sob
            cláusulas restritivas de confidencialidade.
          </p>
        </section>

        <div className="mt-20 border-t border-gray-200 pt-10 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4">
            Direitos do Titular: Acesso, retificação e exclusão podem ser
            solicitados formalmente via cestodamore17@gmail.com.
          </p>
          <div className="text-[10px] text-gray-500 font-sans font-bold">
            DATA DA ÚLTIMA REVISÃO: {lastUpdated}
          </div>
        </div>
      </div>
    </div>
  );
}
