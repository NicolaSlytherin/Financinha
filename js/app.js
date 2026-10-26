(function () {
  'use strict';
  var F = FS, KV = SEG.kv, VERSAO = '3.0';
  var $app = document.getElementById('app');
  var $abas = document.getElementById('abas');
  var $folha = document.getElementById('folha');
  var $toast = document.getElementById('toast');
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  var mem = {};
  function mk(tipo) {
    return {
      get: function (k) { try { var v = window[tipo].getItem(k); return v ? JSON.parse(v) : (own(mem, tipo + k) ? mem[tipo + k] : null); } catch (e) { return own(mem, tipo + k) ? mem[tipo + k] : null; } },
      set: function (k, v) { mem[tipo + k] = v; try { window[tipo].setItem(k, JSON.stringify(v)); } catch (e) {} },
      del: function (k) { delete mem[tipo + k]; try { window[tipo].removeItem(k); } catch (e) {} },
    };
  }
  var LS = mk('localStorage'), SS = mk('sessionStorage');
  var K = { conta: 'fs:conta', sess: 'fs:sessao', rasc: 'fs:rascunho', bloq: 'fs:bloqueio', legado: 'fs:dados:real', legadoDemo: 'fs:dados:demo' };
  var MIN30 = 30 * 60 * 1000, DIAS30 = 30 * 24 * 3600 * 1000, SETE_DIAS = 7 * 24 * 3600 * 1000;

  var modo = null, S = null, CHAVE = null;
  var view = 'acesso', params = {};
  var form = null, formTentou = false, formSujo = false;
  var ui = { histMes: F.ym(F.hoje()), histTipo: 'todos', histSit: 'todas', histCat: '', histCartao: '', histBusca: '', histPag: 1, fatKey: null, acesso: 'entrar', relTipo: 'rd', relPer: '6', relCat: 'atual', relSel: null, catTipo: 'd' };
  var ultimaAtividade = Date.now(), fila = Promise.resolve(), ocupado = false, rascunhoPendente = null;

  function salvar() {
    F.limpar();
    var m = modo; if (!m || !S) return fila;
    var p = m === 'demo' ? Promise.resolve(JSON.parse(JSON.stringify(S))) : SEG.cifrar(CHAVE, S);
    fila = fila.then(function () { return p; }).then(function (v) { return KV.set('dados:' + m, v); })
      .catch(function (e) { toast(/quota/i.test(String(e && (e.name + e.message))) ? 'Sem espaço no aparelho para salvar. Exporte e apague dados antigos.' : 'Não foi possível salvar a última alteração. Tente de novo.'); });
    return fila;
  }
  async function carregar(m) {
    modo = m; var bruto = null;
    if (m === 'demo') {
      bruto = await KV.get('dados:demo');
      if (!bruto) { bruto = LS.get(K.legadoDemo); LS.del(K.legadoDemo); }
      if (!bruto) bruto = F.gerarExemplo();
    } else {
      var env = await KV.get('dados:real');
      bruto = env ? await SEG.decifrar(CHAVE, env) : F.novoDados();
    }
    var r = F.sanear(bruto);
    S = r.dados;
    var lim = Date.now() - 30 * 24 * 3600 * 1000;
    S.lanc = S.lanc.filter(function (l) { return !l.excl || Date.parse(l.excl) > lim; });
    F.usar(S); await salvar();
    if (r.descartados) setTimeout(function () { toast(r.descartados + (r.descartados === 1 ? ' registro inválido foi ignorado' : ' registros inválidos foram ignorados') + ' ao abrir os dados.'); }, 400);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"'`]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]; }); }
  var I = {
    voltar: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mais: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 4v14M4 11h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    casa: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 10l8-6 8 6v8H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    lista: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 6h12M5 11h12M5 16h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cartao: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="2.5" y="5" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9h17" stroke="currentColor" stroke-width="1.8"/></svg>',
    menu: '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="5" cy="11" r="1.6" fill="currentColor"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/><circle cx="17" cy="11" r="1.6" fill="currentColor"/></svg>',
    seta: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    setaE: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    rep: '<svg width="12" height="12" viewBox="0 0 12 12" role="img" aria-label="repete"><path d="M2 5a4 4 0 0 1 7-2M10 7a4 4 0 0 1-7 2M9 1v2.5H6.5M3 11V8.5h2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cadeado: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style="flex:none;margin-top:2px"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    logo: '<svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="10" style="fill:var(--accent)"/><path d="M10 24 L16 17 L20 21 L27 12" style="stroke:var(--on-accent)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  function topo(titulo, voltarPara, dir) {
    return '<header class="topo"><div class="topo-esq">' + (voltarPara ? '<button class="voltar" data-act="ir" data-v="' + esc(voltarPara) + '" aria-label="Voltar">' + I.voltar + '</button>' : '') +
      '<h1 class="h1">' + esc(titulo) + '</h1></div>' + (dir || '') + '</header>';
  }
  function chip(rotulo, act, extra, on) { return '<button type="button" class="chip" data-act="' + act + '" ' + extra + ' aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(rotulo) + '</button>'; }
  function pillSit(s) { return '<span class="pill ' + { cartao: 'p-card', prevista: 'p-neu', recebida: 'p-ok', pendente: 'p-warn', paga: 'p-ok' }[s] + '">' + F.SIT_LABEL[s] + '</span>'; }
  function pillFat(st) { return '<span class="pill ' + { 'Aberta': 'p-card', 'Fechada': 'p-warn', 'Vencida': 'p-neg', 'Paga': 'p-ok', 'Paga parcialmente': 'p-warn', 'Sem compras': 'p-neu' }[st] + '">' + st + '</span>'; }
  function pillMeta(st) { return '<span class="pill ' + { 'Em andamento': 'p-card', 'Concluída': 'p-ok', 'Atrasada': 'p-neg', 'Cancelada': 'p-neu' }[st] + '">' + st + '</span>'; }
  function valorTxt(l) { return (l.tipo === 'r' ? '+ ' : '− ') + F.fmt(l.valor).replace('−', ''); }
  function descTxt(l) { return l.desc + (l.parc ? ' (' + l.parc.i + '/' + l.parc.n + ')' : ''); }
  function moedaIn(v) { return v > 0 ? F.mascaraMoeda(String(Math.round(v * 100))) : ''; }
  function itemLanc(l) {
    var meta = [F.brCurto(l.data), esc(F.nomeCat(l.cat))];
    if (l.cartaoId) { var c = F.cartao(l.cartaoId); if (c) meta.push(esc(c.apelido)); } else if (l.forma) meta.push(esc(l.forma));
    return '<button type="button" class="item" data-act="acoesLanc" data-id="' + esc(l.id) + '">' +
      '<span class="meio"><span class="t">' + esc(descTxt(l)) + '</span><span class="m"><span class="num">' + meta.join(' · ') + '</span>' + (l.serie ? I.rep : '') + '</span></span>' +
      '<span class="dir"><span class="v num' + (l.tipo === 'r' ? ' v-r' : '') + '">' + valorTxt(l) + '</span>' + pillSit(F.situacao(l)) + '</span></button>';
  }
  function campo(id, rot, tipo, extra) { return '<div class="campo"><label for="' + id + '">' + rot + '</label><input class="inp" id="' + id + '" type="' + tipo + '" ' + (extra || '') + '></div>'; }
  function inMoeda(id, rot, valor) { return '<div class="campo"><label for="' + id + '">' + rot + '</label><input class="inp num" id="' + id + '" type="text" data-mask="moeda" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="0,00" value="' + esc(valor || '') + '"></div>'; }
  var toastTimer = null, toastDesfazer = null;
  function toast(msg, desfazerFn) {
    clearTimeout(toastTimer); toastDesfazer = desfazerFn || null;
    $toast.innerHTML = '<span>' + esc(msg) + '</span>' + (desfazerFn ? '<button type="button" data-act="desfazerToast">Desfazer</button>' : '');
    $toast.hidden = false;
    toastTimer = setTimeout(function () { $toast.hidden = true; toastDesfazer = null; }, desfazerFn ? 6000 : 4000);
  }
  function abrirFolha(html, label) { $folha.innerHTML = '<div class="folha" role="dialog" aria-modal="true" aria-label="' + esc(label || 'Opções') + '">' + html + '</div>'; $folha.hidden = false; var f = $folha.querySelector('input'); if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 60); }
  function fecharFolha() { $folha.hidden = true; $folha.innerHTML = ''; }
  function erroEm(id, msg) { var e = document.getElementById(id); if (e) { e.textContent = msg; e.hidden = false; } }
  function ocupar(btn, txt) { ocupado = true; if (btn) { btn.dataset.txt = btn.textContent; btn.textContent = txt; btn.disabled = true; } }
  function liberar(btn) { ocupado = false; if (btn && btn.isConnected) { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; } }

  function ir(v, p) {
    if (view === 'lanc' && v !== 'lanc') { form = null; formSujo = false; }
    view = own(VIEWS, v) ? v : 'painel'; params = p || {}; fecharFolha(); render(); window.scrollTo(0, 0);
  }
  function render() {
    F.limpar();
    if (view !== 'acesso' && view !== 'erroDados' && !S) view = 'acesso';
    if (view === 'lanc' && !form) view = 'painel';
    $app.className = 'app' + (view === 'lanc' ? ' sem-abas' : '');
    $app.innerHTML = VIEWS[view]();
    var comAbas = !!(modo && S) && view !== 'lanc' && view !== 'acesso' && view !== 'erroDados';
    $abas.hidden = !comAbas;
    if (comAbas) renderAbas();
    if (view === 'historico') renderHistLista();
    if (view === 'relatorios') desenharRelatorio();
  }
  function renderAbas() {
    var at = { painel: 'painel', historico: 'historico', cartoes: 'cartoes', cartao: 'cartoes' }[view] || 'mais';
    var a = function (v, ic, r) { return '<button type="button" class="aba" data-act="ir" data-v="' + v + '"' + (at === v ? ' aria-current="page"' : '') + '>' + ic + r + '</button>'; };
    $abas.innerHTML = '<nav aria-label="Navegação principal">' + a('painel', I.casa, 'Painel') + a('historico', I.lista, 'Histórico') +
      '<button type="button" class="aba aba-mais" data-act="novo" aria-label="Novo lançamento"><span>' + I.mais + '</span></button>' +
      a('cartoes', I.cartao, 'Cartões') + a('mais', I.menu, 'Mais') + '</nav>';
  }

  var VIEWS = {};

  VIEWS.acesso = function () {
    var conta = LS.get(K.conta);
    var cad = ui.acesso === 'cadastro' || !conta;
    var bloq = LS.get(K.bloq) || { falhas: 0, ate: 0 };
    var bloqueado = bloq.ate > Date.now();
    var h = '<div style="display:flex;flex-direction:column;gap:22px;padding-top:28px"><div class="logo">' + I.logo + 'Finanças Simples</div>';
    if (!SEG.disponivel()) h += '<div class="aviso a-neg">Este navegador não oferece criptografia segura. Use uma versão atual do Chrome, Safari, Firefox ou Edge para criar uma conta. O modo de exemplo continua disponível.</div>';
    if (cad) {
      h += '<div><h1 class="h1" style="font-size:31px">' + (conta ? 'Criar outra conta' : 'Crie sua conta') + '</h1><p class="sub" style="margin:6px 0 0;font-size:15px">Registre o que entra, o que sai e o que ainda vai vencer.</p></div>' +
        '<form id="f-cad" class="painel" novalidate>' +
        campo('cad-nome', 'Nome completo', 'text', 'data-mask="nome" autocomplete="name" maxlength="80"') +
        campo('cad-email', 'E-mail', 'email', 'data-mask="email" autocomplete="email" inputmode="email" maxlength="120"') +
        campo('cad-senha', 'Senha', 'password', 'autocomplete="new-password" maxlength="128" placeholder="8 ou mais, com letra e número"') +
        campo('cad-senha2', 'Confirme a senha', 'password', 'autocomplete="new-password" maxlength="128"') +
        '<label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;min-height:44px"><input type="checkbox" id="cad-termos" style="width:20px;height:20px;margin:2px 0 0;accent-color:var(--accent)"> <span>Li e aceito os termos de uso e a política de privacidade.</span></label>' +
        '<div id="cad-erro" class="aviso a-neg" role="alert" hidden></div>' +
        '<button class="btn btn-pri" type="submit"' + (SEG.disponivel() ? '' : ' disabled') + '>Criar conta</button>' +
        '<p class="sub" style="margin:0;display:flex;gap:6px;align-items:flex-start">' + I.cadeado + '<span>A conta e os dados ficam só neste aparelho, cifrados com a sua senha. Sem a senha, ninguém lê os dados, nem nós.</span></p>' +
        '</form>' + (conta ? '<button class="btn-txt" data-act="acessoModo" data-v="entrar">Já tenho conta neste aparelho</button>' : '');
    } else {
      h += '<div><h1 class="h1" style="font-size:31px">Entrar</h1><p class="sub" style="margin:6px 0 0;font-size:15px">Olá de novo. Seus dados ficam cifrados neste aparelho.</p></div>' +
        '<form id="f-login" class="painel" novalidate>' +
        campo('log-email', 'E-mail', 'email', 'data-mask="email" autocomplete="email" inputmode="email" maxlength="120" value="' + esc(conta.email) + '"') +
        campo('log-senha', 'Senha', 'password', 'autocomplete="current-password" maxlength="128"') +
        '<label style="display:flex;gap:10px;align-items:center;font-size:14px;min-height:44px"><input type="checkbox" id="log-manter" style="width:20px;height:20px;margin:0;accent-color:var(--accent)"> Manter-me conectado por 30 dias</label>' +
        '<div id="log-erro" class="aviso a-neg" role="alert"' + (bloqueado ? '' : ' hidden') + '>' + (bloqueado ? 'Muitas tentativas. Tente de novo em ' + Math.ceil((bloq.ate - Date.now()) / 60000) + ' minutos.' : '') + '</div>' +
        '<button class="btn btn-pri" type="submit"' + (bloqueado ? ' disabled' : '') + '>Entrar</button>' +
        '<button class="btn-txt" type="button" data-act="esqueci">Esqueci minha senha</button>' +
        '</form><button class="btn-txt" data-act="acessoModo" data-v="cadastro">Criar outra conta neste aparelho</button>';
    }
    h += '<div class="painel" style="gap:10px"><strong>Só quer conhecer?</strong><span class="sub" style="font-size:14px">Abra com meses de exemplo já preenchidos: salário, contas, compras no cartão, faturas e metas.</span>' +
      '<button class="btn btn-sec" data-act="entrarDemo">Experimentar com dados de exemplo</button></div></div>';
    return h;
  };

  async function cadastrar(ev) {
    ev.preventDefault(); if (ocupado) return;
    var g = function (id) { return document.getElementById(id); };
    var nome = F.limparTexto(g('cad-nome').value, 80), email = g('cad-email').value.trim().toLowerCase(), s1 = g('cad-senha').value, s2 = g('cad-senha2').value, err = null;
    if (!F.nomeValido(nome)) err = 'Informe o nome completo, só com letras (3 a 80 caracteres).';
    else if (!F.emailValido(email)) err = 'Informe um e-mail no formato nome@dominio.com.';
    else if ((err = F.senhaProblema(s1, email))) {  }
    else if (s1 !== s2) err = 'As duas senhas não são iguais.';
    else if (!g('cad-termos').checked) err = 'Para criar a conta, aceite os termos de uso e a política de privacidade.';
    if (err) return erroEm('cad-erro', err);
    var btn = ev.target.querySelector('button[type="submit"]'); ocupar(btn, 'Protegendo seus dados…');
    try {
      var sal = SEG.sal(), d = await SEG.derivar(s1, sal);
      CHAVE = d.chave;
      LS.set(K.conta, { v: 2, email: email, sal: sal, iter: SEG.ITER, verif: d.verif, criada: new Date().toISOString() });
      LS.del(K.legado); LS.del(K.bloq); LS.del(K.rasc);
      var novo = F.novoDados(); novo.perfil.nome = nome;
      await KV.set('dados:real', await SEG.cifrar(CHAVE, novo));
      liberar(btn);
      await iniciarSessao('real', false);
      toast('Conta criada. Bem-vindo!');
    } catch (e) { liberar(btn); erroEm('cad-erro', 'Não foi possível criar a conta neste navegador. Tente de novo.'); }
  }
  async function entrar(ev) {
    ev.preventDefault(); if (ocupado) return;
    var conta = LS.get(K.conta), bloq = LS.get(K.bloq) || { falhas: 0, ate: 0 };
    if (bloq.ate > Date.now()) return;
    var email = document.getElementById('log-email').value.trim().toLowerCase(), senha = document.getElementById('log-senha').value;
    if (!email || !senha) return erroEm('log-erro', 'Preencha o e-mail e a senha.');
    var manter = document.getElementById('log-manter').checked;
    var btn = ev.target.querySelector('button[type="submit"]'); ocupar(btn, 'Verificando…');
    var ok = false;
    try {
      if (conta && conta.v === 2) {
        var d = await SEG.derivar(senha, conta.sal, conta.iter);
        ok = F.iguais(d.verif, conta.verif) && F.iguais(email, conta.email);
        if (ok) CHAVE = d.chave;
      } else if (conta && conta.hash) {
        ok = F.iguais(await SEG.sha256Antigo(senha, conta.sal), conta.hash) && F.iguais(email, conta.email);
        if (ok) {
          var sal = SEG.sal(), d2 = await SEG.derivar(senha, sal), antigo = LS.get(K.legado) || F.novoDados();
          antigo.perfil = { nome: conta.nome || '' }; CHAVE = d2.chave;
          await KV.set('dados:real', await SEG.cifrar(CHAVE, antigo));
          LS.set(K.conta, { v: 2, email: conta.email, sal: sal, iter: SEG.ITER, verif: d2.verif, criada: conta.criada || new Date().toISOString() });
          LS.del(K.legado);
        }
      }
    } catch (e) { ok = false; }
    liberar(btn);
    if (!ok) {
      bloq.falhas = (bloq.falhas || 0) + 1;
      if (bloq.falhas >= 5) { LS.set(K.bloq, { falhas: 0, ate: Date.now() + 15 * 60000 }); render(); return; }
      LS.set(K.bloq, bloq);
      return erroEm('log-erro', 'E-mail ou senha inválidos.');
    }
    LS.del(K.bloq);
    await iniciarSessao('real', manter);
  }
  async function iniciarSessao(m, manter) {
    var sess = { modo: m, manter: !!manter, ultimo: Date.now() };
    (manter ? LS : SS).set(K.sess, sess); (manter ? SS : LS).del(K.sess);
    if (m === 'real') await KV.set('chave', CHAVE); else { CHAVE = null; await KV.del('chave'); }
    try { await carregar(m); } catch (e) { S = null; view = 'erroDados'; render(); return; }
    ultimaAtividade = Date.now();
    ir('painel');
    var r = LS.get(K.rasc);
    if (!r || r.modo !== m || !(Date.now() - r.em < SETE_DIAS)) { if (r) LS.del(K.rasc); return; }
    var f = null;
    try { f = r.env ? await SEG.decifrar(CHAVE, r.env) : r.form; } catch (e) { f = null; }
    f = limparForm(f);
    if (!f) { LS.del(K.rasc); return; }
    rascunhoPendente = f;
    var v = F.parseValor(f.valor);
    abrirFolha('<span class="pill p-warn" style="align-self:flex-start">Rascunho salvo neste aparelho</span>' +
      '<h2 class="h1">Continuar de onde parou?</h2><p style="margin:0;color:var(--muted)">Sua sessão expirou enquanto você preenchia um lançamento. Os dados digitados foram guardados.</p>' +
      '<div class="painel" style="padding:14px"><div class="linha"><strong>' + esc(f.desc || 'Sem descrição') + '</strong><strong class="num">' + (v > 0 ? F.fmt(v) : '—') + '</strong></div>' +
      '<span class="sub">' + (f.tipo === 'r' ? 'Receita' : 'Despesa') + (F.dataValida(f.data) ? ' · ' + F.br(f.data) : '') + '</span></div>' +
      '<p class="sub" style="margin:0">O rascunho é apagado quando você salva, descarta, sai ou depois de 7 dias.</p>' +
      '<button class="btn btn-pri" data-act="restaurarRasc">Restaurar e continuar</button><button class="btn btn-sec" data-act="descartarRasc">Descartar</button>', 'Rascunho');
  }
  function limparForm(f) {
    if (!f || typeof f !== 'object') return null;
    var b = F.formVazio(f.tipo === 'r' ? 'r' : 'd');
    b.desc = F.filtroTexto(f.desc, 60); b.valor = F.mascaraMoeda(f.valor); b.data = F.dataValida(f.data) ? f.data : b.data;
    b.cat = S.cats.some(function (c) { return c.id === f.cat && c.tipo === b.tipo; }) ? f.cat : '';
    b.forma = (FORMAS[b.tipo].indexOf(f.forma) >= 0) ? f.forma : '';
    b.sit = f.sit === 'pendente' ? 'pendente' : 'paga';
    b.cartaoId = S.cartoes.some(function (c) { return c.id === f.cartaoId; }) ? f.cartaoId : '';
    b.parc = Math.max(1, Math.min(24, parseInt(f.parc, 10) || 1));
    b.rec = f.rec === true; b.per = ['semanal', 'quinzenal', 'mensal', 'anual'].indexOf(f.per) >= 0 ? f.per : 'mensal';
    b.reps = Math.max(2, Math.min(60, parseInt(f.reps, 10) || 6));
    b.regra = ['antecipar', 'postergar', 'manter'].indexOf(f.regra) >= 0 ? f.regra : null;
    b.obs = F.filtroTexto(f.obs, 200);
    return b;
  }
  function sessaoAtual() { return SS.get(K.sess) || LS.get(K.sess); }
  function limiteSessao(s) { return s && s.manter ? DIAS30 : MIN30; }
  async function encerrar(motivo) {
    SS.del(K.sess); LS.del(K.sess); modo = null; S = null; CHAVE = null; form = null; formSujo = false; F.usar(F.novoDados());
    await KV.del('chave');
    ui.acesso = LS.get(K.conta) ? 'entrar' : 'cadastro'; ir('acesso');
    if (motivo) toast(motivo);
  }
  async function expirar() {
    if (!modo) return;
    if (view === 'lanc' && form && !form.id && formSujo) {
      try { LS.set(K.rasc, modo === 'real' ? { modo: modo, em: Date.now(), env: await SEG.cifrar(CHAVE, form) } : { modo: modo, em: Date.now(), form: form }); } catch (e) {}
    }
    await encerrar('Sua sessão expirou por inatividade. Entre de novo para continuar.');
  }

  VIEWS.erroDados = function () {
    return '<div style="display:flex;flex-direction:column;gap:16px;padding-top:28px"><div class="logo">' + I.logo + 'Finanças Simples</div>' +
      '<h1 class="h1">Não conseguimos abrir seus dados</h1>' +
      '<p style="margin:0;color:var(--muted)">Os dados guardados neste aparelho não passaram na verificação de integridade. Eles podem ter sido alterados fora do aplicativo ou estão corrompidos. Por segurança, nada foi carregado.</p>' +
      '<button class="btn btn-pri" data-act="sair">Voltar para o acesso</button><button class="btn btn-sec" data-act="apagarTudoReal" style="color:var(--neg)">Apagar os dados deste aparelho</button></div>';
  };

  VIEWS.painel = function () {
    var k = F.ym(F.hoje()), s = F.saldoMes(k), cats = F.catsMes(k), temLanc = F.ativos().length > 0;
    var h = '';
    if (modo === 'demo') h += '<div class="aviso a-warn banner"><span>Você está vendo dados de exemplo.</span><button class="btn-peq" data-act="sairDemo">Sair do exemplo</button></div>';
    h += topo('Painel', null, '<span class="sub">' + esc(F.mesNome(k)) + '</span>');
    if (modo === 'real' && S.perfil && S.perfil.nome) h += '<p style="margin:-8px 0 0;color:var(--muted)">Olá, ' + esc(S.perfil.nome.split(' ')[0]) + '.</p>';
    h += '<section class="hero" aria-label="Saldos do mês"><div style="display:flex;flex-direction:column;gap:2px"><span class="rot">Saldo realizado no mês</span><span class="big num' + (s.realizado < 0 ? ' neg' : '') + '">' + F.fmt(s.realizado) + '</span></div><hr>' +
      '<div class="linha" style="align-items:flex-end"><div style="display:flex;flex-direction:column;gap:2px"><span class="rot">Saldo previsto até o fim do mês</span><span class="num' + (s.previsto < 0 ? ' neg' : '') + '" style="font-size:20px;font-weight:600">' + F.fmt(s.previsto) + '</span></div>' +
      '<span class="rot num" style="text-align:right;font-size:12px;line-height:1.5">+ ' + F.fmt(s.aReceber) + ' a receber<br>− ' + F.fmt(s.aPagar).replace('−', '') + ' a pagar</span></div></section>';
    if (s.realizado < 0) h += '<div class="aviso a-neg">O saldo realizado deste mês está negativo.</div>';
    h += '<button class="btn btn-pri fab" data-act="novo">' + I.mais + ' Novo lançamento</button>';
    if (!temLanc) h += '<section class="painel" aria-label="Primeiros passos"><strong>Comece pelo primeiro lançamento</strong><p style="margin:0;color:var(--muted)">Toque em <b>Novo lançamento</b>, escolha se é despesa ou receita, informe valor, data e categoria e salve. O saldo aparece aqui na hora.</p><p style="margin:0;color:var(--muted)">Usa cartão de crédito? Cadastre o cartão na aba <b>Cartões</b> para que as compras entrem na fatura certa.</p></section>';
    S.cartoes.filter(function (c) { return c.ativo; }).forEach(function (c) {
      var f = F.fatura(c.id, F.faturaDe(c, F.hoje())), uso = F.usoLimite(c.id), pct = c.limite ? Math.min(100, uso / c.limite * 100) : 0;
      h += '<button type="button" class="painel" data-act="ir" data-v="cartao" data-id="' + esc(c.id) + '" style="text-align:left;width:100%" aria-label="Fatura do ' + esc(c.apelido) + '">' +
        '<div class="linha"><div style="display:flex;align-items:center;gap:10px;color:var(--card)">' + I.cartao + '<div style="display:flex;flex-direction:column;color:var(--fg)"><strong>' + esc(c.apelido) + '</strong><span class="sub">Fecha ' + F.brCurto(f.fecha) + ' · vence ' + F.brCurto(f.vence) + '</span></div></div>' + pillFat(f.status) + '</div>' +
        '<div class="linha"><span class="sub">Fatura atual</span><strong class="num" style="font-size:18px">' + F.fmt(f.total) + '</strong></div>' +
        (c.limite ? '<div class="barra cartao' + (pct >= 80 ? ' alerta' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div><span class="sub">' + Math.round(pct) + '% do limite de ' + F.fmt(c.limite) + ' comprometido' + (pct >= 80 ? '. Atenção: acima de 80%.' : '') + '</span>' : '') + '</button>';
    });
    var metas = S.metas.filter(function (m) { return !m.cancelada && F.statusMeta(m) !== 'Concluída'; });
    if (metas.length) {
      h += '<section class="painel" aria-label="Metas"><div class="linha"><h2 class="h2">Metas</h2><button class="btn-txt" data-act="ir" data-v="metas" data-de="painel">Ver metas</button></div>';
      metas.slice(0, 2).forEach(function (m) { var p = Math.min(100, F.progresso(m)); h += '<div style="display:flex;flex-direction:column;gap:4px"><div class="linha" style="font-size:14px"><span>' + esc(m.nome) + '</span><span class="num sub">' + F.fmt(F.acumulado(m)) + ' de ' + F.fmt(m.alvo) + '</span></div><div class="barra"><i style="width:' + p.toFixed(1) + '%"></i></div></div>'; });
      h += '</section>';
    }
    if (cats.itens.length) {
      h += '<section class="painel" aria-label="Despesas por categoria"><div class="linha"><h2 class="h2">Despesas por categoria</h2><span class="sub num">' + F.fmt(cats.total) + '</span></div>';
      cats.itens.forEach(function (c, i) { h += '<div style="display:flex;flex-direction:column;gap:4px"><div class="linha" style="font-size:13px"><span>' + esc(c.nome) + '</span><span class="num sub">' + F.fmt(c.valor) + ' · ' + c.pct.toFixed(1).replace('.', ',') + '%</span></div><div class="barra" style="height:6px"><i style="width:' + c.pct.toFixed(1) + '%;opacity:' + Math.max(0.35, 1 - i * 0.13).toFixed(2) + '"></i></div></div>'; });
      h += '<button class="btn-txt" style="align-self:flex-start;padding:0" data-act="ir" data-v="relatorios" data-de="painel">Ver relatórios</button></section>';
    }
    var ult = F.ativos().filter(function (l) { return l.data <= F.hoje(); }).sort(ordem).slice(0, 5);
    if (ult.length) h += '<section aria-label="Últimos lançamentos" style="display:flex;flex-direction:column;gap:8px"><div class="linha"><h2 class="h2">Últimos lançamentos</h2><button class="btn-txt" data-act="ir" data-v="historico">Ver histórico</button></div><div class="lista">' + ult.map(itemLanc).join('') + '</div></section>';
    return h;
  };
  function ordem(a, b) { return a.data === b.data ? (a.criado < b.criado ? 1 : -1) : (a.data < b.data ? 1 : -1); }

  var FORMAS = { d: ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Outros'], r: ['Dinheiro', 'PIX', 'Transferência', 'Depósito', 'Outros'] };
  VIEWS.lanc = function () {
    var f = form, ed = !!f.id, orig = ed ? S.lanc.filter(function (l) { return l.id === f.id; })[0] : null;
    var cred = F.ehCredito(f), e = formTentou ? F.validar(f) : {};
    var trava = ed && orig && orig.cartaoId && (orig.parc || faturaPagaDe(orig));
    var h = topo(ed ? (f.tipo === 'r' ? 'Editar receita' : 'Editar despesa') : 'Novo lançamento', params.de || 'painel');
    if (params.restaurado) h += '<div class="aviso a-warn banner"><span>Rascunho restaurado. Confira e salve.</span><button class="btn-peq" data-act="descartarForm">Descartar</button></div>';
    if (!ed) h += '<div class="seg" role="group" aria-label="Tipo de lançamento"><button type="button" data-act="setTipo" data-v="d" aria-pressed="' + (f.tipo === 'd') + '">Despesa</button><button type="button" data-act="setTipo" data-v="r" aria-pressed="' + (f.tipo === 'r') + '">Receita</button></div>';
    if (formTentou && Object.keys(e).length) h += '<div class="aviso a-neg" role="alert">Revise os campos marcados para salvar.</div>';
    h += '<div class="painel">';
    h += '<div class="campo"><label for="f-desc">Descrição *</label><input id="f-desc" class="inp' + (e.desc ? ' erro' : '') + '" data-f="desc" data-mask="texto" value="' + esc(f.desc) + '" maxlength="60" placeholder="Ex.: Mercado, Salário" autocomplete="off">' + (e.desc ? '<span class="msg-erro">' + e.desc + '</span>' : '') + '</div>';
    h += '<div class="grade2"><div class="campo"><label for="f-valor">' + (cred && !ed && f.parc > 1 ? 'Valor total (R$) *' : 'Valor (R$) *') + '</label><input id="f-valor" class="inp num' + (e.valor ? ' erro' : '') + '" data-f="valor" data-mask="moeda" inputmode="numeric" maxlength="12" value="' + esc(f.valor) + '" placeholder="0,00" autocomplete="off"' + (trava ? ' disabled' : '') + '>' + (e.valor ? '<span class="msg-erro">' + e.valor + '</span>' : '') + '</div>' +
      '<div class="campo"><label for="f-data">' + (cred ? 'Data da compra' : f.tipo === 'r' ? 'Recebimento' : 'Vencimento') + ' *</label><input id="f-data" type="date" class="inp num' + (e.data ? ' erro' : '') + '" data-f="data" data-rerender="1" value="' + esc(f.data) + '" min="' + F.LIM.DATA_MIN + '" max="' + (ed ? F.LIM.DATA_MAX : F.addMonths(F.hoje(), 12)) + '"' + (trava ? ' disabled' : '') + '>' + (e.data ? '<span class="msg-erro">' + e.data + '</span>' : '') + '</div></div>';
    if (trava) h += '<div class="aviso a-card">' + (orig.parc ? 'Parcelas têm valor e data definidos pela compra. Para mudar, exclua a compra inteira e lance de novo.' : 'Esta compra está numa fatura paga. Estorne o pagamento da fatura para mudar valor ou data.') + '</div>';
    var motU = (!f.rec && !cred && F.dataValida(f.data)) ? F.naoUtil(f.data) : null;
    if (motU) h += '<div class="aviso a-warn">' + F.br(f.data) + ' cai em ' + (F.feriado(f.data) ? 'feriado (' + esc(motU) + ')' : esc(motU.toLowerCase())) + '. A data será mantida.</div>';
    var cats = S.cats.filter(function (c) { return c.tipo === f.tipo && (c.ativa || c.id === f.cat); });
    h += '<div class="campo"><span class="rotulo" id="r-cat">Categoria *</span><div class="chips" role="group" aria-labelledby="r-cat">' + cats.map(function (c) { return chip(c.nome, 'setF', 'data-k="cat" data-v="' + esc(c.id) + '"', f.cat === c.id); }).join('') + '</div>' + (e.cat ? '<span class="msg-erro">' + e.cat + '</span>' : '') + '</div>';
    if (!(ed && orig && orig.cartaoId)) h += '<div class="campo"><span class="rotulo" id="r-forma">' + (f.tipo === 'r' ? 'Forma de recebimento' : 'Forma de pagamento') + '</span><div class="chips" role="group" aria-labelledby="r-forma">' + FORMAS[f.tipo].filter(function (x) { return !(ed && x === 'Cartão de crédito'); }).map(function (x) { return chip(x, 'setF', 'data-k="forma" data-v="' + esc(x) + '" data-toggle="1"', f.forma === x); }).join('') + '</div></div>';
    if (cred && !ed) {
      var cs = S.cartoes.filter(function (c) { return c.ativo; });
      h += '<div class="aviso a-card" style="display:flex;flex-direction:column;gap:12px;padding:14px">';
      if (!cs.length) h += '<span>Você ainda não tem cartão cadastrado. Cadastre agora; o que você já preencheu continua aqui.</span><button type="button" class="btn btn-sec" data-act="cartaoForm">Cadastrar cartão</button>';
      else {
        if (cs.length === 1 && !f.cartaoId) f.cartaoId = cs[0].id;
        h += '<div class="campo"><span class="rotulo" id="r-cart">Cartão *</span><div class="chips" role="group" aria-labelledby="r-cart">' + cs.map(function (c) { return chip(c.apelido, 'setF', 'data-k="cartaoId" data-v="' + esc(c.id) + '"', f.cartaoId === c.id); }).join('') + '<button type="button" class="chip" data-act="cartaoForm">+ Novo cartão</button></div>' + (e.cartao ? '<span class="msg-erro">' + e.cartao + '</span>' : '') + '</div>';
        h += '<div class="linha"><span class="rotulo">Parcelas *</span><div class="passo"><button type="button" data-act="passo" data-k="parc" data-v="-1" aria-label="Menos uma parcela">−</button><span class="num" aria-live="polite">' + f.parc + '×</span><button type="button" data-act="passo" data-k="parc" data-v="1" aria-label="Mais uma parcela">+</button></div></div>';
        h += '<span class="num" id="fat-txt">' + esc(txtFatura(f)) + '</span>';
      }
      h += '</div>';
    }
    if (ed && orig && orig.cartaoId) h += '<div class="aviso a-card">Compra no ' + esc((F.cartao(orig.cartaoId) || {}).apelido || 'cartão') + ', fatura com vencimento em ' + F.mesNome(orig.fatura).toLowerCase() + '.</div>';
    if (f.tipo === 'd' && !cred && !(ed && orig && orig.cartaoId)) h += '<div class="campo"><span class="rotulo" id="r-sit">Situação *</span><div class="chips" role="group" aria-labelledby="r-sit">' + chip('Paga', 'setF', 'data-k="sit" data-v="paga"', f.sit === 'paga') + chip('Pendente', 'setF', 'data-k="sit" data-v="pendente"', f.sit === 'pendente') + '</div></div>';
    if (f.tipo === 'r' && F.dataValida(f.data) && f.data > F.hoje()) h += '<div class="aviso a-ok">Data futura: a receita entra como prevista e soma só ao saldo previsto.</div>';
    h += '</div>';
    if (!ed) {
      h += '<div class="painel"><div class="linha"><div style="display:flex;flex-direction:column"><span class="rotulo" id="r-rec">Repetir este lançamento</span><span class="sub">Contas fixas, assinaturas, salário</span></div><button type="button" class="sw" role="switch" aria-checked="' + f.rec + '" aria-labelledby="r-rec" data-act="toggleRec"></button></div>';
      if (f.rec) {
        var ocs = F.ocorrencias(f), regra = F.regraDe(f);
        h += '<div class="campo"><span class="rotulo" id="r-per">Periodicidade *</span><div class="chips" role="group" aria-labelledby="r-per">' + [['semanal', 'Semanal'], ['quinzenal', 'Quinzenal'], ['mensal', 'Mensal'], ['anual', 'Anual']].map(function (p) { return chip(p[1], 'setF', 'data-k="per" data-v="' + p[0] + '"', f.per === p[0]); }).join('') + '</div></div>';
        h += '<div class="linha"><div style="display:flex;flex-direction:column"><span class="rotulo">Repetições *</span><span class="sub num">' + (ocs.length ? 'Encerra em ' + F.br(ocs[ocs.length - 1].data) : '') + '</span></div><div class="passo"><button type="button" data-act="passo" data-k="reps" data-v="-1" aria-label="Menos uma repetição">−</button><span class="num" aria-live="polite">' + f.reps + '</span><button type="button" data-act="passo" data-k="reps" data-v="1" aria-label="Mais uma repetição">+</button></div></div>';
        if (cred) h += '<div class="aviso a-card">No cartão, cada repetição entra na fatura do mês. O ajuste de dia não útil não se aplica: o que vale é o vencimento da fatura.</div>';
        else {
          h += '<div class="campo"><span class="rotulo" id="r-reg">Quando cair em dia não útil *</span><div class="chips" role="group" aria-labelledby="r-reg">' + [['antecipar', 'Antecipar para o dia útil anterior'], ['postergar', 'Postergar para o próximo dia útil'], ['manter', 'Manter a data']].map(function (r) { return chip(r[1], 'setF', 'data-k="regra" data-v="' + r[0] + '"', regra === r[0]); }).join('') + '</div></div>';
          var conf = ocs.filter(function (o) { return o.motivo; });
          if (regra === 'manter') { if (conf.length) h += '<div class="aviso a-warn">' + conf.length + (conf.length === 1 ? ' ocorrência cai' : ' ocorrências caem') + ' em dia não útil e ' + (conf.length === 1 ? 'será mantida' : 'serão mantidas') + ' na data original.</div>'; }
          else if (conf.length) {
            h += '<div class="aviso a-warn" style="display:flex;flex-direction:column;gap:8px"><strong>' + conf.length + (conf.length === 1 ? ' ocorrência cai' : ' ocorrências caem') + ' em dia não útil</strong>';
            conf.forEach(function (o) {
              h += '<div class="conflito"><div style="display:flex;flex-direction:column;gap:1px;min-width:0"><span class="num"><span class="' + (o.mantida ? '' : 'riscado') + '">' + F.br(o.orig) + '</span>' + (o.mantida ? '' : ' → <strong>' + F.br(o.data) + '</strong>') + '</span><span style="font-size:12px;opacity:.85">' + esc(o.motivo) + (o.feriado ? ' (feriado nacional)' : '') + (o.mantida ? ' · mantida por você' : '') + '</span></div>' +
                '<button type="button" class="btn-peq" data-act="manterOc" data-v="' + o.i + '">' + (o.mantida ? 'Ajustar' : 'Manter ' + F.brCurto(o.orig)) + '</button></div>';
            });
            h += '</div>';
          } else if (ocs.length) h += '<span class="sub" style="color:var(--fg)">Nenhuma ocorrência cai em fim de semana ou feriado nacional.</span>';
        }
      }
      h += '</div>';
    }
    h += '<div class="campo"><label for="f-obs">Observação</label><input id="f-obs" class="inp" data-f="obs" data-mask="texto" value="' + esc(f.obs) + '" maxlength="200" placeholder="Opcional" autocomplete="off"></div>';
    h += '<div class="rodape-form"><div><button type="button" class="btn btn-sec" data-act="ir" data-v="' + esc(params.de || 'painel') + '">Cancelar</button><button type="button" class="btn btn-pri" data-act="salvarLanc">' + (ed ? 'Salvar alterações' : cred ? 'Salvar compra' : f.tipo === 'r' ? 'Salvar receita' : 'Salvar despesa') + '</button></div></div>';
    return h;
  };
  function txtFatura(f) {
    var c = F.cartao(f.cartaoId); if (!c || !F.dataValida(f.data)) return '';
    var v = F.parseValor(f.valor), d0 = F.datasFatura(c, F.faturaDe(c, f.data)), txt = '';
    if (v > 0) { var ps = F.parcelas(v, f.parc); txt = f.parc === 1 ? 'À vista. ' : f.parc + '× de ' + F.fmt(ps[1]) + (ps[0] !== ps[1] ? ' (1ª de ' + F.fmt(ps[0]) + ')' : '') + '. '; }
    return txt + (f.parc > 1 ? 'A 1ª parcela entra' : 'Entra') + ' na fatura que fecha em ' + F.br(d0.fecha) + ' e vence em ' + F.br(d0.vence) + '. O saldo só muda quando a fatura for paga.';
  }
  function faturaPagaDe(l) { return !!l.cartaoId && F.fatura(l.cartaoId, l.fatura).pags.length > 0; }
  function abrirNovo(tipo) { form = F.formVazio(tipo || 'd'); formTentou = false; formSujo = false; ir('lanc', { de: (view === 'lanc' || view === 'acesso') ? 'painel' : view }); }
  function abrirEdicao(id, de) {
    var l = S.lanc.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    form = Object.assign(F.formVazio(l.tipo), { id: l.id, desc: l.desc, valor: moedaIn(l.valor), data: l.data, cat: l.cat, forma: l.cartaoId ? 'Cartão de crédito' : (l.forma || ''), sit: l.sit || 'paga', cartaoId: l.cartaoId || '', obs: l.obs || '' });
    formTentou = false; formSujo = false; ir('lanc', { de: de || 'historico' });
  }
  function salvarLanc() {
    var e = F.validar(form);
    if (Object.keys(e).length) { formTentou = true; render(); var x = $app.querySelector('.erro, .msg-erro'); if (x) x.scrollIntoView({ block: 'center' }); return; }
    if (form.id) {
      var l = S.lanc.filter(function (x) { return x.id === form.id; })[0];
      if (l && l.serie) { abrirFolha('<h2 class="h1">Aplicar a alteração a quê?</h2><p style="margin:0;color:var(--muted)">Este lançamento faz parte de uma série que se repete.</p><button class="btn btn-pri" data-act="aplicarEdicao" data-v="um">Só a este lançamento</button><button class="btn btn-sec" data-act="aplicarEdicao" data-v="serie">A toda a série</button><button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Alterar série'); return; }
      aplicarEdicao('um'); return;
    }
    var novos = F.gerar(form);
    novos.forEach(function (l) { S.lanc.push(l); });
    LS.del(K.rasc); salvar();
    var f0 = form, primeiro = novos[0];
    form = null; formSujo = false;
    var msg = F.ehCredito(f0) ? 'Compra registrada na fatura do cartão.' : f0.tipo === 'r' ? 'Receita salva.' : 'Despesa salva.';
    if (f0.rec) msg += ' ' + novos.length + ' lançamentos gerados.'; else if (F.ehCredito(f0) && f0.parc > 1) msg += ' ' + f0.parc + ' parcelas.';
    ir(params.de && params.de !== 'lanc' ? params.de : 'painel');
    if (f0.tipo === 'd' && !F.ehCredito(f0) && f0.sit === 'paga' && F.saldoMes(F.ym(primeiro.data)).realizado < 0) msg += ' Atenção: o saldo de ' + F.mesNome(F.ym(primeiro.data)).toLowerCase() + ' ficou negativo.';
    toast(msg);
  }
  function aplicarEdicao(escopo) {
    var l = S.lanc.filter(function (x) { return x.id === form.id; })[0]; if (!l) return;
    var agora = new Date().toISOString(), v = F.parseValor(form.valor);
    var alvo = escopo === 'serie' ? S.lanc.filter(function (x) { return x.serie === l.serie && !x.excl; }) : [l];
    alvo.forEach(function (x) {
      x.desc = F.limparTexto(form.desc, 60); x.cat = form.cat; x.obs = F.limparTexto(form.obs, 200); x.alterado = agora;
      if (!x.cartaoId) { x.forma = form.forma; if (x.tipo === 'd') x.sit = form.sit; }
      if (!(x.cartaoId && (x.parc || faturaPagaDe(x)))) x.valor = v;
    });
    if (escopo !== 'serie' && !(l.cartaoId && (l.parc || faturaPagaDe(l)))) { l.data = form.data; if (l.cartaoId) l.fatura = F.faturaDe(F.cartao(l.cartaoId), l.data); }
    salvar(); form = null; formSujo = false; ir(params.de || 'historico');
    toast(escopo === 'serie' ? 'Série atualizada.' : 'Lançamento atualizado.');
  }

  VIEWS.historico = function () {
    var h = topo('Histórico');
    h += '<div class="mes-nav"><button type="button" data-act="histMes" data-v="-1" aria-label="Mês anterior">' + I.setaE + '</button><strong>' + esc(F.mesNome(ui.histMes)) + '</strong><button type="button" data-act="histMes" data-v="1" aria-label="Próximo mês">' + I.seta + '</button></div>';
    h += '<div><label for="h-busca" class="sr">Buscar pela descrição</label><input id="h-busca" class="inp" data-ui="histBusca" data-mask="texto" maxlength="60" value="' + esc(ui.histBusca) + '" placeholder="Buscar pela descrição" autocomplete="off" type="search"></div>';
    h += '<div class="chips rola" role="group" aria-label="Tipo">' + [['todos', 'Todos'], ['r', 'Receitas'], ['d', 'Despesas']].map(function (t) { return chip(t[1], 'histF', 'data-k="histTipo" data-v="' + t[0] + '"', ui.histTipo === t[0]); }).join('') + '</div>';
    h += '<div class="chips rola" role="group" aria-label="Situação">' + [['todas', 'Todas'], ['paga', 'Paga / recebida'], ['pendente', 'Pendente'], ['prevista', 'Prevista'], ['cartao', 'No cartão']].map(function (t) { return chip(t[1], 'histF', 'data-k="histSit" data-v="' + t[0] + '"', ui.histSit === t[0]); }).join('') + '</div>';
    h += '<div class="grade2"><div class="campo"><label for="h-cat" class="sr">Categoria</label><select id="h-cat" class="inp" data-ui="histCat"><option value="">Todas as categorias</option>' + S.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (ui.histCat === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label for="h-cart" class="sr">Cartão</label><select id="h-cart" class="inp" data-ui="histCartao"><option value="">Todos os cartões</option>' + S.cartoes.map(function (c) { return '<option value="' + esc(c.id) + '"' + (ui.histCartao === c.id ? ' selected' : '') + '>' + esc(c.apelido) + '</option>'; }).join('') + '</select></div></div>';
    h += '<div id="hist-lista" style="display:flex;flex-direction:column;gap:10px"></div>';
    return h;
  };
  function renderHistLista() {
    var box = document.getElementById('hist-lista'); if (!box) return;
    var q = F.limparTexto(ui.histBusca, 60).toLowerCase();
    var vis = F.ativos().filter(function (l) {
      if (F.ym(l.data) !== ui.histMes) return false;
      if (ui.histTipo !== 'todos' && l.tipo !== ui.histTipo) return false;
      var s = F.situacao(l); if (s === 'recebida') s = 'paga';
      if (ui.histSit !== 'todas' && s !== ui.histSit) return false;
      if (ui.histCat && l.cat !== ui.histCat) return false;
      if (ui.histCartao && l.cartaoId !== ui.histCartao) return false;
      if (q && l.desc.toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(ordem);
    var ent = F.soma(vis.filter(function (l) { return l.tipo === 'r'; }), function (l) { return l.valor; });
    var sai = F.soma(vis.filter(function (l) { return l.tipo === 'd'; }), function (l) { return l.valor; });
    var pags = (ui.histTipo !== 'r' && ui.histSit !== 'pendente' && ui.histSit !== 'prevista' && !ui.histCat && !q) ? S.pags.filter(function (p) { return F.ym(p.data) === ui.histMes && (!ui.histCartao || p.cartaoId === ui.histCartao) && (ui.histSit === 'todas' || ui.histSit === 'paga'); }) : [];
    var porPag = 20, tot = vis.length, nPag = Math.max(1, Math.ceil(tot / porPag)); if (ui.histPag > nPag) ui.histPag = nPag;
    var pagina = vis.slice((ui.histPag - 1) * porPag, ui.histPag * porPag);
    var h = '<div class="sub" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 12px"><span>' + tot + (tot === 1 ? ' lançamento' : ' lançamentos') + '</span><span class="num">Entradas <strong style="color:var(--fg)">' + F.fmt(ent) + '</strong> · Saídas <strong style="color:var(--saida)">' + F.fmt(sai) + '</strong></span></div>';
    h += pagina.length ? '<div class="lista">' + pagina.map(itemLanc).join('') + '</div>' : '<div class="lista"><p class="vazio">' + (F.ativos().length ? 'Nenhum lançamento com esses filtros neste mês.' : 'Nada registrado ainda. Toque em + para lançar a primeira despesa ou receita.') + '</p></div>';
    if (nPag > 1) h += '<div class="mes-nav"><button type="button" data-act="histPag" data-v="-1" aria-label="Página anterior"' + (ui.histPag === 1 ? ' disabled' : '') + '>' + I.setaE + '</button><span class="sub">Página ' + ui.histPag + ' de ' + nPag + '</span><button type="button" data-act="histPag" data-v="1" aria-label="Próxima página"' + (ui.histPag === nPag ? ' disabled' : '') + '>' + I.seta + '</button></div>';
    if (pags.length) h += '<div class="h2" style="margin-top:6px">Pagamentos de fatura</div><div class="lista">' + pags.map(function (p) { var c = F.cartao(p.cartaoId) || { apelido: 'Cartão' }; return '<button type="button" class="item" data-act="ir" data-v="cartao" data-id="' + esc(p.cartaoId) + '" data-fat="' + esc(p.fatura) + '"><span class="meio"><span class="t">Fatura ' + esc(c.apelido) + ' · ' + F.mesCurto(p.fatura) + '</span><span class="m num">' + F.brCurto(p.data) + (p.forma ? ' · ' + esc(p.forma) : '') + '</span></span><span class="dir"><span class="v num">− ' + F.fmt(p.valor) + '</span><span class="pill p-ok">Paga</span></span></button>'; }).join('') + '</div><p class="sub" style="margin:0">Pagamentos de fatura saem do saldo, mas não contam como despesa por categoria.</p>';
    box.innerHTML = h;
  }
  function acoesLanc(id) {
    var l = S.lanc.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var c = l.cartaoId ? F.cartao(l.cartaoId) : null;
    var h = '<div class="linha"><div style="display:flex;flex-direction:column;min-width:0"><h2 class="h1" style="font-size:20px">' + esc(descTxt(l)) + '</h2><span class="sub num">' + F.br(l.data) + ' · ' + esc(F.nomeCat(l.cat)) + (c ? ' · ' + esc(c.apelido) : l.forma ? ' · ' + esc(l.forma) : '') + '</span></div><strong class="num' + (l.tipo === 'r' ? ' v-r' : '') + '" style="font-size:18px;white-space:nowrap">' + valorTxt(l) + '</strong></div>';
    if (l.obs) h += '<p style="margin:0;color:var(--muted)">' + esc(l.obs) + '</p>';
    if (l.serie) h += '<span class="sub">Faz parte de uma série com ' + S.lanc.filter(function (x) { return x.serie === l.serie && !x.excl; }).length + ' lançamentos.</span>';
    if (l.alterado && l.alterado !== l.criado) h += '<span class="sub">Última alteração: ' + esc(new Date(l.alterado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) + '</span>';
    if (l.tipo === 'd' && !l.cartaoId && l.sit === 'pendente') h += '<button class="btn btn-pri" data-act="marcarPaga" data-id="' + esc(l.id) + '">Marcar como paga</button>';
    if (c) h += '<button class="btn btn-sec" data-act="ir" data-v="cartao" data-id="' + esc(c.id) + '" data-fat="' + esc(l.fatura) + '">Ver fatura de ' + F.mesNome(l.fatura).toLowerCase() + '</button>';
    h += '<button class="btn btn-sec" data-act="editar" data-id="' + esc(l.id) + '">Editar</button><button class="btn btn-sec" data-act="pedirExcluir" data-id="' + esc(l.id) + '" style="color:var(--neg)">Excluir</button><button class="btn-txt" data-act="fecharFolha">Fechar</button>';
    abrirFolha(h, 'Lançamento');
  }
  function pedirExcluir(id) {
    var l = S.lanc.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    if (l.cartaoId) {
      var grupo = l.parc ? S.lanc.filter(function (x) { return x.parc && x.parc.grupo === l.parc.grupo && !x.excl; }) : [l];
      if (grupo.some(faturaPagaDe)) { abrirFolha('<h2 class="h1">Não dá para excluir agora</h2><p style="margin:0;color:var(--muted)">Esta compra está numa fatura com pagamento registrado. Estorne o pagamento na tela do cartão e tente de novo.</p><button class="btn btn-sec" data-act="ir" data-v="cartao" data-id="' + esc(l.cartaoId) + '" data-fat="' + esc(l.fatura) + '">Abrir a fatura</button><button class="btn-txt" data-act="fecharFolha">Fechar</button>', 'Exclusão bloqueada'); return; }
    }
    var h = '<h2 class="h1">Excluir este lançamento?</h2><div class="painel" style="padding:14px"><div class="linha"><strong>' + esc(descTxt(l)) + '</strong><strong class="num">' + valorTxt(l) + '</strong></div><span class="sub num">' + F.br(l.data) + ' · ' + esc(F.nomeCat(l.cat)) + '</span></div><p style="margin:0;color:var(--muted)">Ele sai do saldo e do histórico, mas fica 30 dias em “Lançamentos excluídos” para você restaurar se precisar.</p>';
    if (l.parc) h += '<button class="btn btn-del" data-act="excluir" data-id="' + esc(id) + '" data-v="grupo">Excluir a compra inteira (' + l.parc.n + ' parcelas)</button><button class="btn btn-sec" data-act="excluir" data-id="' + esc(id) + '" data-v="um">Só esta parcela</button>';
    else if (l.serie) h += '<button class="btn btn-del" data-act="excluir" data-id="' + esc(id) + '" data-v="um">Só este lançamento</button><button class="btn btn-sec" data-act="excluir" data-id="' + esc(id) + '" data-v="serie" style="color:var(--neg)">Toda a série</button>';
    else h += '<button class="btn btn-del" data-act="excluir" data-id="' + esc(id) + '" data-v="um">Sim, excluir</button>';
    abrirFolha(h + '<button class="btn-txt" data-act="fecharFolha">Não, manter</button>', 'Confirmar exclusão');
  }
  function excluir(id, escopo) {
    var l = S.lanc.filter(function (x) { return x.id === id; })[0]; if (!l) return;
    var agora = new Date().toISOString();
    var alvo = escopo === 'grupo' && l.parc ? S.lanc.filter(function (x) { return x.parc && x.parc.grupo === l.parc.grupo && !x.excl; }) : escopo === 'serie' && l.serie ? S.lanc.filter(function (x) { return x.serie === l.serie && !x.excl; }) : [l];
    alvo.forEach(function (x) { x.excl = agora; });
    salvar(); fecharFolha(); render();
    toast(alvo.length > 1 ? alvo.length + ' lançamentos foram para Excluídos.' : 'Lançamento foi para Excluídos.', function () { alvo.forEach(function (x) { x.excl = null; }); salvar(); render(); });
  }

  VIEWS.cartoes = function () {
    var h = topo('Cartões', null, '<button class="btn-peq" data-act="cartaoForm">+ Cartão</button>');
    if (!S.cartoes.length) return h + '<div class="painel"><strong>Nenhum cartão cadastrado</strong><p style="margin:0;color:var(--muted)">Cadastre o cartão com o dia de fechamento e de vencimento. Depois, toda compra lançada no crédito entra sozinha na fatura certa.</p><button class="btn btn-pri" data-act="cartaoForm">Cadastrar cartão</button></div>';
    S.cartoes.forEach(function (c) {
      var f = F.fatura(c.id, F.faturaDe(c, F.hoje())), uso = F.usoLimite(c.id), pct = c.limite ? Math.min(100, uso / c.limite * 100) : 0;
      var pend = F.chavesFatura(c.id).map(function (k) { return F.fatura(c.id, k); }).filter(function (x) { return x.status === 'Fechada' || x.status === 'Vencida'; });
      h += '<button type="button" class="painel" data-act="ir" data-v="cartao" data-id="' + esc(c.id) + '" style="text-align:left;width:100%' + (c.ativo ? '' : ';opacity:.6') + '">' +
        '<div class="linha"><div style="display:flex;flex-direction:column"><strong style="font-size:16px">' + esc(c.apelido) + (c.ativo ? '' : ' (inativo)') + '</strong><span class="sub">Fecha dia ' + c.fech + ' · vence dia ' + c.venc + '</span></div>' + I.seta + '</div>' +
        '<div class="linha"><span class="sub">Fatura atual ' + pillFat(f.status) + '</span><strong class="num">' + F.fmt(f.total) + '</strong></div>' +
        pend.map(function (p) { return '<div class="aviso ' + (p.status === 'Vencida' ? 'a-neg' : 'a-warn') + ' num">Fatura de ' + F.mesNome(p.key).toLowerCase() + ' ' + p.status.toLowerCase() + ': ' + F.fmt(p.restante) + ' · vence ' + F.br(p.vence) + '</div>'; }).join('') +
        (c.limite ? '<div class="barra cartao' + (pct >= 80 ? ' alerta' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div><span class="sub num">' + F.fmt(uso) + ' de ' + F.fmt(c.limite) + ' comprometidos</span>' : '') + '</button>';
    });
    return h;
  };
  VIEWS.cartao = function () {
    var c = F.cartao(params.id); if (!c) return VIEWS.cartoes();
    var keys = F.chavesFatura(c.id);
    if (params.fat) { ui.fatKey = params.fat; params.fat = null; }
    if (!ui.fatKey || keys.indexOf(ui.fatKey) < 0 || ui.fatCartao !== c.id) ui.fatKey = F.faturaDe(c, F.hoje());
    ui.fatCartao = c.id;
    var idx = keys.indexOf(ui.fatKey), f = F.fatura(c.id, ui.fatKey);
    var h = topo(c.apelido, 'cartoes', '<button class="btn-peq" data-act="cartaoForm" data-id="' + esc(c.id) + '">Editar</button>');
    h += '<div class="mes-nav"><button type="button" data-act="fatNav" data-v="-1" aria-label="Fatura anterior"' + (idx <= 0 ? ' disabled' : '') + '>' + I.setaE + '</button><div style="display:flex;flex-direction:column;align-items:center;text-align:center"><strong>Fatura de ' + esc(F.mesNome(f.key).toLowerCase()) + '</strong><span class="sub num">Fecha ' + F.br(f.fecha) + ' · vence ' + F.br(f.vence) + '</span></div><button type="button" data-act="fatNav" data-v="1" aria-label="Próxima fatura"' + (idx >= keys.length - 1 ? ' disabled' : '') + '>' + I.seta + '</button></div>';
    h += '<section class="hero" style="gap:10px"><div class="linha"><span class="rot">Total da fatura</span>' + pillFat(f.status) + '</div><span class="big num">' + F.fmt(f.total) + '</span><hr><div class="linha rot num" style="font-size:13px"><span>Compras ' + F.fmt(f.totalCompras) + (f.anterior ? ' + saldo anterior ' + F.fmt(f.anterior) : '') + '</span><span>Pago ' + F.fmt(f.pago) + '</span></div></section>';
    if (f.status === 'Aberta') h += '<div class="aviso a-card">Fatura aberta. Compras feitas até ' + F.br(f.fecha) + ' entram nela.</div>';
    if (f.status === 'Paga parcialmente') h += '<div class="aviso a-warn num">Faltaram ' + F.fmt(f.total - f.pago) + ', que foram para a fatura seguinte como saldo anterior.</div>';
    if (f.status === 'Vencida') h += '<div class="aviso a-neg">Esta fatura venceu em ' + F.br(f.vence) + ' e não tem pagamento registrado.</div>';
    var falta = F.r2(f.total - f.pago);
    if ((f.status === 'Fechada' || f.status === 'Vencida') && falta > 0) h += '<button class="btn btn-pri" data-act="pagarForm" data-id="' + esc(c.id) + '">Registrar pagamento</button>';
    if (f.status === 'Aberta' && falta > 0) h += '<button class="btn btn-sec" data-act="pagarForm" data-id="' + esc(c.id) + '">Registrar pagamento antecipado</button>';
    if (f.pags.length) h += '<div class="lista">' + f.pags.map(function (p) { return '<div class="item"><span class="meio"><span class="t">Pagamento</span><span class="m num">' + F.br(p.data) + (p.forma ? ' · ' + esc(p.forma) : '') + '</span></span><span class="dir"><span class="v num">' + F.fmt(p.valor) + '</span></span></div>'; }).join('') + '</div><button class="btn btn-sec" data-act="pedirEstorno" data-id="' + esc(c.id) + '">Estornar pagamento</button>';
    h += '<div class="linha"><h2 class="h2">Compras desta fatura</h2><span class="sub">' + f.compras.length + '</span></div>';
    h += f.compras.length ? '<div class="lista">' + f.compras.map(itemLanc).join('') + '</div>' : '<div class="lista"><p class="vazio">Nenhuma compra nesta fatura.</p></div>';
    if (c.limite) { var uso = F.usoLimite(c.id); h += '<div class="painel"><div class="kv num"><span>Limite</span><span>' + F.fmt(c.limite) + '</span></div><div class="kv num"><span>Comprometido</span><span>' + F.fmt(uso) + '</span></div><div class="kv num"><span>Disponível</span><span>' + F.fmt(c.limite - uso) + '</span></div></div>'; }
    return h;
  };
  function cartaoForm(id) {
    var c = id ? F.cartao(id) : { apelido: '', fech: '', venc: '', limite: 0, ativo: true };
    if (!c) return;
    var temCompras = id && S.lanc.some(function (l) { return l.cartaoId === id; });
    var h = '<h2 class="h1">' + (id ? 'Editar cartão' : 'Novo cartão') + '</h2><form id="f-cartao" style="display:flex;flex-direction:column;gap:14px" novalidate data-id="' + esc(id || '') + '">' +
      '<div class="campo"><label for="c-apelido">Apelido do cartão *</label><input id="c-apelido" class="inp" data-mask="texto" maxlength="30" value="' + esc(c.apelido) + '" placeholder="Ex.: Cartão pessoal" autocomplete="off"></div>' +
      '<div class="grade2"><div class="campo"><label for="c-fech">Dia do fechamento *</label><input id="c-fech" class="inp num" data-mask="dia" inputmode="numeric" maxlength="2" value="' + esc(c.fech) + '" placeholder="1 a 31" autocomplete="off"></div><div class="campo"><label for="c-venc">Dia do vencimento *</label><input id="c-venc" class="inp num" data-mask="dia" inputmode="numeric" maxlength="2" value="' + esc(c.venc) + '" placeholder="1 a 31" autocomplete="off"></div></div>' +
      inMoeda('c-lim', 'Limite (opcional)', moedaIn(c.limite)) +
      '<p class="sub" style="margin:0">Não pedimos número do cartão, código de segurança nem dados do banco.</p><div id="c-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-pri" type="submit">Salvar cartão</button></form>';
    if (id) h += temCompras ? '<button class="btn btn-sec" data-act="toggleCartao" data-id="' + esc(id) + '">' + (c.ativo ? 'Desativar cartão' : 'Reativar cartão') + '</button><span class="sub">Cartão com compras não pode ser excluído, só desativado.</span>' : '<button class="btn btn-sec" data-act="excluirCartao" data-id="' + esc(id) + '" style="color:var(--neg)">Excluir cartão</button>';
    abrirFolha(h + '<button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Cartão');
  }
  function salvarCartao(ev) {
    var id = ev.target.dataset.id, g = function (x) { return document.getElementById(x).value; };
    var ap = F.limparTexto(g('c-apelido'), 30), fe = Number(F.mascaraDia(g('c-fech'))), ve = Number(F.mascaraDia(g('c-venc'))), limTxt = F.mascaraMoeda(g('c-lim')), li = limTxt ? F.parseValor(limTxt) : 0, err = null;
    if (ap.length < 3) err = 'O apelido precisa ter de 3 a 30 caracteres.';
    else if (S.cartoes.some(function (c) { return c.id !== id && c.apelido.toLowerCase() === ap.toLowerCase(); })) err = 'Você já tem um cartão com esse apelido.';
    else if (!(fe >= 1 && fe <= 31)) err = 'Informe o dia do fechamento, de 1 a 31.';
    else if (!(ve >= 1 && ve <= 31)) err = 'Informe o dia do vencimento, de 1 a 31.';
    else if (fe === ve) err = 'O fechamento e o vencimento precisam ser em dias diferentes.';
    else if (limTxt && !(li >= F.LIM.VALOR_MIN && li <= F.LIM.VALOR_MAX)) err = 'Informe o limite como um valor maior que zero, ou deixe em branco.';
    if (err) return erroEm('c-erro', err);
    if (id) {
      var c = F.cartao(id); if (!c) return;
      var mudou = c.fech !== fe || c.venc !== ve;
      Object.assign(c, { apelido: ap, fech: fe, venc: ve, limite: li || 0 });
      if (mudou) S.lanc.forEach(function (l) { if (l.cartaoId === id && !l.parc && !faturaPagaDe(l)) l.fatura = F.faturaDe(c, l.data); });
    } else {
      var novo = { id: F.uid(), apelido: ap, fech: fe, venc: ve, limite: li || 0, ativo: true };
      S.cartoes.push(novo); if (view === 'lanc' && form) form.cartaoId = novo.id;
    }
    salvar(); fecharFolha(); render(); toast(id ? 'Cartão atualizado.' : 'Cartão cadastrado.');
  }
  var FORMAS_PAG = ['PIX', 'Débito em conta', 'Boleto', 'Dinheiro', 'Outros'];
  function pagarForm(cid) {
    var f = F.fatura(cid, ui.fatKey), rest = F.r2(f.total - f.pago);
    var h = '<h2 class="h1">Pagamento da fatura</h2><div class="painel" style="padding:14px"><div class="kv num"><span>Fatura</span><span>' + esc(F.mesNome(f.key)) + '</span></div><div class="kv num"><span>Vencimento</span><span>' + F.br(f.vence) + '</span></div><div class="kv num"><span>Falta pagar</span><strong>' + F.fmt(rest) + '</strong></div></div>' +
      '<form id="f-pag" style="display:flex;flex-direction:column;gap:14px" novalidate data-id="' + esc(cid) + '"><div class="grade2">' + inMoeda('p-valor', 'Valor pago *', moedaIn(rest)) +
      '<div class="campo"><label for="p-data">Data do pagamento *</label><input id="p-data" type="date" class="inp num" value="' + F.hoje() + '" min="' + F.LIM.DATA_MIN + '" max="' + F.hoje() + '"></div></div>' +
      '<div class="campo"><label for="p-forma">Forma de pagamento</label><select id="p-forma" class="inp">' + FORMAS_PAG.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
      '<p class="sub" style="margin:0">O valor pago sai do saldo realizado. Se pagar menos que o total, o restante vai para a próxima fatura.</p><div id="p-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-pri" type="submit">Registrar pagamento</button></form><button class="btn-txt" data-act="fecharFolha">Cancelar</button>';
    abrirFolha(h, 'Pagamento');
  }
  function salvarPag(ev) {
    var cid = ev.target.dataset.id; if (!F.cartao(cid)) return;
    var f = F.fatura(cid, ui.fatKey), rest = F.r2(f.total - f.pago);
    var v = F.parseValor(F.mascaraMoeda(document.getElementById('p-valor').value)), d = document.getElementById('p-data').value, forma = document.getElementById('p-forma').value, err = null;
    if (!(v >= F.LIM.VALOR_MIN)) err = 'Informe um valor maior que zero.';
    else if (v > rest) err = 'O valor pago não pode ser maior que o que falta pagar (' + F.fmt(rest) + ').';
    else if (!F.dataValida(d) || d < F.LIM.DATA_MIN) err = 'Escolha a data do pagamento.';
    else if (d > F.hoje()) err = 'A data do pagamento não pode ser futura.';
    if (err) return erroEm('p-erro', err);
    S.pags.push({ id: F.uid(), cartaoId: cid, fatura: ui.fatKey, valor: v, data: d, forma: FORMAS_PAG.indexOf(forma) >= 0 ? forma : 'Outros' });
    salvar(); fecharFolha(); render(); toast('Pagamento registrado.');
  }

  VIEWS.metas = function () {
    var h = topo('Metas', params.de || 'mais', '<button class="btn-peq" data-act="metaForm">+ Meta</button>');
    if (!S.metas.length) return h + '<div class="painel"><strong>Nenhuma meta ainda</strong><p style="margin:0;color:var(--muted)">Defina quanto quer juntar e até quando. A cada valor guardado, o progresso aparece aqui, com avisos em 50%, 80% e 100%.</p><button class="btn btn-pri" data-act="metaForm">Criar meta</button></div>';
    var ordemSt = { 'Atrasada': 0, 'Em andamento': 1, 'Concluída': 2, 'Cancelada': 3 };
    S.metas.slice().sort(function (a, b) { return ordemSt[F.statusMeta(a)] - ordemSt[F.statusMeta(b)] || (a.limite < b.limite ? -1 : 1); }).forEach(function (m) {
      var st = F.statusMeta(m), p = F.progresso(m);
      h += '<button type="button" class="painel" data-act="ir" data-v="meta" data-id="' + esc(m.id) + '" style="text-align:left;width:100%' + (st === 'Cancelada' ? ';opacity:.6' : '') + '">' +
        '<div class="linha"><strong style="font-size:16px">' + esc(m.nome) + '</strong>' + pillMeta(st) + '</div>' +
        '<div class="barra' + (st === 'Atrasada' ? ' alerta' : '') + '"><i style="width:' + Math.min(100, p).toFixed(1) + '%"></i></div>' +
        '<div class="linha sub num"><span>' + F.fmt(F.acumulado(m)) + ' de ' + F.fmt(m.alvo) + ' · ' + Math.floor(p) + '%</span><span>até ' + F.br(m.limite) + '</span></div></button>';
    });
    return h;
  };
  VIEWS.meta = function () {
    var m = achaMeta(params.id); if (!m) return VIEWS.metas();
    var st = F.statusMeta(m), p = F.progresso(m), falta = F.r2(m.alvo - F.acumulado(m)), pm = F.porMesAte(m);
    var h = topo(m.nome, 'metas', '<button class="btn-peq" data-act="metaForm" data-id="' + esc(m.id) + '">Editar</button>');
    h += '<section class="hero"><div class="linha"><span class="rot">Guardado</span>' + pillMeta(st) + '</div><span class="big num">' + F.fmt(F.acumulado(m)) + '</span>' +
      '<div class="barra" style="background:var(--hero-line)"><i style="width:' + Math.min(100, p).toFixed(1) + '%;background:var(--on-hero)"></i></div>' +
      '<div class="linha rot num" style="font-size:13px"><span>' + Math.floor(p) + '% de ' + F.fmt(m.alvo) + '</span><span>até ' + F.br(m.limite) + '</span></div></section>';
    if (st === 'Em andamento' && falta > 0) h += '<div class="aviso a-card num">Faltam ' + F.fmt(falta) + '. Guardando ' + F.fmt(pm) + ' por mês, você chega lá até ' + F.br(m.limite) + '.</div>';
    if (st === 'Atrasada') h += '<div class="aviso a-neg num">A data limite passou e faltam ' + F.fmt(falta) + '. Edite a meta para definir uma nova data.</div>';
    if (st === 'Concluída') h += '<div class="aviso a-ok">Meta atingida. Parabéns!</div>';
    if (m.cat) h += '<span class="sub">Categoria vinculada: ' + esc(F.nomeCat(m.cat)) + '</span>';
    if (!m.cancelada) h += '<button class="btn btn-pri" data-act="aporteForm" data-id="' + esc(m.id) + '">Adicionar valor guardado</button>';
    h += '<p class="sub" style="margin:0">O valor guardado é um registro da meta. Ele não altera o saldo do mês.</p>';
    h += '<div class="linha"><h2 class="h2">Valores guardados</h2><span class="sub">' + m.aportes.length + '</span></div>';
    h += m.aportes.length ? '<div class="lista">' + m.aportes.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (a) { return '<div class="item"><span class="meio"><span class="t num">' + F.fmt(a.valor) + '</span><span class="m num">' + F.br(a.data) + '</span></span><button class="btn-peq" data-act="removerAporte" data-id="' + esc(m.id) + '" data-v="' + esc(a.id) + '">Remover</button></div>'; }).join('') + '</div>' : '<div class="lista"><p class="vazio">Nenhum valor guardado ainda.</p></div>';
    h += '<button class="btn btn-sec" data-act="cancelarMeta" data-id="' + esc(m.id) + '">' + (m.cancelada ? 'Reativar meta' : 'Cancelar meta') + '</button><button class="btn btn-sec" data-act="pedirExcluirMeta" data-id="' + esc(m.id) + '" style="color:var(--neg)">Excluir meta</button>';
    return h;
  };
  function metaForm(id) {
    var m = id ? achaMeta(id) : { nome: '', alvo: 0, limite: F.addMonths(F.hoje(), 6), cat: null };
    if (!m) return;
    var h = '<h2 class="h1">' + (id ? 'Editar meta' : 'Nova meta') + '</h2><form id="f-meta" style="display:flex;flex-direction:column;gap:14px" novalidate data-id="' + esc(id || '') + '">' +
      '<div class="campo"><label for="m-nome">Nome da meta *</label><input id="m-nome" class="inp" data-mask="texto" maxlength="60" value="' + esc(m.nome) + '" placeholder="Ex.: Reserva de emergência" autocomplete="off"></div>' +
      '<div class="grade2">' + inMoeda('m-alvo', 'Valor alvo *', moedaIn(m.alvo)) + '<div class="campo"><label for="m-limite">Data limite *</label><input id="m-limite" type="date" class="inp num" value="' + esc(m.limite) + '" min="' + F.hoje() + '" max="' + F.LIM.DATA_MAX + '"></div></div>' +
      '<div class="campo"><label for="m-cat">Categoria vinculada (opcional)</label><select id="m-cat" class="inp"><option value="">Nenhuma</option>' + S.cats.filter(function (c) { return c.ativa; }).map(function (c) { return '<option value="' + esc(c.id) + '"' + (m.cat === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
      '<div id="m-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-pri" type="submit">Salvar meta</button></form><button class="btn-txt" data-act="fecharFolha">Cancelar</button>';
    abrirFolha(h, 'Meta');
  }
  function salvarMeta(ev) {
    var id = ev.target.dataset.id, nome = F.limparTexto(document.getElementById('m-nome').value, 60), alvo = F.parseValor(F.mascaraMoeda(document.getElementById('m-alvo').value)), lim = document.getElementById('m-limite').value, cat = document.getElementById('m-cat').value, err = null;
    if (nome.length < 3) err = 'O nome precisa ter de 3 a 60 caracteres.';
    else if (!(alvo >= F.LIM.VALOR_MIN && alvo <= F.LIM.VALOR_MAX)) err = 'Informe o valor alvo, maior que zero.';
    else if (!F.dataValida(lim) || lim > F.LIM.DATA_MAX) err = 'Escolha uma data limite válida.';
    else if (lim < F.hoje()) err = 'A data limite não pode ser anterior a hoje.';
    if (err) return erroEm('m-erro', err);
    cat = S.cats.some(function (c) { return c.id === cat; }) ? cat : null;
    if (id) { var m = achaMeta(id); if (!m) return; Object.assign(m, { nome: nome, alvo: alvo, limite: lim, cat: cat }); m.avisos = m.avisos.filter(function (x) { return F.progresso(m) >= x; }); }
    else S.metas.push({ id: F.uid(), nome: nome, alvo: alvo, limite: lim, cat: cat, aportes: [], avisos: [], cancelada: false, criada: new Date().toISOString() });
    salvar(); fecharFolha(); render(); toast(id ? 'Meta atualizada.' : 'Meta criada.');
  }
  function aporteForm(id) {
    abrirFolha('<h2 class="h1">Adicionar valor guardado</h2><form id="f-aporte" style="display:flex;flex-direction:column;gap:14px" novalidate data-id="' + esc(id) + '"><div class="grade2">' + inMoeda('a-valor', 'Valor *', '') +
      '<div class="campo"><label for="a-data">Data *</label><input id="a-data" type="date" class="inp num" value="' + F.hoje() + '" min="' + F.LIM.DATA_MIN + '" max="' + F.hoje() + '"></div></div><div id="a-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-pri" type="submit">Guardar</button></form><button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Valor guardado');
  }
  function salvarAporte(ev) {
    var m = achaMeta(ev.target.dataset.id); if (!m) return;
    var v = F.parseValor(F.mascaraMoeda(document.getElementById('a-valor').value)), d = document.getElementById('a-data').value, err = null;
    if (!(v >= F.LIM.VALOR_MIN && v <= F.LIM.VALOR_MAX)) err = 'Informe um valor maior que zero.';
    else if (!F.dataValida(d) || d < F.LIM.DATA_MIN || d > F.hoje()) err = 'Escolha uma data até hoje.';
    if (err) return erroEm('a-erro', err);
    var antes = F.progresso(m);
    m.aportes.push({ id: F.uid(), valor: v, data: d });
    var novos = F.marcos(antes, F.progresso(m)).filter(function (x) { return m.avisos.indexOf(x) < 0; });
    novos.forEach(function (x) { m.avisos.push(x); });
    salvar(); fecharFolha(); render();
    var mx = novos.length ? novos[novos.length - 1] : 0;
    toast(mx === 100 ? 'Meta “' + m.nome + '” atingida!' : mx ? 'Meta “' + m.nome + '” chegou a ' + mx + '%.' : 'Valor guardado.');
  }
  function achaMeta(id) { return S.metas.filter(function (m) { return m.id === id; })[0]; }

  VIEWS.relatorios = function () {
    var h = topo('Relatórios', params.de || 'mais');
    h += '<div class="chips rola" role="group" aria-label="Tipo de relatório">' + [['rd', 'Receitas x despesas'], ['cat', 'Despesas por categoria'], ['saldo', 'Evolução do saldo']].map(function (t) { return chip(t[1], 'relF', 'data-k="relTipo" data-v="' + t[0] + '"', ui.relTipo === t[0]); }).join('') + '</div>';
    if (ui.relTipo === 'cat') h += '<div class="chips rola" role="group" aria-label="Período">' + [['atual', 'Mês atual'], ['anterior', 'Mês anterior'], ['12', 'Últimos 12 meses']].map(function (t) { return chip(t[1], 'relF', 'data-k="relCat" data-v="' + t[0] + '"', ui.relCat === t[0]); }).join('') + '</div>';
    else h += '<div class="chips rola" role="group" aria-label="Período">' + [['6', 'Últimos 6 meses'], ['12', 'Últimos 12 meses']].map(function (t) { return chip(t[1], 'relF', 'data-k="relPer" data-v="' + t[0] + '"', ui.relPer === t[0]); }).join('') + '</div>';
    return h + '<section class="painel" id="rel-box"></section>';
  };
  function dadosRelatorio() {
    var k = F.ym(F.hoje());
    if (ui.relTipo === 'rd') { var rd = F.receitasDespesas(k, Number(ui.relPer)); return { linhas: rd, csv: [['Mês', 'Receitas', 'Despesas', 'Resultado']].concat(rd.map(function (x) { return [F.mesNome(x.k), F.numCsv(x.receitas), F.numCsv(x.despesas), F.numCsv(x.resultado)]; })) }; }
    if (ui.relTipo === 'saldo') { var ev = F.evolucaoSaldo(k, Number(ui.relPer)); return { linhas: ev, csv: [['Mês', 'Resultado do mês', 'Saldo acumulado']].concat(ev.map(function (x) { return [F.mesNome(x.k), F.numCsv(x.mes), F.numCsv(x.acumulado)]; })) }; }
    var ks = ui.relCat === 'atual' ? [k] : ui.relCat === 'anterior' ? [F.ymAdd(k, -1)] : F.serieMeses(k, 12), cp = F.catsPeriodo(ks);
    return { periodo: ks.length === 1 ? F.mesNome(ks[0]) : F.mesNome(ks[0]) + ' a ' + F.mesNome(ks[ks.length - 1]).toLowerCase(), linhas: cp.itens, total: cp.total, csv: [['Categoria', 'Valor', 'Percentual']].concat(cp.itens.map(function (x) { return [x.nome, F.numCsv(x.valor), x.pct.toFixed(1).replace('.', ',') + '%']; })) };
  }
  function compacto(n) { var a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1000 ? s + (a / 1000).toFixed(a % 1000 === 0 ? 0 : 1).replace('.', ',') + ' mil' : s + Math.round(a); }
  function escala(min, max) {
    var span = Math.max(1, max - min), pass = Math.pow(10, Math.floor(Math.log10(span / 4))), m = [1, 2, 2.5, 5, 10].filter(function (x) { return x * pass * 4 >= span; })[0] * pass;
    var lo = Math.floor(min / m) * m, hi = Math.ceil(max / m) * m, t = []; for (var v = lo; v <= hi + 1e-9; v += m) t.push(F.r2(v));
    return { lo: lo, hi: hi, ticks: t };
  }
  function desenharRelatorio() {
    var box = document.getElementById('rel-box'); if (!box) return;
    var d = dadosRelatorio(), W = Math.max(260, box.clientWidth - 32), H = 210, pl = 50, pr = 8, pt = 12, pb = 26, iw = W - pl - pr, ih = H - pt - pb, svg = '', h = '', sel = ui.relSel;
    var grade = function (sc, y) { sc.ticks.forEach(function (t) { svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(t) + '" y2="' + y(t) + '" style="stroke:var(--line)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end" class="eixo">' + compacto(t) + '</text>'; }); };
    if (ui.relTipo === 'rd') {
      var maxV = Math.max(1, Math.max.apply(null, d.linhas.map(function (x) { return Math.max(x.receitas, x.despesas); }))), sc = escala(0, maxV), y = function (v) { return pt + ih - (v - sc.lo) / (sc.hi - sc.lo) * ih; };
      var n = d.linhas.length, band = iw / n, bw = Math.max(4, Math.min(20, (band - 10) / 2));
      if (sel == null || sel >= n) sel = n - 1;
      d.linhas.forEach(function (x, i) { if (i === sel) svg += '<rect x="' + (pl + band * i + 1) + '" y="' + pt + '" width="' + (band - 2) + '" height="' + ih + '" rx="6" style="fill:var(--surface-2)"/>'; });
      grade(sc, y);
      d.linhas.forEach(function (x, i) {
        var cx = pl + band * i + band / 2;
        var bar = function (v, x0, cor) { var yy = y(v), hh = pt + ih - yy; if (hh < 0.5) return ''; var r = Math.min(4, hh, bw / 2); return '<path d="M' + x0 + ' ' + (pt + ih) + 'V' + (yy + r) + 'Q' + x0 + ' ' + yy + ' ' + (x0 + r) + ' ' + yy + 'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ' ' + yy + ' ' + (x0 + bw) + ' ' + (yy + r) + 'V' + (pt + ih) + 'Z" style="fill:var(' + cor + ')"/>'; };
        svg += bar(x.receitas, cx - bw - 1, '--s-rec') + bar(x.despesas, cx + 1, '--s-desp');
        if (n <= 6 || i % 2 === (n - 1) % 2) svg += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" class="eixo' + (i === sel ? ' forte' : '') + '">' + F.mesCurto(x.k).split('/')[0] + '</text>';
        svg += '<rect x="' + (pl + band * i) + '" y="0" width="' + band + '" height="' + H + '" fill="transparent" data-act="grafSel" data-v="' + i + '" style="cursor:pointer"/>';
      });
      var s = d.linhas[sel];
      h += '<div class="linha" style="flex-wrap:wrap"><h2 class="h2">Receitas x despesas</h2><div class="legenda"><span><i style="background:var(--s-rec)"></i>Receitas</span><span><i style="background:var(--s-desp)"></i>Despesas</span></div></div>';
      h += '<div class="leitura num"><strong>' + esc(F.mesNome(s.k)) + '</strong><span>Receitas ' + F.fmt(s.receitas) + '</span><span>Despesas ' + F.fmt(s.despesas) + '</span><span>Resultado <b' + (s.resultado < 0 ? ' style="color:var(--neg)"' : '') + '>' + F.fmt(s.resultado) + '</b></span></div>';
      h += '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de colunas de receitas e despesas por mês. Toque em um mês para ver os valores; a tabela abaixo tem todos os números.">' + svg + '</svg>';
      h += tabela(['Mês', 'Receitas', 'Despesas', 'Resultado'], d.linhas.slice().reverse().map(function (x) { return [F.mesCurto(x.k), F.fmt(x.receitas), F.fmt(x.despesas), F.fmt(x.resultado)]; }));
    } else if (ui.relTipo === 'saldo') {
      var vals = d.linhas.map(function (x) { return x.acumulado; }), sc2 = escala(Math.min(0, Math.min.apply(null, vals)), Math.max(1, Math.max.apply(null, vals))), y2 = function (v) { return pt + ih - (v - sc2.lo) / (sc2.hi - sc2.lo) * ih; };
      var n2 = d.linhas.length, xs = function (i) { return pl + 8 + (n2 === 1 ? (iw - 16) / 2 : (iw - 16) * i / (n2 - 1)); };
      if (sel == null || sel >= n2) sel = n2 - 1;
      grade(sc2, y2);
      var pts = d.linhas.map(function (x, i) { return xs(i).toFixed(1) + ',' + y2(x.acumulado).toFixed(1); }), base = y2(Math.max(sc2.lo, 0)).toFixed(1);
      svg += '<path d="M' + xs(0).toFixed(1) + ',' + base + 'L' + pts.join('L') + 'L' + xs(n2 - 1).toFixed(1) + ',' + base + 'Z" style="fill:var(--s-rec);opacity:.1"/>';
      svg += '<polyline points="' + pts.join(' ') + '" fill="none" style="stroke:var(--s-rec)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      svg += '<line x1="' + xs(sel) + '" x2="' + xs(sel) + '" y1="' + pt + '" y2="' + (pt + ih) + '" style="stroke:var(--muted)" stroke-width="1"/>';
      svg += '<circle cx="' + xs(sel) + '" cy="' + y2(d.linhas[sel].acumulado) + '" r="5" style="fill:var(--s-rec);stroke:var(--surface)" stroke-width="2"/>';
      d.linhas.forEach(function (x, i) { if (n2 <= 6 || i % 2 === (n2 - 1) % 2) svg += '<text x="' + xs(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="eixo' + (i === sel ? ' forte' : '') + '">' + F.mesCurto(x.k).split('/')[0] + '</text>'; svg += '<rect x="' + (xs(i) - (iw - 16) / Math.max(1, n2 - 1) / 2) + '" y="0" width="' + ((iw - 16) / Math.max(1, n2 - 1)) + '" height="' + H + '" fill="transparent" data-act="grafSel" data-v="' + i + '" style="cursor:pointer"/>'; });
      var s2 = d.linhas[sel];
      h += '<h2 class="h2">Saldo acumulado ao fim de cada mês</h2><div class="leitura num"><strong>' + esc(F.mesNome(s2.k)) + '</strong><span>Saldo ' + F.fmt(s2.acumulado) + '</span><span>Resultado do mês ' + F.fmt(s2.mes) + '</span></div>';
      h += '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de linha do saldo acumulado por mês. Toque em um mês para ver os valores; a tabela abaixo tem todos os números.">' + svg + '</svg>';
      h += '<p class="sub" style="margin:0">Considera receitas recebidas, despesas pagas e pagamentos de fatura. Compras no cartão entram quando a fatura é paga.</p>';
      h += tabela(['Mês', 'Resultado', 'Saldo'], d.linhas.slice().reverse().map(function (x) { return [F.mesCurto(x.k), F.fmt(x.mes), F.fmt(x.acumulado)]; }));
    } else {
      h += '<div class="linha"><h2 class="h2">Despesas por categoria</h2><span class="sub num">' + F.fmt(d.total) + '</span></div><span class="sub">' + esc(d.periodo) + '</span>';
      if (!d.linhas.length) h += '<p class="vazio">Nenhuma despesa neste período.</p>';
      d.linhas.forEach(function (c) { h += '<div style="display:flex;flex-direction:column;gap:4px"><div class="linha" style="font-size:14px"><span>' + esc(c.nome) + '</span><span class="num sub">' + F.fmt(c.valor) + ' · ' + c.pct.toFixed(1).replace('.', ',') + '%</span></div><div class="barra"><i style="width:' + c.pct.toFixed(1) + '%;background:var(--s-rec)"></i></div></div>'; });
      h += '<p class="sub" style="margin:0">Compras no cartão entram pela data da compra. Pagamentos de fatura não entram aqui.</p>';
    }
    h += '<div class="linha sub" style="flex-wrap:wrap"><span>Gerado em ' + esc(new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) + '</span><button class="btn-peq" data-act="exportarRel">Exportar CSV</button></div>';
    box.innerHTML = h;
  }
  function tabela(cab, linhas) {
    return '<details><summary class="sub" style="cursor:pointer;min-height:36px;display:flex;align-items:center">Ver tabela de dados</summary><div style="overflow-x:auto"><table class="tab num"><thead><tr>' + cab.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      linhas.map(function (l) { return '<tr>' + l.map(function (c, i) { return i ? '<td>' + esc(c) + '</td>' : '<th scope="row">' + esc(c) + '</th>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
  }
  async function baixar(nome, conteudo) {
    var dl = null;
    try { dl = window.claude && typeof window.claude.use === 'function' ? await Promise.race([window.claude.use('downloads'), new Promise(function (ok) { setTimeout(function () { ok(null); }, 3000); })]) : null; } catch (e) { dl = null; }
    if (!dl) {
      try {
        var url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
        a.href = url; a.download = nome; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000); toast('Arquivo exportado.');
      } catch (e) { toast('A exportação de arquivos não está disponível neste navegador.'); }
      return;
    }
    try { await dl.save({ filename: nome, data: conteudo }); toast('Arquivo exportado.'); }
    catch (e) { if (e && e.code === 'declined') return; toast(e && e.code === 'rate_limited' ? 'Aguarde um instante e tente exportar de novo.' : 'Não foi possível exportar o arquivo.'); }
  }

  VIEWS.mais = function () {
    var nEx = S.lanc.filter(function (l) { return l.excl; }).length, nMetas = S.metas.filter(function (m) { return !m.cancelada; }).length;
    var it = function (v, t, m) { return '<button type="button" class="item" data-act="ir" data-v="' + v + '"><span class="meio"><span class="t">' + t + '</span>' + (m ? '<span class="m">' + m + '</span>' : '') + '</span>' + I.seta + '</button>'; };
    var h = topo('Mais');
    h += '<div class="lista menu">' + it('metas', 'Metas de economia', nMetas ? nMetas + (nMetas === 1 ? ' meta' : ' metas') : 'Defina quanto quer juntar') + it('relatorios', 'Relatórios', 'Receitas x despesas, categorias, saldo') + it('categorias', 'Categorias', 'Criar, editar e desativar') + it('excluidos', 'Lançamentos excluídos', nEx ? nEx + ' para restaurar' : 'Nenhum no momento') + '</div>';
    h += '<div class="lista menu">' + it('conta', modo === 'real' ? 'Minha conta' : 'Dados de exemplo', modo === 'real' ? 'Nome, senha, exportar ou excluir' : 'Exportar ou apagar o exemplo') + '<button type="button" class="item" data-act="sair"><span class="meio"><span class="t">Sair</span><span class="m">Encerra a sessão e apaga rascunhos</span></span>' + I.seta + '</button></div>';
    if (modo === 'demo') h += '<h2 class="h2" style="margin-top:6px">Para testar</h2><div class="lista menu"><button type="button" class="item" data-act="simularExpirar"><span class="meio"><span class="t">Simular sessão expirada</span><span class="m">Abra um lançamento antes para ver o rascunho guardado</span></span>' + I.seta + '</button><button type="button" class="item" data-act="recriarDemo"><span class="meio"><span class="t">Recomeçar o exemplo</span><span class="m">Volta os dados de exemplo ao início</span></span>' + I.seta + '</button></div>';
    h += '<p class="sub" style="margin:0">Os dados ficam só neste navegador' + (modo === 'real' ? ', cifrados com a sua senha' : '') + ': outro aparelho, outro navegador ou uma janela anônima começam vazios. Use “Exportar meus dados” para guardar uma cópia.</p>';
    h += '<p class="sub" style="margin:0">Finanças Simples ' + VERSAO + '</p>';
    return h;
  };
  VIEWS.categorias = function () {
    var h = topo('Categorias', 'mais');
    h += '<form id="f-cat" class="painel" novalidate><div class="campo"><label for="cat-nome">Nova categoria</label><input id="cat-nome" class="inp" data-mask="texto" maxlength="30" placeholder="Ex.: Pets, Academia" autocomplete="off"></div>' +
      '<div class="chips" role="group" aria-label="Tipo da categoria">' + chip('Despesa', 'catTipo', 'data-v="d"', ui.catTipo === 'd') + chip('Receita', 'catTipo', 'data-v="r"', ui.catTipo === 'r') + '</div><div id="cat-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-pri" type="submit">Adicionar</button></form>';
    [['d', 'Despesas'], ['r', 'Receitas']].forEach(function (t) {
      h += '<h2 class="h2">' + t[1] + '</h2><div class="lista">' + S.cats.filter(function (c) { return c.tipo === t[0]; }).map(function (c) {
        var usada = S.lanc.some(function (l) { return l.cat === c.id; }) || S.metas.some(function (m) { return m.cat === c.id; });
        return '<div class="item"><span class="meio"><span class="t" style="' + (c.ativa ? '' : 'opacity:.55') + '">' + esc(c.nome) + '</span><span class="m">' + (c.padrao ? 'Padrão' : 'Sua') + (c.ativa ? '' : ' · inativa') + '</span></span><button class="btn-peq" data-act="toggleCat" data-id="' + esc(c.id) + '">' + (c.ativa ? 'Desativar' : 'Ativar') + '</button>' + (!c.padrao && !usada ? '<button class="btn-peq" data-act="excluirCat" data-id="' + esc(c.id) + '" style="color:var(--neg)">Excluir</button>' : '') + '</div>';
      }).join('') + '</div>';
    });
    return h + '<p class="sub" style="margin:0">Categorias padrão e categorias em uso não podem ser excluídas. Desativar tira a categoria das listas, mas mantém o histórico.</p>';
  };
  function salvarCat() {
    var nome = F.limparTexto(document.getElementById('cat-nome').value, 30), tipo = ui.catTipo === 'r' ? 'r' : 'd', err = null;
    if (nome.length < 3) err = 'Use de 3 a 30 caracteres.';
    else if (S.cats.some(function (c) { return c.tipo === tipo && c.nome.toLowerCase() === nome.toLowerCase(); })) err = 'Já existe uma categoria com esse nome.';
    if (err) return erroEm('cat-erro', err);
    S.cats.push({ id: 'c-' + F.uid(), nome: nome, tipo: tipo, ativa: true, padrao: false });
    salvar(); render(); toast('Categoria criada.');
  }
  VIEWS.excluidos = function () {
    var ex = S.lanc.filter(function (l) { return l.excl; }).sort(function (a, b) { return a.excl < b.excl ? 1 : -1; });
    var h = topo('Excluídos', 'mais') + '<p style="margin:0;color:var(--muted)">Lançamentos excluídos ficam aqui por 30 dias. Depois disso, são apagados de vez.</p>';
    if (!ex.length) return h + '<div class="lista"><p class="vazio">Nada por aqui.</p></div>';
    return h + '<div class="lista">' + ex.map(function (l) { var dias = Math.max(0, 30 - Math.floor((Date.now() - Date.parse(l.excl)) / 86400000)); return '<div class="item"><span class="meio"><span class="t">' + esc(descTxt(l)) + '</span><span class="m num">' + F.br(l.data) + ' · ' + valorTxt(l) + ' · some em ' + dias + (dias === 1 ? ' dia' : ' dias') + '</span></span><button class="btn-peq" data-act="restaurar" data-id="' + esc(l.id) + '">Restaurar</button></div>'; }).join('') + '</div>';
  };
  VIEWS.conta = function () {
    var conta = LS.get(K.conta), h = topo(modo === 'real' ? 'Minha conta' : 'Dados de exemplo', 'mais');
    if (modo === 'real') {
      h += '<form id="f-nome" class="painel" novalidate><h2 class="h2">Dados cadastrais</h2>' + campo('cn-nome', 'Nome completo', 'text', 'data-mask="nome" maxlength="80" autocomplete="name" value="' + esc(S.perfil.nome) + '"') +
        '<div class="kv"><span>E-mail</span><span>' + esc(conta ? conta.email : '') + '</span></div><div id="cn-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-sec" type="submit">Salvar nome</button></form>';
      h += '<form id="f-senha" class="painel" novalidate><h2 class="h2">Alterar senha</h2>' + campo('cs-atual', 'Senha atual', 'password', 'autocomplete="current-password" maxlength="128"') + campo('cs-nova', 'Nova senha', 'password', 'autocomplete="new-password" maxlength="128" placeholder="8 ou mais, com letra e número"') + campo('cs-nova2', 'Confirme a nova senha', 'password', 'autocomplete="new-password" maxlength="128"') +
        '<div id="cs-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-sec" type="submit">Alterar senha</button><p class="sub" style="margin:0">Ao trocar a senha, seus dados são cifrados de novo com a nova chave.</p></form>';
    }
    h += '<div class="painel"><h2 class="h2">Exportar meus dados</h2><p style="margin:0;color:var(--muted)">Gera um arquivo CSV com lançamentos, categorias, cartões, faturas e metas. Abre no Excel e no Google Planilhas.</p><button class="btn btn-sec" data-act="exportarTudo">Exportar CSV</button></div>';
    h += '<div class="painel"><h2 class="h2">' + (modo === 'real' ? 'Excluir minha conta' : 'Apagar o exemplo') + '</h2><p style="margin:0;color:var(--muted)">' + (modo === 'real' ? 'Apaga a conta e todos os dados deste aparelho. Não dá para desfazer.' : 'Remove os dados de exemplo deste aparelho.') + '</p><button class="btn btn-sec" data-act="pedirApagar" style="color:var(--neg)">' + (modo === 'real' ? 'Excluir minha conta' : 'Apagar o exemplo') + '</button></div>';
    return h;
  };
  function salvarNome() {
    var n = F.limparTexto(document.getElementById('cn-nome').value, 80);
    if (!F.nomeValido(n)) return erroEm('cn-erro', 'Informe o nome completo, só com letras (3 a 80 caracteres).');
    S.perfil.nome = n; salvar(); render(); toast('Nome atualizado.');
  }
  async function trocarSenha(ev) {
    if (ocupado) return;
    var conta = LS.get(K.conta), at = document.getElementById('cs-atual').value, n1 = document.getElementById('cs-nova').value, n2 = document.getElementById('cs-nova2').value, err = null;
    if (!at) err = 'Informe a senha atual.'; else if ((err = F.senhaProblema(n1, conta.email))) {  } else if (n1 !== n2) err = 'As duas senhas novas não são iguais.'; else if (n1 === at) err = 'A nova senha precisa ser diferente da atual.';
    if (err) return erroEm('cs-erro', err);
    var btn = ev.target.querySelector('button[type="submit"]'); ocupar(btn, 'Cifrando de novo…');
    try {
      var d = await SEG.derivar(at, conta.sal, conta.iter);
      if (!F.iguais(d.verif, conta.verif)) { liberar(btn); return erroEm('cs-erro', 'A senha atual está incorreta.'); }
      var sal = SEG.sal(), d2 = await SEG.derivar(n1, sal), env = await SEG.cifrar(d2.chave, S);
      await KV.set('dados:real', env);
      LS.set(K.conta, Object.assign({}, conta, { sal: sal, iter: SEG.ITER, verif: d2.verif }));
      CHAVE = d2.chave; await KV.set('chave', CHAVE); LS.del(K.rasc);
      liberar(btn); render(); toast('Senha alterada. Seus dados foram cifrados com a nova senha.');
    } catch (e) { liberar(btn); erroEm('cs-erro', 'Não foi possível alterar a senha. Nada foi mudado.'); }
  }
  function pedirApagar() {
    var real = modo === 'real' && S;
    abrirFolha('<h2 class="h1">' + (real ? 'Excluir sua conta?' : 'Apagar estes dados?') + '</h2><p style="margin:0;color:var(--muted)">' + (real ? 'A conta, os lançamentos, cartões, metas e categorias serão apagados deste aparelho. Não dá para desfazer.' : 'Os dados guardados neste aparelho serão removidos.') + '</p>' +
      (real ? '<form id="f-apagar" style="display:flex;flex-direction:column;gap:14px" novalidate>' + campo('ap-senha', 'Confirme com a sua senha', 'password', 'autocomplete="current-password" maxlength="128"') + '<div id="ap-erro" class="aviso a-neg" role="alert" hidden></div><button class="btn btn-del" type="submit">Excluir conta</button></form>' : '<button class="btn btn-del" data-act="apagarTudo">Sim, apagar</button>') +
      '<button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Apagar dados');
  }
  async function apagarConta(ev) {
    if (ocupado) return;
    var conta = LS.get(K.conta), btn = ev.target.querySelector('button'); ocupar(btn, 'Verificando…');
    var ok = false; try { ok = F.iguais((await SEG.derivar(document.getElementById('ap-senha').value, conta.sal, conta.iter)).verif, conta.verif); } catch (e) {}
    liberar(btn);
    if (!ok) return erroEm('ap-erro', 'Senha incorreta.');
    await apagarTudo();
  }
  async function apagarTudo(forcarReal) {
    var real = forcarReal || modo !== 'demo';
    if (!real) await KV.del('dados:demo'); else { await KV.del('dados:real'); LS.del(K.conta); LS.del(K.legado); }
    LS.del(K.rasc); LS.del(K.bloq);
    await encerrar(real ? 'Conta e dados apagados deste aparelho.' : 'Dados de exemplo apagados.');
  }

  var SETF = { cat: function (v) { return S.cats.some(function (c) { return c.id === v && c.tipo === form.tipo; }); }, forma: function (v) { return FORMAS[form.tipo].indexOf(v) >= 0; }, sit: function (v) { return v === 'paga' || v === 'pendente'; }, cartaoId: function (v) { return !!F.cartao(v); }, per: function (v) { return ['semanal', 'quinzenal', 'mensal', 'anual'].indexOf(v) >= 0; }, regra: function (v) { return ['antecipar', 'postergar', 'manter'].indexOf(v) >= 0; } };
  var HISTF = { histTipo: ['todos', 'r', 'd'], histSit: ['todas', 'paga', 'pendente', 'prevista', 'cartao'] };
  var RELF = { relTipo: ['rd', 'cat', 'saldo'], relPer: ['6', '12'], relCat: ['atual', 'anterior', '12'] };
  var A = {
    ir: function (d) { if (d.v === 'historico' && d.fat) ui.histMes = d.fat; ir(d.v, { id: d.id, fat: d.fat, de: d.de }); },
    novo: function () { abrirNovo('d'); },
    acessoModo: function (d) { ui.acesso = d.v === 'cadastro' ? 'cadastro' : 'entrar'; render(); },
    esqueci: function () { abrirFolha('<h2 class="h1">Esqueci minha senha</h2><p style="margin:0;color:var(--muted)">Os dados ficam cifrados com a sua senha, então sem ela não é possível abri-los. Na versão com servidor haverá redefinição por e-mail.</p><p style="margin:0;color:var(--muted)">Se precisar recomeçar, crie outra conta neste aparelho. A conta anterior e os dados dela serão substituídos.</p><button class="btn btn-sec" data-act="fecharFolha">Entendi</button>', 'Recuperar senha'); },
    entrarDemo: function () { iniciarSessao('demo', false); },
    sairDemo: function () { encerrar(); },
    recriarDemo: async function () { await KV.del('dados:demo'); await carregar('demo'); ir('painel'); toast('Exemplo recomeçado.'); },
    sair: function () { LS.del(K.rasc); encerrar('Você saiu.'); },
    simularExpirar: function () { expirar(); },
    restaurarRasc: function () { var f = rascunhoPendente; rascunhoPendente = null; LS.del(K.rasc); fecharFolha(); if (!f) return; form = f; formTentou = false; formSujo = true; ir('lanc', { de: 'painel', restaurado: true }); },
    descartarRasc: function () { rascunhoPendente = null; LS.del(K.rasc); fecharFolha(); toast('Rascunho descartado.'); },
    descartarForm: function () { LS.del(K.rasc); form = null; ir('painel'); toast('Rascunho descartado.'); },
    setTipo: function (d) { if (!form || (d.v !== 'd' && d.v !== 'r') || form.tipo === d.v) return; form.tipo = d.v; form.cat = ''; form.forma = ''; form.regra = null; form.manter = {}; formSujo = true; render(); },
    setF: function (d) { if (!form || !own(SETF, d.k)) return; var v = (d.toggle && form[d.k] === d.v) ? '' : d.v; if (v && !SETF[d.k](v)) return; form[d.k] = v; form.manter = {}; formSujo = true; render(); },
    passo: function (d) { if (!form || (d.k !== 'parc' && d.k !== 'reps')) return; var lim = d.k === 'parc' ? [1, 24] : [2, 60]; form[d.k] = Math.max(lim[0], Math.min(lim[1], form[d.k] + (d.v === '1' ? 1 : -1))); if (d.k === 'reps') form.manter = {}; formSujo = true; render(); },
    toggleRec: function () { if (!form) return; form.rec = !form.rec; form.manter = {}; formSujo = true; render(); },
    manterOc: function (d) { if (!form) return; var i = parseInt(d.v, 10); if (!(i >= 0 && i < 60)) return; form.manter = Object.assign({}, form.manter); form.manter[i] = !form.manter[i]; render(); },
    salvarLanc: function () { if (form) salvarLanc(); },
    aplicarEdicao: function (d) { fecharFolha(); if (form) aplicarEdicao(d.v === 'serie' ? 'serie' : 'um'); },
    acoesLanc: function (d) { acoesLanc(d.id); },
    editar: function (d) { fecharFolha(); abrirEdicao(d.id, view); },
    marcarPaga: function (d) { var l = S.lanc.filter(function (x) { return x.id === d.id; })[0]; if (!l) return; l.sit = 'paga'; l.alterado = new Date().toISOString(); salvar(); fecharFolha(); render(); toast('Marcada como paga.'); },
    pedirExcluir: function (d) { pedirExcluir(d.id); },
    excluir: function (d) { excluir(d.id, d.v); },
    restaurar: function (d) { var l = S.lanc.filter(function (x) { return x.id === d.id; })[0]; if (!l) return; l.excl = null; salvar(); render(); toast('Lançamento restaurado.'); },
    desfazerToast: function () { if (toastDesfazer) toastDesfazer(); $toast.hidden = true; toastDesfazer = null; },
    fecharFolha: function () { fecharFolha(); },
    histMes: function (d) { ui.histMes = F.ymAdd(ui.histMes, d.v === '1' ? 1 : -1); ui.histPag = 1; render(); },
    histF: function (d) { if (!own(HISTF, d.k) || HISTF[d.k].indexOf(d.v) < 0) return; ui[d.k] = d.v; ui.histPag = 1; render(); },
    histPag: function (d) { ui.histPag = Math.max(1, ui.histPag + (d.v === '1' ? 1 : -1)); renderHistLista(); window.scrollTo(0, 0); },
    cartaoForm: function (d) { cartaoForm(d.id); },
    toggleCartao: function (d) { var c = F.cartao(d.id); if (!c) return; c.ativo = !c.ativo; salvar(); fecharFolha(); render(); toast(c.ativo ? 'Cartão reativado.' : 'Cartão desativado.'); },
    excluirCartao: function (d) { if (S.lanc.some(function (l) { return l.cartaoId === d.id; })) return; S.cartoes = S.cartoes.filter(function (c) { return c.id !== d.id; }); S.pags = S.pags.filter(function (p) { return p.cartaoId !== d.id; }); salvar(); fecharFolha(); ir('cartoes'); toast('Cartão excluído.'); },
    fatNav: function (d) { var keys = F.chavesFatura(params.id), i = keys.indexOf(ui.fatKey) + (d.v === '1' ? 1 : -1); if (keys[i]) { ui.fatKey = keys[i]; render(); } },
    pagarForm: function (d) { if (F.cartao(d.id)) pagarForm(d.id); },
    pedirEstorno: function (d) { abrirFolha('<h2 class="h1">Estornar o pagamento?</h2><p style="margin:0;color:var(--muted)">O pagamento desta fatura é removido, o valor volta ao saldo e a fatura volta a ficar em aberto para pagamento.</p><button class="btn btn-del" data-act="estornar" data-id="' + esc(d.id) + '">Sim, estornar</button><button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Estornar'); },
    estornar: function (d) { S.pags = S.pags.filter(function (p) { return !(p.cartaoId === d.id && p.fatura === ui.fatKey); }); salvar(); fecharFolha(); render(); toast('Pagamento estornado.'); },
    catTipo: function (d) { ui.catTipo = d.v === 'r' ? 'r' : 'd'; var n = document.getElementById('cat-nome').value; render(); document.getElementById('cat-nome').value = n; },
    toggleCat: function (d) { var c = F.categoria(d.id); if (!c) return; c.ativa = !c.ativa; salvar(); render(); },
    excluirCat: function (d) { var c = F.categoria(d.id); if (!c || c.padrao || S.lanc.some(function (l) { return l.cat === c.id; })) return; S.cats = S.cats.filter(function (x) { return x.id !== d.id; }); salvar(); render(); toast('Categoria excluída.'); },
    metaForm: function (d) { metaForm(d.id); },
    aporteForm: function (d) { if (achaMeta(d.id)) aporteForm(d.id); },
    removerAporte: function (d) { var m = achaMeta(d.id); if (!m) return; var a = m.aportes.filter(function (x) { return x.id === d.v; })[0]; if (!a) return; m.aportes = m.aportes.filter(function (x) { return x !== a; }); salvar(); render(); toast('Valor removido da meta.', function () { m.aportes.push(a); salvar(); render(); }); },
    cancelarMeta: function (d) { var m = achaMeta(d.id); if (!m) return; m.cancelada = !m.cancelada; salvar(); render(); toast(m.cancelada ? 'Meta cancelada.' : 'Meta reativada.'); },
    pedirExcluirMeta: function (d) { var m = achaMeta(d.id); if (!m) return; abrirFolha('<h2 class="h1">Excluir a meta “' + esc(m.nome) + '”?</h2><p style="margin:0;color:var(--muted)">A meta e os valores guardados nela serão apagados. Não dá para desfazer.</p><button class="btn btn-del" data-act="excluirMeta" data-id="' + esc(m.id) + '">Sim, excluir</button><button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Excluir meta'); },
    excluirMeta: function (d) { S.metas = S.metas.filter(function (m) { return m.id !== d.id; }); salvar(); ir('metas'); toast('Meta excluída.'); },
    relF: function (d) { if (!own(RELF, d.k) || RELF[d.k].indexOf(d.v) < 0) return; ui[d.k] = d.v; ui.relSel = null; render(); },
    grafSel: function (d) { ui.relSel = Math.max(0, parseInt(d.v, 10) || 0); desenharRelatorio(); },
    exportarRel: function () { var d = dadosRelatorio(); baixar('relatorio-' + { rd: 'receitas-despesas', cat: 'categorias', saldo: 'saldo' }[ui.relTipo] + '-' + F.hoje() + '.csv', F.csv(d.csv)); },
    exportarTudo: function () { baixar('financas-simples-' + F.hoje() + '.csv', F.exportarTudo()); },
    pedirApagar: function () { pedirApagar(); },
    apagarTudo: function () { apagarTudo(); },
    apagarTudoReal: function () { abrirFolha('<h2 class="h1">Apagar os dados deste aparelho?</h2><p style="margin:0;color:var(--muted)">A conta e os dados cifrados serão removidos. Não dá para desfazer.</p><button class="btn btn-del" data-act="apagarTudoRealOk">Sim, apagar</button><button class="btn-txt" data-act="fecharFolha">Cancelar</button>', 'Apagar dados'); },
    apagarTudoRealOk: function () { apagarTudo(true); },
  };
  var SEM_SESSAO = { acessoModo: 1, esqueci: 1, entrarDemo: 1, fecharFolha: 1, desfazerToast: 1, sair: 1, apagarTudoReal: 1, apagarTudoRealOk: 1 };

  var PROIBIDO = { moeda: /\D/, dia: /\D/, nome: /[^A-Za-zÀ-ÖØ-öø-ÿ' -]/, email: /[^A-Za-z0-9._%+@-]/, texto: /[<>\u0000-\u001F\u007F]/ };
  function aplicarMascara(t) {
    var m = t.dataset.mask, v = t.value, nv = v;
    if (m === 'moeda') nv = F.mascaraMoeda(v); else if (m === 'dia') nv = F.mascaraDia(v); else if (m === 'nome') nv = F.filtroNome(v); else if (m === 'email') nv = F.filtroEmail(v); else if (m === 'texto') nv = F.filtroTexto(v, Number(t.getAttribute('maxlength')) || 200);
    if (nv !== v) {
      var pos = t.selectionStart; t.value = nv;
      try { var p = m === 'moeda' ? nv.length : Math.max(0, (pos || 0) - (v.length - nv.length)); t.setSelectionRange(p, p); } catch (e) {}
    }
  }
  document.addEventListener('beforeinput', function (e) {
    var t = e.target, m = t && t.dataset && t.dataset.mask;
    if (!m || !own(PROIBIDO, m) || e.data == null || !/^insert/.test(e.inputType || '')) return;
    if (e.data.length === 1 && PROIBIDO[m].test(e.data)) e.preventDefault();
  });
  document.addEventListener('click', function (e) {
    if (e.target === $folha) { fecharFolha(); return; }
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (!own(A, act) || (!S && !own(SEM_SESSAO, act))) return;
    e.preventDefault(); A[act](b.dataset);
  });
  var CAMPOS_F = { desc: 1, valor: 1, data: 1, obs: 1 };
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.mask) aplicarMascara(t);
    if (t.dataset.f && form && own(CAMPOS_F, t.dataset.f)) { form[t.dataset.f] = t.value; formSujo = true; if (t.dataset.f === 'valor') { var ft = document.getElementById('fat-txt'); if (ft) ft.textContent = txtFatura(form); } }
    if (t.dataset.ui === 'histBusca') { ui.histBusca = F.filtroTexto(t.value, 60); ui.histPag = 1; renderHistLista(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.f && form && own(CAMPOS_F, t.dataset.f)) { form[t.dataset.f] = t.value; if (t.dataset.f === 'data') form.manter = {}; if (t.dataset.rerender) { var y = window.scrollY; render(); window.scrollTo(0, y); } }
    if (t.dataset.ui === 'histCat' || t.dataset.ui === 'histCartao') { ui[t.dataset.ui] = t.value; ui.histPag = 1; renderHistLista(); }
  });
  var FORMS = { 'f-login': entrar, 'f-cad': cadastrar, 'f-cartao': salvarCartao, 'f-pag': salvarPag, 'f-cat': salvarCat, 'f-meta': salvarMeta, 'f-aporte': salvarAporte, 'f-nome': salvarNome, 'f-senha': trocarSenha, 'f-apagar': apagarConta };
  var FORMS_SEM_SESSAO = { 'f-login': 1, 'f-cad': 1 };
  document.addEventListener('submit', function (e) { e.preventDefault(); var id = e.target.id; if (own(FORMS, id) && (S || own(FORMS_SEM_SESSAO, id))) FORMS[id](e); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$folha.hidden) fecharFolha(); });
  var redesenho = null; window.addEventListener('resize', function () { clearTimeout(redesenho); redesenho = setTimeout(function () { if (view === 'relatorios') desenharRelatorio(); }, 150); });

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { ultimaAtividade = Date.now(); var s = sessaoAtual(); if (s && modo) { s.ultimo = ultimaAtividade; (s.manter ? LS : SS).set(K.sess, s); } }, { passive: true }); });
  setInterval(function () { var s = sessaoAtual(); if (modo && Date.now() - ultimaAtividade > limiteSessao(s)) expirar(); }, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && modo) { var s = sessaoAtual(); if (!s || Date.now() - s.ultimo > limiteSessao(s)) expirar(); } });

  window.__fsPronto = (async function iniciar() {
    $app.innerHTML = '<p class="vazio">Abrindo…</p>';
    var s0 = sessaoAtual();
    var valida = !!s0 && (s0.modo === 'demo' || s0.modo === 'real') && Date.now() - s0.ultimo < limiteSessao(s0);
    if (valida && s0.modo === 'real') {
      var k = null, conta = LS.get(K.conta); try { k = await KV.get('chave'); } catch (e) {}
      if (k && typeof CryptoKey !== 'undefined' && k instanceof CryptoKey && conta && conta.v === 2) CHAVE = k; else valida = false;
    }
    if (valida) {
      try { await carregar(s0.modo); ultimaAtividade = Date.now(); view = 'painel'; render(); return; }
      catch (e) { S = null; view = 'erroDados'; render(); return; }
    }
    if (s0) { SS.del(K.sess); LS.del(K.sess); }
    try { await KV.del('chave'); } catch (e) {}
    ui.acesso = LS.get(K.conta) ? 'entrar' : 'cadastro'; view = 'acesso'; render();
  })();
})();
