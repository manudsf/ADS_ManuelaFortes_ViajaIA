# Checklist de testes manuais — ViajaIA

Use este checklist no navegador, com o backend e o frontend rodando localmente.
Para cada passo, marque **OK** ou **FALHOU** e anote o que aconteceu de diferente.

Ambiente de teste: ______ · Data: ______ · Navegador: ______ · Testador: ______

Legenda de tipo: **[F]** fluxo principal · **[E]** caso de erro · **[P]** permissão

---

## 1. Conta e acesso

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 1.1 | F | Em `/cadastro`, preencher nome, e-mail, senha (8+ caracteres) e criar a conta | Conta criada e usuário entra direto na área logada | |
| 1.2 | E | Tentar cadastrar com um e-mail já usado | Mensagem "Este e-mail já está cadastrado." | |
| 1.3 | E | Cadastrar com senha com menos de 8 caracteres | Campo bloqueia ou mensagem de erro, sem criar conta | |
| 1.4 | F | Sair e entrar em `/entrar` com e-mail e senha corretos | Entra e vai para `/viagens` | |
| 1.5 | E | Entrar com senha errada | Mensagem "E-mail ou senha inválidos." | |
| 1.6 | E | Errar a senha 5 vezes seguidas para o mesmo e-mail, depois usar a senha certa | Na 6ª tentativa: "Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente." | |
| 1.7 | E | Aguardar 15 minutos (ou reiniciar o backend) e entrar com a senha certa | Login volta a funcionar | |
| 1.8 | F | Em `/entrar`, clicar em "Continuar com o Google" e escolher uma conta | Entra e cria o perfil se for a primeira vez | |
| 1.9 | F | Em `/esqueci-senha`, pedir recuperação de senha com um e-mail cadastrado | Mensagem de confirmação; e-mail chega com o link | |
| 1.10 | F | Abrir o link do e-mail em `/redefinir-senha/:token` e definir nova senha | Senha trocada; login com a nova senha funciona | |
| 1.11 | E | Abrir `/viagens` sem estar logado | Redireciona para `/entrar` | |

## 2. Perfil

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 2.1 | F | Em `/perfil`, alterar nome e telefone e salvar | Dados salvos; ao recarregar a página continuam alterados | |
| 2.2 | F | Em `/perfil`, trocar a senha informando a senha atual | Troca concluída; login com a nova senha funciona | |
| 2.3 | E | Trocar a senha informando a senha atual errada | Mensagem de erro; senha não muda | |

## 3. Viagens e convites

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 3.1 | F | Em `/viagens/nova`, criar uma viagem com título e dados básicos | Viagem aparece em `/viagens` e abre o detalhe | |
| 3.2 | F | No detalhe da viagem, convidar outro usuário cadastrado pelo e-mail | Convite aparece para o convidado | |
| 3.3 | F | Logar com o convidado e aceitar o convite | Viagem aparece na lista do convidado como confirmada | |
| 3.4 | F | Logar com o convidado e recusar um convite | Viagem some da lista ou fica marcada como recusada | |
| 3.5 | F | Gerar link de convite, abrir em outra janela/usuário e aceitar | Usuário entra no grupo da viagem | |
| 3.6 | E | Abrir um link de convite revogado | Mensagem de convite inválido ou expirado | |
| 3.7 | P | Usuário que não é participante tentar abrir a viagem pela URL | Acesso negado ou redirecionamento | |
| 3.8 | F | Remover um participante (como administrador) | Participante sai da lista | |
| 3.9 | P | Participante comum tentar remover outro participante | Ação não disponível ou erro de permissão | |

## 4. Conversa com o agente e preferências

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 4.1 | F | Em `/viagens/:id/chat`, responder às perguntas do agente sobre a viagem | Mensagens aparecem na conversa e o agente responde | |
| 4.2 | F | Clicar em concluir a conversa | Conversa marcada como concluída; participante aparece como respondido | |
| 4.3 | F | Com todos os participantes com conversa concluída, gerar as preferências do grupo | Preferências geradas e visíveis no detalhe da viagem | |
| 4.4 | F | Editar uma preferência manualmente e salvar | Alteração persiste após recarregar | |
| 4.5 | E | Enviar mensagem vazia no chat | Mensagem não é enviada | |

## 5. Destinos e votação

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 5.1 | F | Em `/viagens/:id/destinos`, gerar sugestões de destinos | Lista de destinos aparece | |
| 5.2 | F | Votar em um destino | Voto contabilizado; não é possível votar duas vezes no mesmo destino | |
| 5.3 | F | Encerrar a votação (administrador) | Destino vencedor é definido e fica disponível para o roteiro | |
| 5.4 | P | Participante comum tentar encerrar a votação | Ação não disponível ou erro de permissão | |

## 6. Roteiro

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 6.1 | F | Com destino definido, gerar o roteiro (administrador) informando datas | Roteiro gerado com um bloco por dia (manhã, tarde, noite) | |
| 6.2 | F | Conferir se as datas do roteiro batem com as datas informadas | Dias e datas corretos | |
| 6.3 | E | Gerar roteiro com conversas pendentes | Mensagem informando participantes com conversa pendente | |
| 6.4 | F | Pedir ajuste no roteiro e gerar de novo | Roteiro atualizado respeitando o ajuste | |
| 6.5 | F | Clicar em "Baixar em PDF" | PDF baixa com o conteúdo do roteiro | |
| 6.6 | F | Clicar em "Buscar voos" | Abre Google Flights em nova aba com destino e datas | |
| 6.7 | P | Participante comum tentar gerar roteiro | Ação não disponível ou erro de permissão | |
| 6.8 | E | Conferir o tempo de geração do roteiro | Termina em tempo razoável (anotar o tempo: ______) | |

## 7. Despesas

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 7.1 | F | Em `/viagens/:id/despesas`, criar uma despesa de R$ 90,00 dividida entre 3 pessoas | Despesa aparece; cada um deve R$ 30,00 | |
| 7.2 | F | Criar despesa de valor que não divide exato (ex.: R$ 10,00 entre 3) | Soma das cotas é exatamente R$ 10,00 | |
| 7.3 | F | Editar uma despesa (valor e participantes) | Alteração salva; cotas recalculadas | |
| 7.4 | F | Ver o histórico de uma despesa após criar e editar | Histórico lista criação e edição | |
| 7.5 | F | Excluir uma despesa | Despesa some da lista e dos saldos | |
| 7.6 | F | Conferir os saldos e as transferências sugeridas | Quem deve paga a quem; soma dos saldos é zero | |
| 7.7 | E | Criar despesa com valor zero ou negativo | Erro; despesa não é criada | |
| 7.8 | P | Tentar editar ou excluir despesa paga por outra pessoa | Ação não permitida | |

## 8. Responsividade e navegação

| ID | Tipo | Passo | Resultado esperado | Status |
|----|------|-------|--------------------|--------|
| 8.1 | F | Abrir as telas principais em largura de celular (cerca de 390 px) | Sem rolagem horizontal; botões acessíveis | |
| 8.2 | F | Usar o botão voltar do navegador entre as telas | Navegação coerente, sem tela em branco | |
| 8.3 | E | Abrir uma URL inexistente | Página de erro ou redirecionamento sem quebrar o app | |
| 8.4 | E | Desligar o backend e tentar uma ação | Mensagem de erro amigável; app não trava | |

---

## Registro de bugs encontrados

| ID do teste | Descrição do problema | Gravidade (alta/média/baixa) | Situação |
|-------------|-----------------------|------------------------------|----------|
| | | | |
