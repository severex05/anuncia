const ATUALIZADO_EM = "27 de agosto de 2026";

function legalShell(title, bodyHtml) {
  return `
    <header class="topbar">
      <span class="wordmark serif">Anuncia</span>
      <button type="button" id="legal-back-btn">Voltar</button>
    </header>
    <div class="legal-page">
      <div class="legal-content">
        <h1 class="auth-title">${title}</h1>
        <p class="legal-updated">Última atualização: ${ATUALIZADO_EM}</p>
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function renderTermsScreen(onBack) {
  const app = document.querySelector("#app");
  app.innerHTML = legalShell("Termos de Uso", `
    <p>Estes Termos de Uso regulam o uso da Anuncia (sistema web de lançamento de imóveis para corretores autônomos e pequenas imobiliárias). Ao criar uma conta ou usar a Anuncia, você concorda com estes termos. Se não concordar, não use o serviço.</p>

    <h2>1. O que é a Anuncia</h2>
    <p>A Anuncia organiza os dados de um imóvel cadastrado por você e produz, automaticamente, um pacote completo de materiais de divulgação — descrição longa e curta, posts para Instagram e Facebook, texto para WhatsApp, e-mail, roteiro de vídeo curto, chamada e checklist de lançamento.</p>
    <p><span class="legal-bold">A Anuncia não presta consultoria jurídica, imobiliária ou de avaliação de imóveis.</span> O CRECI informado no seu perfil é um campo de identificação — não validamos nem certificamos sua licença profissional. Todo material produzido é um rascunho de trabalho: revisar fatos, preço, disponibilidade e fotos antes de publicar é sempre responsabilidade sua.</p>

    <h2>2. Cadastro e conta</h2>
    <p>Para usar a Anuncia você precisa criar uma conta com e-mail e senha. Você é responsável por:</p>
    <ul>
      <li>Manter suas informações de cadastro corretas e atualizadas;</li>
      <li>Ter pelo menos 18 anos, ou usar o serviço com supervisão de um responsável legal;</li>
      <li>Manter sua senha em sigilo — você é responsável por toda atividade feita na sua conta.</li>
    </ul>

    <h2>3. Planos e cobrança</h2>
    <p>A Anuncia tem um plano de teste gratuito — <span class="legal-bold">1 pacote completo, sem necessidade de cartão de crédito</span> — e planos pagos recorrentes (Solo e Pro), cobrados via cartão, Pix ou boleto através do nosso processador de pagamentos (Asaas).</p>
    <ul>
      <li>Você pode cancelar ou ajustar seu plano a qualquer momento, sem multa ou fidelidade — atualmente entrando em contato pelo suporte, até termos um portal de autoatendimento;</li>
      <li>Em caso de atraso no pagamento, incidem juros de mora de 1% ao mês, conforme art. 52, §1º do Código de Defesa do Consumidor;</li>
      <li>Preços podem mudar mediante aviso prévio; a mudança não afeta cobranças já feitas.</li>
    </ul>

    <h2>4. Uso aceitável</h2>
    <p>Ao usar a Anuncia, você concorda em não:</p>
    <ul>
      <li>Compartilhar sua conta com terceiros de forma a burlar os limites de um plano;</li>
      <li>Tentar acessar dados de outros usuários ou vulnerar a segurança do serviço;</li>
      <li>Cadastrar imóveis com informações falsas ou usar os materiais gerados para publicidade enganosa, discriminatória ou que viole o Código de Defesa do Consumidor;</li>
      <li>Fazer engenharia reversa, copiar ou revender qualquer parte do serviço.</li>
    </ul>

    <h2>5. Materiais gerados</h2>
    <p>Os materiais de divulgação são produzidos automaticamente com base apenas nos dados que você informa sobre o imóvel e no seu perfil de voz (tom, palavras preferidas e proibidas). Quando falta um dado relevante, o sistema sinaliza um alerta em vez de presumir ou inventar a informação — mas a responsabilidade final por conferir cada fato antes de publicar é sua.</p>

    <h2>6. Propriedade intelectual</h2>
    <p>A Anuncia, sua marca, design e o software em si pertencem aos seus desenvolvedores. Você mantém a propriedade dos dados que cadastra (imóveis, perfil, materiais gerados e editados) — usamos esses dados apenas para operar o serviço para você.</p>

    <h2>7. Cancelamento e encerramento</h2>
    <p>Você pode excluir sua conta a qualquer momento, direto no seu perfil. A exclusão remove seus dados pessoais e o histórico de imóveis e pacotes gerados, conforme detalhado na nossa <a href="#" id="legal-link-privacy">Política de Privacidade</a>. Podemos suspender ou encerrar contas que violem estes termos, mediante aviso quando possível.</p>

    <h2>8. Limitação de responsabilidade</h2>
    <p>A Anuncia é fornecida "como está". Não garantimos resultado de vendas, leads ou valorização do imóvel — o serviço produz e organiza material de divulgação, nada além disso. Na medida permitida por lei, não somos responsáveis por publicações feitas sem revisão adequada ou por danos indiretos decorrentes do uso do serviço.</p>

    <h2>9. Alterações nestes termos</h2>
    <p>Podemos atualizar estes Termos de Uso periodicamente. Mudanças relevantes serão comunicadas no sistema. O uso continuado da Anuncia após uma atualização significa que você aceita os novos termos.</p>

    <h2>10. Lei aplicável</h2>
    <p>Estes termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do usuário para dirimir eventuais controvérsias, conforme o Código de Defesa do Consumidor.</p>

    <h2>11. Contato</h2>
    <p>Dúvidas sobre estes termos? Fale com a gente: <a href="mailto:severexseverys@gmail.com?subject=Termos de Uso Anuncia">severexseverys@gmail.com</a></p>
  `);

  document.querySelector("#legal-back-btn").addEventListener("click", onBack);
  document.querySelector("#legal-link-privacy").addEventListener("click", (e) => {
    e.preventDefault();
    window.history.pushState({}, "", "/privacidade");
    renderPrivacyScreen(onBack);
  });
}

export function renderPrivacyScreen(onBack) {
  const app = document.querySelector("#app");
  app.innerHTML = legalShell("Política de Privacidade", `
    <p>Esta política explica quais dados a Anuncia coleta, por quê, com quem compartilha e quais direitos você tem sobre eles, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>

    <h2>1. Quem trata seus dados</h2>
    <p>A Anuncia é operada como um negócio individual. Para questões de privacidade ou para exercer seus direitos sobre seus dados, use o contato ao final desta página — não temos um DPO terceirizado; o fundador responde diretamente.</p>

    <h2>2. Quais dados coletamos</h2>
    <h3>Dados de cadastro</h3>
    <ul>
      <li>E-mail e senha (a senha fica protegida por hash — nunca a vemos em texto puro).</li>
    </ul>
    <h3>Dados de perfil profissional</h3>
    <ul>
      <li>Nome público, CRECI, cidade, estado, imobiliária, WhatsApp, celular, Instagram, logo;</li>
      <li>Tom de voz, exemplos de texto próprio e palavras preferidas/proibidas — usados para que os materiais gerados soem como você;</li>
      <li>CPF ou CNPJ, exigido pelo nosso processador de pagamentos para emitir cobrança quando você assina um plano pago.</li>
    </ul>
    <h3>Dados de imóveis</h3>
    <ul>
      <li>Endereço, preço, características, fotos e observações que você cadastra sobre cada imóvel;</li>
      <li>Os materiais de divulgação gerados a partir desses dados e o histórico de versões editadas.</li>
    </ul>
    <h3>Dados de uso</h3>
    <ul>
      <li>Eventos de uso do sistema (ex: cadastro, primeiro imóvel, pacote gerado, exportação) para entendermos o que funciona e corrigir problemas.</li>
    </ul>

    <h2>3. Para que usamos seus dados</h2>
    <ul>
      <li>Gerar os materiais de divulgação do seu imóvel, personalizados com o seu perfil de voz;</li>
      <li>Processar pagamento e manter sua assinatura ativa;</li>
      <li>Entender como o sistema é usado, corrigir problemas e melhorar funcionalidades;</li>
      <li>Cumprir obrigações legais (ex: emissão de nota fiscal, se aplicável).</li>
    </ul>
    <p>A base legal para esses usos é a execução do contrato (você usando o sistema) e, quando aplicável, o legítimo interesse em melhorar o produto.</p>

    <h2>4. Com quem compartilhamos dados</h2>
    <p>Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço que nos ajudam a operar a Anuncia, cada um só recebendo o necessário para sua função:</p>
    <table class="legal-table">
      <tr><th>Prestador</th><th>Função</th></tr>
      <tr><td>Supabase</td><td>Login, banco de dados e armazenamento de logo (servidores no Brasil)</td></tr>
      <tr><td>Anthropic</td><td>Geração automatizada dos materiais de divulgação a partir dos dados que você informa</td></tr>
      <tr><td>Asaas</td><td>Processamento de pagamento (cartão, Pix, boleto), quando você assina um plano pago</td></tr>
    </table>
    <p>Alguns desses prestadores processam dados fora do Brasil (ex: Estados Unidos). Nesses casos, exigimos que sigam padrões de proteção equivalentes aos da LGPD — a Anthropic, por exemplo, não usa dados de produção para treinar seus modelos.</p>

    <h2>5. Por quanto tempo guardamos seus dados</h2>
    <p>Mantemos seus dados enquanto sua conta estiver ativa. Se você excluir sua conta, apagamos seus dados pessoais, imóveis cadastrados e materiais gerados em até 30 dias, exceto o que formos legalmente obrigados a manter (ex: registros fiscais de pagamento).</p>

    <h2>6. Seus direitos</h2>
    <p>Como titular dos dados, você pode a qualquer momento:</p>
    <ul>
      <li>Acessar quais dados temos sobre você;</li>
      <li>Corrigir dados incompletos ou desatualizados (direto no seu Perfil);</li>
      <li>Pedir a exclusão da sua conta e dos seus dados;</li>
      <li>Pedir uma cópia portátil dos seus dados;</li>
      <li>Saber com quem compartilhamos seus dados (seção 4 acima).</li>
    </ul>
    <p>Para exercer qualquer um desses direitos, use o contato ao final desta página. Respondemos em até 15 dias.</p>

    <h2>7. Segurança</h2>
    <p>Senhas ficam protegidas por hash, conexões são criptografadas (HTTPS) e o acesso aos dados é restrito a quem opera o serviço. Nenhum sistema é 100% imune a incidentes — se algo assim acontecer de forma a afetar seus dados, avisaremos você e a autoridade competente conforme exige a lei.</p>

    <h2>8. Uso por menores de idade</h2>
    <p>A Anuncia é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes.</p>

    <h2>9. Alterações nesta política</h2>
    <p>Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas no sistema antes de entrarem em vigor.</p>

    <h2>10. Contato</h2>
    <p>Dúvidas sobre privacidade ou para exercer seus direitos: <a href="mailto:severexseverys@gmail.com?subject=Privacidade Anuncia">severexseverys@gmail.com</a></p>
  `);

  document.querySelector("#legal-back-btn").addEventListener("click", onBack);
}
