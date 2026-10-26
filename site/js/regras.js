var FS = (function () {
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var isoOf = function (y, m, d) { return y + '-' + pad(m) + '-' + pad(d); };
  var parts = function (s) { return s.split('-').map(Number); };
  var dim = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  var toUTC = function (s) { var p = parts(s); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  var fromUTC = function (t) { return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  var addDays = function (s, n) { var t = toUTC(s); t.setUTCDate(t.getUTCDate() + n); return fromUTC(t); };
  var addMonths = function (s, k, dia) {
    var p = parts(s), y = p[0], m = p[1], d = dia || p[2];
    var mm = m - 1 + k; y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12;
    return isoOf(y, mm + 1, Math.min(d, dim(y, mm + 1)));
  };
  var hojeReal = function () { var t = new Date(); return isoOf(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
  var _hoje = null;
  var hoje = function () { return _hoje || hojeReal(); };
  var ym = function (s) { return s.slice(0, 7); };
  var ymAdd = function (k, n) { return addMonths(k + '-01', n).slice(0, 7); };
  var br = function (s) { var p = parts(s); return pad(p[2]) + '/' + pad(p[1]) + '/' + p[0]; };
  var brCurto = function (s) { var p = parts(s); return pad(p[2]) + '/' + pad(p[1]); };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var mesNome = function (k) { var p = k.split('-').map(Number); var n = MESES[p[1] - 1]; return n.charAt(0).toUpperCase() + n.slice(1) + ' de ' + p[0]; };
  var mesCurto = function (k) { var p = k.split('-').map(Number); return MESES[p[1] - 1].slice(0, 3) + '/' + String(p[0]).slice(2); };
  var DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var soma = function (arr, f) { return r2(arr.reduce(function (a, x) { return a + (f ? f(x) : x); }, 0)); };
  var fmt = function (n) {
    var neg = n < -0.004; var s = Math.abs(n).toFixed(2).split('.');
    return (neg ? '−' : '') + 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
  };
  var parseValor = function (s) {
    var t = String(s || '').replace(/R\$|\s/g, '');
    if (!t) return NaN;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return r2(Number(t));
  };

  var pascoa = function (y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return isoOf(y, mes, dia);
  };
  var _fer = {};
  var feriados = function (y) {
    if (_fer[y]) return _fer[y];
    var f = {};
    var fixos = { '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho', '09-07': 'Independência do Brasil', '10-12': 'Nossa Senhora Aparecida', '11-02': 'Finados', '11-15': 'Proclamação da República', '12-25': 'Natal' };
    if (y >= 2024) fixos['11-20'] = 'Consciência Negra';
    Object.keys(fixos).forEach(function (k) { f[y + '-' + k] = fixos[k]; });
    f[addDays(pascoa(y), -2)] = 'Sexta-feira Santa';
    return (_fer[y] = f);
  };
  var feriado = function (s) { return feriados(parts(s)[0])[s] || null; };
  var naoUtil = function (s) {
    var f = feriado(s); if (f) return f;
    var w = toUTC(s).getUTCDay();
    return (w === 0 || w === 6) ? DIAS[w] : null;
  };
  var ajustar = function (s, regra) {
    if (regra === 'manter') return s;
    var passo = regra === 'antecipar' ? -1 : 1, x = s, g = 0;
    while (naoUtil(x) && g++ < 10) x = addDays(x, passo);
    return x;
  };
  var ocorrencia = function (base, per, i) {
    var dia = parts(base)[2];
    if (per === 'semanal') return addDays(base, 7 * i);
    if (per === 'quinzenal') return addDays(base, 14 * i);
    if (per === 'anual') return addMonths(base, 12 * i, dia);
    return addMonths(base, i, dia);
  };

  var CATS_PADRAO = [
    ['c-sal', 'Salário', 'r'], ['c-ren', 'Rendimentos', 'r'], ['c-outr', 'Outras receitas', 'r'],
    ['c-ali', 'Alimentação', 'd'], ['c-tra', 'Transporte', 'd'], ['c-mor', 'Moradia', 'd'], ['c-sau', 'Saúde', 'd'],
    ['c-edu', 'Educação', 'd'], ['c-laz', 'Lazer', 'd'], ['c-outd', 'Outras despesas', 'd'],
  ];
  var novoDados = function () {
    return { v: 2, cats: CATS_PADRAO.map(function (c) { return { id: c[0], nome: c[1], tipo: c[2], ativa: true, padrao: true }; }), cartoes: [], lanc: [], pags: [], metas: [], perfil: { nome: '' } };
  };
  var uid = function () { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); };

  var S = null;
  var memo = {};
  var usar = function (dados) { S = dados; memo = {}; };
  var limpar = function () { memo = {}; };
  var ativos = function () { return S.lanc.filter(function (l) { return !l.excl; }); };
  var cartao = function (id) { return S.cartoes.filter(function (c) { return c.id === id; })[0]; };
  var categoria = function (id) { return S.cats.filter(function (c) { return c.id === id; })[0]; };
  var nomeCat = function (id) { var c = categoria(id); return c ? c.nome : '—'; };

  var diaC = function (y, m, dia) { return Math.min(dia, dim(y, m)); };
  var faturaDe = function (c, data) {
    var p = parts(data), y = p[0], m = p[1];
    if (p[2] > diaC(y, m, c.fech)) { m++; if (m > 12) { m = 1; y++; } }
    if (c.venc <= c.fech) { m++; if (m > 12) { m = 1; y++; } }
    return y + '-' + pad(m);
  };
  var datasFatura = function (c, key) {
    var p = key.split('-').map(Number), vy = p[0], vm = p[1], cy = vy, cm = vm;
    if (c.venc <= c.fech) { cm--; if (cm < 1) { cm = 12; cy--; } }
    return { fecha: isoOf(cy, cm, diaC(cy, cm, c.fech)), vence: isoOf(vy, vm, diaC(vy, vm, c.venc)) };
  };
  var temFatura = function (cid, key) {
    return S.lanc.some(function (l) { return !l.excl && l.cartaoId === cid && l.fatura === key; }) ||
      S.pags.some(function (p) { return p.cartaoId === cid && p.fatura === key; });
  };
  var fatura = function (cid, key) {
    var mk = cid + '|' + key; if (memo[mk]) return memo[mk];
    var c = cartao(cid), d = datasFatura(c, key);
    var compras = ativos().filter(function (l) { return l.cartaoId === cid && l.fatura === key; })
      .sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    var pags = S.pags.filter(function (p) { return p.cartaoId === cid && p.fatura === key; });
    var tc = soma(compras, function (l) { return l.valor; });
    var pago = soma(pags, function (p) { return p.valor; });
    var anterior = 0, pk = ymAdd(key, -1);
    if (temFatura(cid, pk)) { var pf = fatura(cid, pk); if (pf.pago > 0 && pf.pago < pf.total) anterior = r2(pf.total - pf.pago); }
    var total = r2(tc + anterior), h = hoje(), st;
    if (h <= d.fecha) st = 'Aberta';
    else if (total > 0 && pago >= total) st = 'Paga';
    else if (pago > 0) st = 'Paga parcialmente';
    else if (total <= 0) st = 'Sem compras';
    else if (h > d.vence) st = 'Vencida';
    else st = 'Fechada';
    var restante = (st === 'Paga' || st === 'Paga parcialmente' || st === 'Sem compras') ? 0 : r2(Math.max(0, total - pago));
    return (memo[mk] = { cartaoId: cid, key: key, fecha: d.fecha, vence: d.vence, compras: compras, pags: pags, totalCompras: tc, anterior: anterior, total: total, pago: pago, restante: restante, status: st });
  };
  var chavesFatura = function (cid) {
    var ks = {};
    S.lanc.forEach(function (l) { if (!l.excl && l.cartaoId === cid) ks[l.fatura] = 1; });
    S.pags.forEach(function (p) { if (p.cartaoId === cid) ks[p.fatura] = 1; });
    var c = cartao(cid); if (c) ks[faturaDe(c, hoje())] = 1;
    return Object.keys(ks).sort();
  };
  var usoLimite = function (cid) {
    return soma(chavesFatura(cid).map(function (k) { var f = fatura(cid, k); return f.status === 'Paga' || f.status === 'Paga parcialmente' ? 0 : Math.max(0, f.total - f.pago); }));
  };

  var situacao = function (l) {
    if (l.cartaoId) return 'cartao';
    if (l.tipo === 'r') return l.data > hoje() ? 'prevista' : 'recebida';
    return l.sit === 'pendente' ? 'pendente' : 'paga';
  };
  var SIT_LABEL = { cartao: 'No cartão', prevista: 'Prevista', recebida: 'Recebida', pendente: 'Pendente', paga: 'Paga' };

  var saldoMes = function (k) {
    var h = hoje(), rec = 0, recPrev = 0, desp = 0, despPend = 0;
    ativos().forEach(function (l) {
      if (l.cartaoId || ym(l.data) !== k) return;
      if (l.tipo === 'r') { if (l.data <= h) rec += l.valor; else recPrev += l.valor; }
      else if (l.sit === 'pendente') despPend += l.valor; else desp += l.valor;
    });
    var pagF = soma(S.pags.filter(function (p) { return ym(p.data) === k; }), function (p) { return p.valor; });
    var fatPend = 0;
    S.cartoes.forEach(function (c) { if (temFatura(c.id, k)) fatPend += fatura(c.id, k).restante; });
    var realizado = r2(rec - desp - pagF);
    return { realizado: realizado, previsto: r2(realizado + recPrev - despPend - fatPend), aReceber: r2(recPrev), aPagar: r2(despPend + fatPend), receitas: r2(rec), despesas: r2(desp), pagFaturas: pagF };
  };
  var catsMes = function (k) {
    var g = {};
    ativos().forEach(function (l) { if (l.tipo === 'd' && ym(l.data) === k) g[l.cat] = r2((g[l.cat] || 0) + l.valor); });
    var tot = soma(Object.keys(g).map(function (c) { return g[c]; }));
    return { total: tot, itens: Object.keys(g).map(function (c) { return { cat: c, nome: nomeCat(c), valor: g[c], pct: tot ? g[c] / tot * 100 : 0 }; }).sort(function (a, b) { return b.valor - a.valor; }) };
  };

  var formVazio = function (tipo) {
    return { id: null, tipo: tipo || 'd', desc: '', valor: '', data: hoje(), cat: '', forma: '', sit: 'paga', cartaoId: '', parc: 1, rec: false, per: 'mensal', reps: 6, regra: null, manter: {}, obs: '' };
  };
  var regraDe = function (f) { return f.regra || (f.tipo === 'r' ? 'antecipar' : 'postergar'); };
  var ehCredito = function (f) { return f.tipo === 'd' && f.forma === 'Cartão de crédito'; };
  var validar = function (f) {
    var e = {}, d = limparTexto(f.desc, 999), v = parseValor(f.valor);
    if (d.length < LIM.DESC[0] || d.length > LIM.DESC[1]) e.desc = 'Use de 3 a 60 caracteres.';
    if (!(v >= LIM.VALOR_MIN)) e.valor = 'Informe um valor maior que zero, como 120,50.';
    else if (v > LIM.VALOR_MAX) e.valor = 'O valor máximo é R$ 9.999.999,99.';
    if (!dataValida(f.data)) e.data = 'Escolha uma data válida.';
    else if (f.data < LIM.DATA_MIN || f.data > LIM.DATA_MAX) e.data = 'Use uma data entre 2020 e 2100.';
    else if (!f.id && f.data > addMonths(hoje(), 12)) e.data = 'A data pode ser no máximo 12 meses à frente.';
    if (!f.cat) e.cat = 'Escolha uma categoria.';
    if (ehCredito(f) && !f.cartaoId) e.cartao = 'Escolha o cartão ou cadastre um.';
    if (ehCredito(f) && !(f.parc >= 1 && f.parc <= 24 && f.parc % 1 === 0)) e.parc = 'Use de 1 a 24 parcelas.';
    if (f.rec && !(f.reps >= 2 && f.reps <= 60 && f.reps % 1 === 0)) e.reps = 'Use de 2 a 60 repetições.';
    if (String(f.obs || '').length > LIM.OBS) e.obs = 'Use até 200 caracteres.';
    return e;
  };
  var ocorrencias = function (f) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data || '')) return [];
    var n = f.rec ? Math.max(2, Math.min(60, f.reps)) : 1, out = [], cred = ehCredito(f), regra = regraDe(f);
    for (var i = 0; i < n; i++) {
      var o = ocorrencia(f.data, f.per, i), mot = (f.rec && !cred) ? naoUtil(o) : null;
      var mantida = !!(f.manter && f.manter[i]);
      var dt = (mot && !mantida) ? ajustar(o, regra) : o;
      out.push({ i: i, orig: o, data: dt, motivo: mot, feriado: mot ? !!feriado(o) : false, mantida: mantida });
    }
    return out;
  };
  var parcelas = function (v, n) {
    var base = Math.floor(v * 100 / n) / 100, primeira = r2(v - base * (n - 1));
    var out = []; for (var i = 0; i < n; i++) out.push(i === 0 ? primeira : base); return out;
  };
  var gerar = function (f) {
    var v = parseValor(f.valor), ocs = ocorrencias(f), serie = f.rec ? uid() : null, agora = new Date().toISOString(), novos = [];
    var cred = ehCredito(f), c = cred ? cartao(f.cartaoId) : null;
    ocs.forEach(function (o) {
      var base = { tipo: f.tipo, desc: limparTexto(f.desc, LIM.DESC[1]), cat: f.cat, forma: f.forma || '', obs: limparTexto(f.obs, LIM.OBS), serie: serie, criado: agora, alterado: agora, excl: null };
      if (cred) {
        var n = Math.max(1, Math.min(24, f.parc)), vals = parcelas(v, n), grupo = n > 1 ? uid() : null, f0 = faturaDe(c, o.data);
        for (var i = 0; i < n; i++) novos.push(Object.assign({}, base, { id: uid(), valor: vals[i], data: addMonths(o.data, i), cartaoId: c.id, fatura: ymAdd(f0, i), sit: null, parc: grupo ? { i: i + 1, n: n, grupo: grupo, total: v } : null }));
      } else {
        novos.push(Object.assign({}, base, { id: uid(), valor: v, data: o.data, cartaoId: null, fatura: null, sit: f.tipo === 'd' ? f.sit : null, parc: null }));
      }
    });
    return novos;
  };


  var LIM = { VALOR_MIN: 0.01, VALOR_MAX: 9999999.99, DIG_MAX: 9, DESC: [3, 60], OBS: 200, NOME: [3, 80], CAT: [3, 30], APELIDO: [3, 30], META: [3, 60], DATA_MIN: '2020-01-01', DATA_MAX: '2100-12-31', BUSCA: 60 };
  var CTRL = /[\u0000-\u001F\u007F-\u009F\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
  var limparTexto = function (s, max) {
    return String(s == null ? '' : s).replace(CTRL, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 200);
  };
  var filtroTexto = function (s, max) { return String(s == null ? '' : s).replace(CTRL, '').replace(/[<>]/g, '').slice(0, max || 200); };
  var soDigitos = function (s) { return String(s == null ? '' : s).replace(/\D/g, ''); };
  var mascaraMoeda = function (s) {
    var d = soDigitos(s).replace(/^0+/, '').slice(0, LIM.DIG_MAX);
    if (!d) return '';
    while (d.length < 3) d = '0' + d;
    return d.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d.slice(-2);
  };
  var mascaraDia = function (s) { return soDigitos(s).slice(0, 2); };
  var filtroNome = function (s) { return String(s == null ? '' : s).replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '').replace(/\s{2,}/g, ' ').slice(0, LIM.NOME[1]); };
  var filtroEmail = function (s) { return String(s == null ? '' : s).replace(/[^A-Za-z0-9._%+@-]/g, '').slice(0, 120); };
  var nomeValido = function (s) { var t = String(s || '').trim(); return t.length >= LIM.NOME[0] && t.length <= LIM.NOME[1] && /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(t) && /[A-Za-zÀ-ÖØ-öø-ÿ]{2}/.test(t); };
  var emailValido = function (s) { return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(String(s || '')) && String(s).length <= 120; };
  var SENHAS_FRACAS = ['12345678', '123456789', '1234567890', 'password1', 'senha123', 'senha1234', 'abc12345', 'qwerty123', 'admin123', 'brasil123', 'mudar123', 'a1234567', '1q2w3e4r', 'teste123'];
  var senhaProblema = function (s, email) {
    s = String(s || '');
    if (s.length < 8) return 'A senha precisa de 8 caracteres ou mais.';
    if (s.length > 128) return 'Use no máximo 128 caracteres.';
    if (!/[A-Za-zÀ-ÿ]/.test(s) || !/\d/.test(s)) return 'Use pelo menos uma letra e um número.';
    if (SENHAS_FRACAS.indexOf(s.toLowerCase()) >= 0) return 'Essa senha é muito comum. Escolha outra.';
    if (email && s.toLowerCase().indexOf(String(email).split('@')[0].toLowerCase()) >= 0 && String(email).split('@')[0].length >= 4) return 'A senha não pode conter o seu e-mail.';
    return null;
  };
  var dataValida = function (s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    var p = parts(s); return p[1] >= 1 && p[1] <= 12 && p[2] >= 1 && p[2] <= dim(p[0], p[1]);
  };
  var iguais = function (a, b) {
    a = String(a); b = String(b); var r = a.length ^ b.length;
    for (var i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return r === 0;
  };

  var ID = /^[A-Za-z0-9_-]{1,40}$/, YM = /^\d{4}-(0[1-9]|1[0-2])$/;
  var ehObj = function (o) { return o !== null && typeof o === 'object' && !Array.isArray(o); };
  var num = function (v, min, max) { return typeof v === 'number' && isFinite(v) && v >= min && v <= max; };
  var str = function (v, max) { return typeof v === 'string' ? limparTexto(v, max) : ''; };
  var iso = function (v) { return typeof v === 'string' && v.length <= 40 && !isNaN(Date.parse(v)) ? v : null; };
  var sanear = function (bruto) {
    var out = novoDados(), desc = 0;
    if (!ehObj(bruto)) return { dados: out, descartados: 1 };
    var lista = function (a) { return Array.isArray(a) ? a.slice(0, 100000) : []; };
    if (Array.isArray(bruto.cats) && bruto.cats.length) {
      out.cats = [];
      lista(bruto.cats).forEach(function (c) {
        if (!ehObj(c) || !ID.test(c.id) || (c.tipo !== 'r' && c.tipo !== 'd')) { desc++; return; }
        var n = str(c.nome, LIM.CAT[1]); if (n.length < 1) { desc++; return; }
        out.cats.push({ id: c.id, nome: n, tipo: c.tipo, ativa: c.ativa !== false, padrao: c.padrao === true });
      });
      CATS_PADRAO.forEach(function (p) { if (!out.cats.some(function (c) { return c.id === p[0]; })) out.cats.push({ id: p[0], nome: p[1], tipo: p[2], ativa: true, padrao: true }); });
    }
    var catOk = {}; out.cats.forEach(function (c) { catOk[c.id] = c.tipo; });
    lista(bruto.cartoes).forEach(function (c) {
      if (!ehObj(c) || !ID.test(c.id) || !num(c.fech, 1, 31) || !num(c.venc, 1, 31) || c.fech % 1 || c.venc % 1) { desc++; return; }
      out.cartoes.push({ id: c.id, apelido: str(c.apelido, LIM.APELIDO[1]) || 'Cartão', fech: c.fech, venc: c.venc, limite: num(c.limite, 0, LIM.VALOR_MAX) ? r2(c.limite) : 0, ativo: c.ativo !== false });
    });
    var cartOk = {}; out.cartoes.forEach(function (c) { cartOk[c.id] = 1; });
    lista(bruto.lanc).forEach(function (l) {
      if (!ehObj(l) || !ID.test(l.id) || (l.tipo !== 'r' && l.tipo !== 'd') || !dataValida(l.data) || !num(l.valor, LIM.VALOR_MIN, LIM.VALOR_MAX) || catOk[l.cat] !== l.tipo) { desc++; return; }
      var cart = l.cartaoId == null || l.cartaoId === '' ? null : l.cartaoId;
      if (cart !== null && (l.tipo !== 'd' || !cartOk[cart] || !YM.test(l.fatura))) { desc++; return; }
      var parc = null;
      if (ehObj(l.parc)) {
        if (!num(l.parc.i, 1, 24) || !num(l.parc.n, 2, 24) || l.parc.i > l.parc.n || !ID.test(l.parc.grupo) || !num(l.parc.total, LIM.VALOR_MIN, LIM.VALOR_MAX)) { desc++; return; }
        parc = { i: l.parc.i, n: l.parc.n, grupo: l.parc.grupo, total: r2(l.parc.total) };
      }
      var d = str(l.desc, LIM.DESC[1]); if (!d) { desc++; return; }
      out.lanc.push({ id: l.id, tipo: l.tipo, desc: d, cat: l.cat, forma: str(l.forma, 30), obs: str(l.obs, LIM.OBS), serie: ID.test(l.serie) ? l.serie : null, criado: iso(l.criado) || new Date(0).toISOString(), alterado: iso(l.alterado) || iso(l.criado) || new Date(0).toISOString(), excl: iso(l.excl), valor: r2(l.valor), data: l.data, cartaoId: cart, fatura: cart ? l.fatura : null, sit: l.tipo === 'd' && !cart ? (l.sit === 'pendente' ? 'pendente' : 'paga') : null, parc: parc });
    });
    lista(bruto.pags).forEach(function (p) {
      if (!ehObj(p) || !ID.test(p.id) || !cartOk[p.cartaoId] || !YM.test(p.fatura) || !num(p.valor, LIM.VALOR_MIN, LIM.VALOR_MAX) || !dataValida(p.data)) { desc++; return; }
      out.pags.push({ id: p.id, cartaoId: p.cartaoId, fatura: p.fatura, valor: r2(p.valor), data: p.data, forma: str(p.forma, 30) });
    });
    lista(bruto.metas).forEach(function (m) {
      if (!ehObj(m) || !ID.test(m.id) || !num(m.alvo, LIM.VALOR_MIN, LIM.VALOR_MAX) || !dataValida(m.limite)) { desc++; return; }
      var ap = lista(m.aportes).filter(function (a) { var ok = ehObj(a) && ID.test(a.id) && num(a.valor, LIM.VALOR_MIN, LIM.VALOR_MAX) && dataValida(a.data); if (!ok) desc++; return ok; })
        .map(function (a) { return { id: a.id, valor: r2(a.valor), data: a.data }; });
      out.metas.push({ id: m.id, nome: str(m.nome, LIM.META[1]) || 'Meta', alvo: r2(m.alvo), limite: m.limite, cat: catOk[m.cat] ? m.cat : null, aportes: ap, avisos: lista(m.avisos).filter(function (x) { return x === 50 || x === 80 || x === 100; }), cancelada: m.cancelada === true, criada: iso(m.criada) || new Date(0).toISOString() });
    });
    if (ehObj(bruto.perfil)) out.perfil = { nome: str(bruto.perfil.nome, LIM.NOME[1]) };
    return { dados: out, descartados: desc };
  };

  var acumulado = function (m) { return soma(m.aportes, function (a) { return a.valor; }); };
  var progresso = function (m) { return m.alvo > 0 ? acumulado(m) / m.alvo * 100 : 0; };
  var statusMeta = function (m) {
    if (m.cancelada) return 'Cancelada';
    if (acumulado(m) >= m.alvo) return 'Concluída';
    if (hoje() > m.limite) return 'Atrasada';
    return 'Em andamento';
  };
  var marcos = function (antes, depois) { return [50, 80, 100].filter(function (x) { return antes < x && depois >= x; }); };
  var porMesAte = function (m) {
    var falta = r2(m.alvo - acumulado(m)); if (falta <= 0) return 0;
    var a = parts(hoje()), b = parts(m.limite), meses = (b[0] - a[0]) * 12 + (b[1] - a[1]) + 1;
    return r2(falta / Math.max(1, meses));
  };

  var resumoMes = function (k) {
    var rec = 0, desp = 0;
    ativos().forEach(function (l) { if (ym(l.data) !== k) return; if (l.tipo === 'r') rec += l.valor; else desp += l.valor; });
    return { k: k, receitas: r2(rec), despesas: r2(desp), resultado: r2(rec - desp) };
  };
  var serieMeses = function (fim, n) { var out = []; for (var i = n - 1; i >= 0; i--) out.push(ymAdd(fim, -i)); return out; };
  var receitasDespesas = function (fim, n) { return serieMeses(fim, n).map(resumoMes); };
  var evolucaoSaldo = function (fim, n) {
    var ks = serieMeses(fim, n), primeiro = ks[0], base = 0;
    var meses = {};
    ativos().forEach(function (l) { if (!l.cartaoId) meses[ym(l.data)] = 1; });
    S.pags.forEach(function (p) { meses[ym(p.data)] = 1; });
    Object.keys(meses).filter(function (k) { return k < primeiro; }).forEach(function (k) { base += saldoMes(k).realizado; });
    var acc = r2(base);
    return ks.map(function (k) { var s = saldoMes(k); acc = r2(acc + s.realizado); return { k: k, mes: s.realizado, acumulado: acc }; });
  };
  var catsPeriodo = function (ks) {
    var g = {}, set = {}; ks.forEach(function (k) { set[k] = 1; });
    ativos().forEach(function (l) { if (l.tipo === 'd' && set[ym(l.data)]) g[l.cat] = r2((g[l.cat] || 0) + l.valor); });
    var tot = soma(Object.keys(g).map(function (c) { return g[c]; }));
    return { total: tot, itens: Object.keys(g).map(function (c) { return { cat: c, nome: nomeCat(c), valor: g[c], pct: tot ? g[c] / tot * 100 : 0 }; }).sort(function (a, b) { return b.valor - a.valor; }) };
  };

  var csvCelula = function (v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = "'" + s;
    return /[";\r\n]/.test(s) || s !== s.trim() ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  var csv = function (linhas) { return '\ufeff' + linhas.map(function (l) { return l.map(csvCelula).join(';'); }).join('\r\n') + '\r\n'; };
  var numCsv = function (n) { return r2(n).toFixed(2).replace('.', ','); };
  var exportarTudo = function () {
    var L = [['# Lançamentos'], ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Situação', 'Forma', 'Cartão', 'Parcela', 'Fatura', 'Observação']];
    ativos().slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (l) {
      L.push([br(l.data), l.tipo === 'r' ? 'Receita' : 'Despesa', l.desc, nomeCat(l.cat), numCsv(l.valor), SIT_LABEL[situacao(l)], l.forma, l.cartaoId ? (cartao(l.cartaoId) || {}).apelido : '', l.parc ? l.parc.i + '/' + l.parc.n : '', l.fatura || '', l.obs]);
    });
    L.push([], ['# Categorias'], ['Nome', 'Tipo', 'Situação']);
    S.cats.forEach(function (c) { L.push([c.nome, c.tipo === 'r' ? 'Receita' : 'Despesa', c.ativa ? 'Ativa' : 'Inativa']); });
    L.push([], ['# Cartões'], ['Apelido', 'Fechamento', 'Vencimento', 'Limite', 'Situação']);
    S.cartoes.forEach(function (c) { L.push([c.apelido, c.fech, c.venc, c.limite ? numCsv(c.limite) : '', c.ativo ? 'Ativo' : 'Inativo']); });
    L.push([], ['# Faturas'], ['Cartão', 'Vencimento', 'Total', 'Pago', 'Situação']);
    S.cartoes.forEach(function (c) { chavesFatura(c.id).forEach(function (k) { var f = fatura(c.id, k); L.push([c.apelido, br(f.vence), numCsv(f.total), numCsv(f.pago), f.status]); }); });
    L.push([], ['# Metas'], ['Meta', 'Valor alvo', 'Acumulado', 'Data limite', 'Situação']);
    (S.metas || []).forEach(function (m) { L.push([m.nome, numCsv(m.alvo), numCsv(acumulado(m)), br(m.limite), statusMeta(m)]); });
    return csv(L);
  };

  var gerarExemplo = function () {
    var d = novoDados(), ant = S; usar(d);
    var card = { id: 'k1', apelido: 'Cartão pessoal', fech: 25, venc: 5, limite: 3000, ativo: true };
    d.cartoes.push(card);
    var h = hoje(), k = ym(h), kp = ymAdd(k, -1), D = parts(h)[2];
    var at = function (kk, dia) { var p = kk.split('-').map(Number); return isoOf(p[0], p[1], Math.min(dia, dim(p[0], p[1]))); };
    var past = function (dia) { return at(k, Math.min(dia, D)); };
    var fut = function (dia) { var p = k.split('-').map(Number); return isoOf(p[0], p[1], Math.min(Math.max(dia, D + 1), dim(p[0], p[1]))); };
    var add = function (o) { gerar(Object.assign(formVazio(o.tipo), o)).forEach(function (l) { d.lanc.push(l); }); };
    for (var mi = 5; mi >= 2; mi--) {
      var kk = ymAdd(k, -mi);
      add({ tipo: 'r', desc: 'Salário', valor: '5200,00', data: at(kk, 5), cat: 'c-sal', forma: 'PIX' });
      add({ tipo: 'd', desc: 'Aluguel', valor: '1450,00', data: at(kk, 5), cat: 'c-mor', forma: 'Boleto', sit: 'paga' });
      add({ tipo: 'd', desc: 'Conta de luz', valor: String((158 + mi * 7.35).toFixed(2)).replace('.', ','), data: at(kk, 10), cat: 'c-mor', forma: 'PIX', sit: 'paga' });
      add({ tipo: 'd', desc: 'Mercado', valor: String((540 + mi * 41.2).toFixed(2)).replace('.', ','), data: at(kk, 12), cat: 'c-ali', forma: 'Cartão de débito', sit: 'paga' });
      add({ tipo: 'd', desc: mi % 2 ? 'Cinema e jantar' : 'Show', valor: String((95 + mi * 18.5).toFixed(2)).replace('.', ','), data: at(kk, 18), cat: 'c-laz', forma: 'PIX', sit: 'paga' });
      add({ tipo: 'd', desc: 'Transporte por aplicativo', valor: String((120 + mi * 9.9).toFixed(2)).replace('.', ','), data: at(kk, 22), cat: 'c-tra', forma: 'PIX', sit: 'paga' });
      if (mi === 4) add({ tipo: 'r', desc: 'Freela de fotografia', valor: '1200,00', data: at(kk, 20), cat: 'c-outr', forma: 'PIX' });
    }
    add({ tipo: 'r', desc: 'Salário', valor: '5200,00', data: at(kp, 5), cat: 'c-sal', forma: 'PIX' });
    add({ tipo: 'd', desc: 'Aluguel', valor: '1450,00', data: at(kp, 5), cat: 'c-mor', forma: 'Boleto', sit: 'paga' });
    add({ tipo: 'd', desc: 'Supermercado', valor: '486,30', data: at(kp, 8), cat: 'c-ali', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Combustível', valor: '210,00', data: at(kp, 15), cat: 'c-tra', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Presente de aniversário', valor: '276,40', data: at(kp, 20), cat: 'c-outd', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Streaming', valor: '39,90', data: at(kp, 1), cat: 'c-laz', forma: 'Cartão de crédito', cartaoId: 'k1', rec: true, per: 'mensal', reps: 12 });
    add({ tipo: 'r', desc: 'Salário', valor: '5200,00', data: past(5), cat: 'c-sal', forma: 'PIX' });
    add({ tipo: 'r', desc: 'Freela de design', valor: '850,00', data: past(8), cat: 'c-outr', forma: 'PIX' });
    add({ tipo: 'r', desc: 'Reembolso plano de saúde', valor: '300,00', data: fut(28), cat: 'c-outr', forma: 'Transferência' });
    add({ tipo: 'd', desc: 'Aluguel', valor: '1450,00', data: past(5), cat: 'c-mor', forma: 'Boleto', sit: 'paga' });
    add({ tipo: 'd', desc: 'Farmácia', valor: '145,00', data: past(9), cat: 'c-sau', forma: 'Cartão de débito', sit: 'paga' });
    add({ tipo: 'd', desc: 'Conta de luz', valor: '186,35', data: past(10), cat: 'c-mor', forma: 'PIX', sit: 'paga' });
    add({ tipo: 'd', desc: 'Condomínio', valor: '480,00', data: fut(25), cat: 'c-mor', forma: 'Boleto', sit: 'pendente' });
    add({ tipo: 'd', desc: 'Internet', valor: '119,90', data: fut(20), cat: 'c-mor', forma: 'Boleto', sit: 'pendente', rec: true, per: 'mensal', reps: 12 });
    add({ tipo: 'd', desc: 'Tênis de corrida', valor: '899,10', data: past(2), cat: 'c-outd', forma: 'Cartão de crédito', cartaoId: 'k1', parc: 3 });
    add({ tipo: 'd', desc: 'Mercado', valor: '412,90', data: past(3), cat: 'c-ali', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Combustível', valor: '220,00', data: past(7), cat: 'c-tra', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Restaurante', valor: '96,50', data: past(11), cat: 'c-ali', forma: 'Cartão de crédito', cartaoId: 'k1' });
    add({ tipo: 'd', desc: 'Cinema', valor: '64,00', data: past(12), cat: 'c-laz', forma: 'Cartão de crédito', cartaoId: 'k1' });
    var kf = faturaDe(card, at(kp, 8)); limpar();
    var fa = fatura('k1', kf);
    if (fa.total > 0 && h > fa.fecha) d.pags.push({ id: uid(), cartaoId: 'k1', fatura: kf, valor: fa.total, data: past(Math.min(6, parts(fa.vence)[2] + 1)), forma: 'PIX' });
    var mm = function (nome, alvo, mesesAte, aps) { d.metas.push({ id: uid(), nome: nome, alvo: alvo, limite: addMonths(h, mesesAte), cat: null, aportes: aps.map(function (a) { return { id: uid(), valor: a[0], data: a[1] }; }), avisos: [], cancelada: false, criada: addMonths(h, -3) + 'T12:00:00.000Z' }); };
    mm('Reserva de emergência', 15000, 14, [[2500, at(ymAdd(k, -3), 6)], [2000, at(ymAdd(k, -2), 6)], [2000, at(kp, 6)], [1500, past(6)]]);
    mm('Viagem de férias', 6000, 8, [[800, at(kp, 10)], [700, past(10)]]);
    d.metas.forEach(function (m) { var p = progresso(m); m.avisos = [50, 80, 100].filter(function (x) { return p >= x; }); });
    limpar(); S = ant; return d;
  };

  return {
    pad: pad, isoOf: isoOf, parts: parts, dim: dim, addDays: addDays, addMonths: addMonths, hoje: hoje, setHoje: function (s) { _hoje = s; memo = {}; },
    ym: ym, ymAdd: ymAdd, br: br, brCurto: brCurto, mesNome: mesNome, mesCurto: mesCurto, DIAS: DIAS,
    r2: r2, soma: soma, fmt: fmt, parseValor: parseValor, feriado: feriado, naoUtil: naoUtil, ajustar: ajustar, pascoa: pascoa,
    novoDados: novoDados, uid: uid, usar: usar, limpar: limpar, dados: function () { return S; }, ativos: ativos, cartao: cartao, categoria: categoria, nomeCat: nomeCat,
    faturaDe: faturaDe, datasFatura: datasFatura, temFatura: temFatura, fatura: fatura, chavesFatura: chavesFatura, usoLimite: usoLimite,
    situacao: situacao, SIT_LABEL: SIT_LABEL, saldoMes: saldoMes, catsMes: catsMes,
    LIM: LIM, limparTexto: limparTexto, filtroTexto: filtroTexto, soDigitos: soDigitos, mascaraMoeda: mascaraMoeda, mascaraDia: mascaraDia, filtroNome: filtroNome, filtroEmail: filtroEmail,
    nomeValido: nomeValido, emailValido: emailValido, senhaProblema: senhaProblema, dataValida: dataValida, iguais: iguais, sanear: sanear,
    acumulado: acumulado, progresso: progresso, statusMeta: statusMeta, marcos: marcos, porMesAte: porMesAte,
    resumoMes: resumoMes, serieMeses: serieMeses, receitasDespesas: receitasDespesas, evolucaoSaldo: evolucaoSaldo, catsPeriodo: catsPeriodo,
    csvCelula: csvCelula, csv: csv, numCsv: numCsv, exportarTudo: exportarTudo,
    formVazio: formVazio, regraDe: regraDe, ehCredito: ehCredito, validar: validar, ocorrencias: ocorrencias, parcelas: parcelas, gerar: gerar, gerarExemplo: gerarExemplo,
  };
})();
if (typeof module !== 'undefined') module.exports = FS;
