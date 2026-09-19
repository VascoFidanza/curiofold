# Plataforma de venda de PDFs — visão geral do projeto

## Conceito
Uma plataforma online onde se vendem PDFs curtos (máximo 10 páginas) sobre temas diversos e interessantes, escritos num tom friendly e em formato storytelling. O objetivo é tornar temas como história, desporto, tecnologia, comida ou religião acessíveis e agradáveis de ler em poucos minutos.

## Produto
- Cada PDF cobre um tema específico dentro de uma área maior.
- Formato: até 10 páginas, linguagem simples e narrativa (não um artigo técnico ou enciclopédico).
- Preço fixo: 1€ por PDF.

## Áreas de conteúdo (exemplos iniciais)
História, desporto, tecnologia, comida, religião — a lista deverá expandir-se com o tempo consoante o interesse dos utilizadores.

## Investigação e escrita do conteúdo
- O conteúdo de cada PDF é investigado a fundo por Inteligência Artificial, com base em fontes credíveis: artigos científicos, livros e artigos de opinião de autores bem conceituados, além de fontes fidedignas na internet.
- A informação tem de ser sempre verdadeira e credível — sem invenções nem alucinações.
- O texto final é escrito como se fosse redigido por um humano, de forma que nunca se note que foi gerado por um agente de IA.
- Idiomas suportados: português (PT-PT), português do Brasil (PT-BR), inglês, espanhol, francês, alemão, italiano e holandês.

## Experiência no site
- Página com filtros por área.
- Dentro de cada área, uma grid com os PDFs disponíveis.
- O utilizador escolhe, compra e lê o PDF na plataforma.
- A organização exata da plataforma (separadores, páginas, navegação) fica em aberto — será decidida pelo Codex em Plan Mode durante a implementação.

## Leitura e proteção de conteúdo
- Não há download: o utilizador só pode ler o PDF dentro da própria plataforma, numa secção própria de leitura.
- A leitura tem de se adaptar bem ao ecrã e ao browser em qualquer dispositivo: iPhone, Android, iPad/tablet, computador e monitores externos.
- Não haverá app nativa (não estará na App Store nem na Google Play) — tudo corre no browser.
- Tentativas de tirar screenshot devem ser bloqueadas, resultando num ecrã preto em vez do conteúdo.

## Contas de utilizador e progresso de leitura
- É necessário criar conta na plataforma para comprar e ler PDFs.
- A plataforma tem de acompanhar o progresso de leitura de cada utilizador por PDF, mostrando a percentagem lida de cada um.
- Também mostra a percentagem geral de PDFs lidos face ao total de PDFs comprados por esse utilizador.
- No futuro, está prevista uma componente de gamificação dos PDFs comprados e lidos, visível na página de conta do utilizador.

## Processos de negócio principais
1. **Criação de conteúdo** — escolha do tema, investigação por IA em fontes credíveis, escrita em tom storytelling e estilo humano, edição, design/paginação em PDF, tradução para os vários idiomas.
2. **Catalogação** — cada PDF é organizado por área e disponibilizado na grid do site.
3. **Venda** — checkout simples, pagamento de 1€.
4. **Entrega e leitura** — acesso imediato ao PDF dentro da plataforma, sem download, com proteção contra screenshots e acompanhamento do progresso de leitura.
5. **Marketing e melhoria contínua** — perceber que temas vendem mais e usar isso para orientar novos conteúdos.

## Modelo de negócio
Catálogo crescente de PDFs de baixo custo e alto volume, apelando à curiosidade das pessoas por temas variados, com um preço de compra por impulso (1€) que reduz a fricção de decisão.

## O que se pretende desta análise
Ajudar a pensar sobre o conceito de negócio em si — proposta de valor, posicionamento, estratégia de conteúdo e idiomas, preços, crescimento, retenção (progresso de leitura e futura gamificação) e diferenciação — sem entrar em detalhes técnicos de implementação (modelação de dados, arquitetura de backend ou gestão de plataforma), que ficarão para uma fase seguinte de planeamento técnico com o Codex.
